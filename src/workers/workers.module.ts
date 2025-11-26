import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { WorkerPoolService } from './worker-pool.service';
import { AutoScaleWorkerService } from './auto-scale-worker.service';

@Module({
  controllers: [WorkersController],
  providers: [WorkersService, WorkerPoolService, AutoScaleWorkerService],
})
export class WorkersModule {}
