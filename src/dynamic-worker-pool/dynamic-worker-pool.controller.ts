import { Controller, Get } from '@nestjs/common';
import { WorkerRouterService } from './worker-router.service';

@Controller('dynamic')
export class DynamicWorkerPoolController {
  constructor(private readonly workerRouterService: WorkerRouterService) {}

  @Get('run')
  run() {
    for (let i = 0; i < 20; i++) {
      const random = Math.floor(Math.random() * 100);
      let type = 'pdf';
      if (random % 2 === 0) type = 'math';

      const id = `Task-${type}-${i}`;
      const data = type === 'math' ? 10000000000 : i;
      this.workerRouterService.run<any, any>(type, data, { id }).then((result) => {
        console.log(`Task result for input ${id}:`, result);
      });

      // this.workerRouterService.run(type, i, { id });
    }
  }
}
