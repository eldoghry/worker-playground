import { parentPort } from 'worker_threads';

export function heavyCalculation(n: number): number {
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += i;
  }
  return result;
}

parentPort?.on('message', (n: number) => {
  const result = heavyCalculation(n);
  parentPort?.postMessage(result);
});
