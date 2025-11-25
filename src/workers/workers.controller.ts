import { Controller, Get, Query } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkerPoolService } from './worker-pool.service';

@Controller('workers')
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
    private readonly workerPoolService: WorkerPoolService,
  ) {}

  @Get('calc')
  runHeavyCalculation(@Query('n') n: number) {
    // return this.workersService.runHeavyCalculation(Number(n));
    return this.workerPoolService.runTask(Number(n));
  }
}
