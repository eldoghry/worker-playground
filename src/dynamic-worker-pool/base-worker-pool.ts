import { randomUUID } from 'crypto';
import { Task, WorkerPoolConfig, ScalableWorker } from './interfaces';
import * as os from 'os';
import path from 'path';

export class BaseWorkerPool {
  private workers: ScalableWorker[] = [];
  private idleWorkers: ScalableWorker[] = [];
  private busyWorkers = new Set<ScalableWorker>();
  private taskQueue: Task[] = [];
  private workerLastUsed = new Map<ScalableWorker, number>();

  private readonly type: string;
  private readonly workerScriptPath: string;
  private readonly minWorkers: number;
  private readonly maxWorkers: number;
  private readonly scaleUpThreshold: number;
  private readonly idleTimeoutMs: number;
  private scaleTimer: NodeJS.Timeout;

  constructor(cfg: WorkerPoolConfig) {
    this.type = cfg.type;
    this.workerScriptPath = cfg.workerScriptPath;
    this.minWorkers = cfg.minWorkers ?? Math.max(1, os.cpus().length / 2);
    this.maxWorkers = cfg.maxWorkers ?? Math.max(this.minWorkers, os.cpus().length - 1);
    this.scaleUpThreshold = cfg.scaleUpThreshold ?? 2;
    this.idleTimeoutMs = cfg.idleTimeoutMs ?? 15_000;

    // Initialize the worker pool
    this.init();
  }

  private init() {
    for (let i = 0; i < this.minWorkers; i++) this.spawnWorker();
    this.scaleTimer = setInterval(() => this.autoScaleAndCleanup(), 5000);
  }

  public destroy() {
    clearInterval(this.scaleTimer);

    for (const worker of this.workers) {
      try {
        worker.terminate();
      } catch (e) {}
    }

    this.workers = [];
    this.idleWorkers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
    this.workerLastUsed.clear();
  }

  private spawnWorker(): ScalableWorker {
    const workerScript = this.resolveWorkerScriptPath();
    const worker = new ScalableWorker(workerScript);

    // add event listeners
    worker.on('message', (data: any) => this.onWorkerMessage(worker, data));
    worker.on('error', (error) => this.onWorkerError(worker, error));
    worker.on('exit', (code) => this.onWorkerExit(worker, code));

    this.workers.push(worker);
    this.idleWorkers.push(worker);
    this.workerLastUsed.set(worker, Date.now());

    return worker;
  }

  private replaceWorker(oldWorker: ScalableWorker) {
    this.removeWorker(oldWorker);
    if (this.workers.length < this.minWorkers) this.spawnWorker();
  }

  private removeWorker(worker: ScalableWorker) {
    try {
      worker.terminate();
    } catch (error) {}

    this.workers = this.workers.filter((w) => w !== worker);
    this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
    this.busyWorkers.delete(worker);
    this.workerLastUsed.delete(worker);
  }

  private autoScaleAndCleanup() {
    // Scale up
    const queueSize = this.taskQueue.length;

    if (queueSize > this.scaleUpThreshold && this.workers.length < this.maxWorkers) {
      const averageTasks = Math.max(1, Math.floor(queueSize / this.scaleUpThreshold));
      const spawnCount = Math.min(this.maxWorkers - this.workers.length, averageTasks);
      for (let i = 0; i < spawnCount; i++) this.spawnWorker();
    }

    // scale down idle workers beyond minWorkers after idleTimeout
    if (this.workers.length > this.maxWorkers) {
      const now = Date.now();
      for (const worker of this.idleWorkers) {
        const lastUsed = this.workerLastUsed.get(worker) ?? 0;
        if (now - lastUsed > this.idleTimeoutMs && this.workers.length > this.minWorkers) {
          this.removeWorker(worker);
        }
      }
    }

    this.getStatus();
  }

  private assignTasks() {
    if (this.taskQueue.length > 0) {
      // Sort queue by priority (lower number -> higher priority) and FIFO within same priority
      this.taskQueue.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.createdAt - b.createdAt);
    }

    while (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.idleWorkers.shift()!;

      worker.__task = task;
      this.busyWorkers.add(worker);
      this.workerLastUsed.set(worker, Date.now());

      try {
        worker.postMessage(task.data);
      } catch (error) {
        task.reject(error);
        this.replaceWorker(worker);
      }
    }
  }

  private resolveWorkerScriptPath(): string {
    const isAbsolutePath = path.isAbsolute(this.workerScriptPath);
    if (isAbsolutePath) return this.workerScriptPath;

    return path.resolve(__dirname, '..', this.workerScriptPath);
  }

  public getStatus() {
    console.log(
      `[${this.type}] Worker[Total|Idle|Busy]:[${this.workers.length}|${this.idleWorkers.length}|${this.busyWorkers.size}], Queued: ${this.taskQueue.length}`,
    );
    // console.log(this.resolveWorkerScriptPath());
    console.log('-'.repeat(60));

    return {
      type: this.type,
      totalWorkers: this.workers.length,
      idleWorkers: this.idleWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
      minWorkers: this.minWorkers,
      maxWorkers: this.maxWorkers,
      idleTimeoutMs: this.idleTimeoutMs,
      scaleUpThreshold: this.scaleUpThreshold,
      workerScriptPath: this.resolveWorkerScriptPath(),
    };
  }

  public runTask<T, R>(data: T, opts?: { id?: string; priority?: number }) {
    return new Promise<R>((resolve, reject) => {
      const task: Task = {
        id: opts?.id ?? randomUUID(),
        data,
        priority: opts?.priority,
        resolve,
        reject,
        createdAt: Date.now(),
      };
      this.taskQueue.push(task);
      this.assignTasks();
    });
  }

  // listeners
  private onWorkerMessage(worker: ScalableWorker, data: any) {
    try {
      if (!worker.__task) return;
      worker.__task.resolve(data);

      // cleanup
      worker.__task = null;
      this.busyWorkers.delete(worker);
      this.idleWorkers.push(worker);
      this.workerLastUsed.set(worker, Date.now());

      // assign next tasks
      this.assignTasks();
    } catch (error) {}
  }

  private onWorkerError(worker: ScalableWorker, error: any) {
    if (worker.__task) worker.__task.reject(error);
    this.replaceWorker(worker);
  }

  private onWorkerExit(worker: ScalableWorker, code: number) {
    if (worker.__task) worker.__task.reject(new Error(`Worker exited with code ${code}`));
    this.replaceWorker(worker);
  }
}
