import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { WorkerPoolService } from './worker-pool.service';

@Module({
  controllers: [WorkersController],
  providers: [WorkersService, WorkerPoolService],
})
export class WorkersModule {}
