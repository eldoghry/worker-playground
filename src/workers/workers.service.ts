import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { heavyCalculation } from 'src/worker-files/math.worker';
import { Worker } from 'worker_threads';

@Injectable()
export class WorkersService {
  runHeavyCalculation(n: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        join(__dirname, '..', 'worker-files', 'math.worker'),
      );

      worker.on('message', (data) => {
        console.log(`Received data from worker(${worker.threadId}):`, data);
        resolve(data);
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      worker.postMessage(n);
    });
  }

  runHeavyCalculation2(n: number): number {
    return heavyCalculation(n);
  }
}
