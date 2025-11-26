import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { BaseWorkerPool } from './base-worker-pool';
import { WorkerPoolConfig } from './interfaces';

@Injectable()
export class DynamicPoolManager implements OnModuleDestroy {
  private pools = new Map<string, BaseWorkerPool>();
  private configs = new Map<string, WorkerPoolConfig>();

  onModuleDestroy() {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
    this.configs.clear();
  }

  registerConfig(config: WorkerPoolConfig) {
    this.configs.set(config.type, config);
  }

  getOrCreatePool(type: string): BaseWorkerPool {
    const existing = this.pools.get(type);
    if (existing) return existing;

    const cfg = this.configs.get(type);
    if (!cfg) throw new Error(`No WorkerPoolConfig registered for type: ${type}`);

    const pool = new BaseWorkerPool(cfg);
    this.pools.set(type, pool);
    return pool;
  }

  listStatuses() {
    const statuses: any[] = [];
    for (const pool of this.pools.values()) {
      statuses.push(pool.getStatus());
    }
    return statuses;
  }
}
