import { Worker } from 'worker_threads';

export interface Task<T = any, R = any> {
  id: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: any) => void;
  priority?: number; // lower number = higher priority
  createdAt: number;
  //   timeoutMs?: number;
}

export interface WorkerPoolConfig {
  type: string;
  workerScriptPath: string; // absolute or relative (will be resolved)
  minWorkers?: number;
  maxWorkers?: number;
  scaleUpThreshold?: number; // queue length to trigger spawn
  idleTimeoutMs?: number; // when to kill idle worker
  //   taskTimeoutMs?: number; // default per-task timeout
}

export class ScalableWorker extends Worker {
  __task: Task | null = null;
}
