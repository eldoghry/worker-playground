import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { Worker } from 'worker_threads';

interface Task {
  data: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

@Injectable()
export class WorkerPoolService {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private poolSize = 4;
  private taskQueue: Task[] = [];

  constructor() {
    this.createPool();
  }

  runTask(n: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const task: Task = { data: n, resolve, reject };
      this.taskQueue.push(task);
      this.assignTasks();
    });
  }

  private assignTasks() {
    while (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const worker = this.idleWorkers.shift() as Worker;
      const task = this.taskQueue.shift() as Task;

      (worker as any).currentTask = task;
      worker.postMessage(task.data);
    }
  }

  private createPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = this.createNewWorker();

      // add listeners
      worker.on('message', (result) => {
        const task = (worker as any).currentTask;
        task.resolve(result);

        (worker as any).currentTask = null;
        this.idleWorkers.push(worker);
        this.assignTasks();
      });

      worker.on('error', (error) => {
        const task = (worker as any).currentTask;
        task.reject(error);

        this.replaceWorker(worker);
      });
    }
  }

  private createNewWorker(index: number | undefined = undefined) {
    const workerPath = join(__dirname, '..', 'worker-files', 'math.worker');
    const worker = new Worker(workerPath);
    if (index === undefined) this.workers.push(worker);
    else this.workers[index] = worker;
    this.idleWorkers.push(worker);

    return worker;
  }

  private replaceWorker(oldWorker: Worker) {
    const index = this.workers.indexOf(oldWorker);
    if (index === -1) return;

    this.createNewWorker(index);
  }
}
