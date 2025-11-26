import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkersModule } from './workers/workers.module';
import { DynamicWorkerPoolModule } from './dynamic-worker-pool/dynamic-worker-pool.module';

@Module({
  imports: [
    // WorkersModule,
    DynamicWorkerPoolModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
