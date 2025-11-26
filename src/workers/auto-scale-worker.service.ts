import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { cpus } from 'os';

interface Task {
  data: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class ScalableWorker extends Worker {
  currentTask: Task | null = null;
  idleSince: number | null = null;
}

@Injectable()
export class AutoScaleWorkerService implements OnModuleInit, OnModuleDestroy {
  private workers: ScalableWorker[] = [];
  private idleWorkers: ScalableWorker[] = [];
  private busyWorkers: ScalableWorker[] = [];
  private taskQueue: Task[] = [];
  private MIN_WORKERS = 2;
  private MAX_WORKERS = cpus().length;
  private SCALE_UP_THRESHOLD = 2; // if idle workers < 2, scale up
  private IDLE_TIMEOUT = 15000; // 15 seconds
  private scaleTimer: NodeJS.Timeout;

  onModuleInit() {
    this.initiateWorkersPool();
    this.scaleTimer = setInterval(() => {
      this.autoScale();
      this.info();
    }, 2000);
  }

  onModuleDestroy() {
    clearInterval(this.scaleTimer);
    this.workers.forEach((worker) => worker.terminate());
  }

  private spawnWorker(): ScalableWorker {
    const worker = new ScalableWorker(
      join(__dirname, '..', 'worker-files', 'math.worker'),
    );

    worker.idleSince = Date.now();
    this.workers.push(worker);
    this.idleWorkers.push(worker);

    console.log(
      `Spawning worker ${this.workers.length + 1}, threadId: ${worker.threadId}`,
    );

    // add listeners
    worker.on('message', (result: any) => {
      const task = worker.currentTask as Task;
      console.log(
        `Worker ${worker.threadId} completed task with result:`,
        result,
      );
      task.resolve(result);
      worker.currentTask = null;
      worker.idleSince = Date.now();
      this.busyWorkers = this.busyWorkers.filter((w) => w !== worker);
      this.idleWorkers.push(worker);
      this.assignTasks();
    });

    worker.on('error', (error) => {
      if (worker.currentTask) {
        const task = worker.currentTask as Task;
        task.reject(error);
      }

      this.removeWorker(worker);
      this.spawnWorker();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker ${worker.threadId} exited unexpectedly`);
        this.removeWorker(worker);
        this.spawnWorker();
      }
    });

    return worker;
  }

  private removeWorker(worker: ScalableWorker) {
    console.log(`Removing worker ${worker.threadId}`);
    worker.terminate();
    this.workers = this.workers.filter((w) => w !== worker);
    this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
    this.busyWorkers = this.busyWorkers.filter((w) => w !== worker);
  }

  private assignTasks() {
    while (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const task = this.taskQueue.shift() as Task;
      const worker = this.idleWorkers.shift() as ScalableWorker;

      worker.currentTask = task;
      worker.idleSince = null;

      this.busyWorkers.push(worker);

      worker.postMessage(task.data);
    }
  }

  private autoScale() {
    const queueLength = this.taskQueue.length;

    // 1️⃣ SCALE UP LOGIC
    if (
      queueLength > this.SCALE_UP_THRESHOLD &&
      this.workers.length < this.MAX_WORKERS
    ) {
      console.log(
        `Scaling up: Spawning new worker. Total workers: ${this.workers.length + 1}`,
      );
      this.spawnWorker();
      return;
    }

    // 2️⃣ SCALE DOWN LOGIC (idle too long)
    if (this.workers.length > this.MIN_WORKERS) {
      let remainWorkerCount = this.workers.length;
      let removedCount = 0;

      for (const worker of this.idleWorkers) {
        if (
          worker.idleSince &&
          Date.now() - worker.idleSince > this.IDLE_TIMEOUT &&
          remainWorkerCount > this.MIN_WORKERS
        ) {
          this.removeWorker(worker);
          remainWorkerCount--;
          removedCount++;
        }
      }

      if (removedCount > 0) {
        console.log(`Removed ${removedCount} idle workers.`);
      }
    }
  }

  private initiateWorkersPool() {
    for (let index = 0; index < this.MIN_WORKERS; index++) {
      this.spawnWorker();
    }
  }

  private info() {
    console.log(
      `Workers[total|idle|busy]: [${this.workers.length}|${this.idleWorkers.length}|${this.busyWorkers.length}], taskCount: ${this.taskQueue.length}`,
    );
    console.log('-'.repeat(80));
  }

  runTask(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: Task = { data, resolve, reject };
      this.taskQueue.push(task);
      this.assignTasks();
    });
  }
}
