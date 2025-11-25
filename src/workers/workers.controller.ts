import { Controller, Get, Query } from '@nestjs/common';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('calc')
  runHeavyCalculation(@Query('n') n: number) {
    return this.workersService.runHeavyCalculation(Number(n));
  }
}
