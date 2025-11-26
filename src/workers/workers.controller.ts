import { Controller, Get, Query } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkerPoolService } from './worker-pool.service';
import { AutoScaleWorkerService } from './auto-scale-worker.service';

@Controller('workers')
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly workerPoolService: WorkerPoolService,
    private readonly autoScaleWorkerService: AutoScaleWorkerService,
  ) {}

  @Get('calc')
  runHeavyCalculation(@Query('n') n: number, @Query('m') m: number = 1) {
    // return this.workersService.runHeavyCalculation(Number(n));
    // return this.workerPoolService.runTask(Number(n));
    if (m > 1) {
      for (let i = 0; i < m; i++) {
        this.autoScaleWorkerService.runTask(Number(n));
      }
      return 'running multiple tasks';
    } else return this.autoScaleWorkerService.runTask(Number(n));
  }
}
