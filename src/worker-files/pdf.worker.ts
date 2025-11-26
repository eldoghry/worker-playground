import { parentPort } from 'worker_threads';

async function fakePdfGenerate(payload: any) {
  // simulate CPU or I/O work
  const start = Date.now();
  while (Date.now() - start < 10000) {
    /* busy wait 200ms to simulate work */
  }
  return { ok: true, data: payload };
}

parentPort?.on('message', async (payload) => {
  const { data } = payload;
  try {
    const result = await fakePdfGenerate(data);
    console.log(`Generate pdf of id ${data}`);
    parentPort?.postMessage({ data, result });
  } catch (error) {
    parentPort?.postMessage({ data, error: (error as Error).message });
  }
});
