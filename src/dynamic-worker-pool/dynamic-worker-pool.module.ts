import { Module, OnModuleInit } from '@nestjs/common';
import { WorkerRouterService } from './worker-router.service';
import { DynamicPoolManager } from './dynamic-pool-manager';
import { registerDefaultPools } from './setup';
import { DynamicWorkerPoolController } from './dynamic-worker-pool.controller';

@Module({
  controllers: [DynamicWorkerPoolController],
  providers: [WorkerRouterService, DynamicPoolManager],
  exports: [WorkerRouterService, DynamicPoolManager],
})
export class DynamicWorkerPoolModule implements OnModuleInit {
  constructor(private poolManager: DynamicPoolManager) {}

  onModuleInit() {
    // register pools at bootstrap
    registerDefaultPools(this.poolManager);
  }
}
