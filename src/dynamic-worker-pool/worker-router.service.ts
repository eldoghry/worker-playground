import { Injectable } from '@nestjs/common';
import { DynamicPoolManager } from './dynamic-pool-manager';
import { Task } from './interfaces';
import { randomUUID } from 'crypto';

@Injectable()
export class WorkerRouterService {
  constructor(private manager: DynamicPoolManager) {}

  run<T = any, R = any>(type: string, taskData: T, opts?: { priority?: number; id?: string }): Promise<R> {
    const pool = this.manager.getOrCreatePool(type);
    return pool.runTask<T, R>(taskData, opts);
  }

  status() {
    return this.manager.listStatuses();
  }
}
