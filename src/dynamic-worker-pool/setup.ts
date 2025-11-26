import { DynamicPoolManager } from './dynamic-pool-manager';

export function registerDefaultPools(manager: DynamicPoolManager) {
  const mathScript = 'worker-files/math.worker.js';
  const pdfScript = 'worker-files/pdf.worker.js';

  manager.registerConfig({
    type: 'math',
    workerScriptPath: mathScript,
    minWorkers: 1,
    maxWorkers: 3,
    scaleUpThreshold: 3,
    idleTimeoutMs: 10_000,
  });

  manager.registerConfig({
    type: 'pdf',
    workerScriptPath: pdfScript,
    minWorkers: 1,
    maxWorkers: 4,
    scaleUpThreshold: 3,
    idleTimeoutMs: 15_000,
  });
}
