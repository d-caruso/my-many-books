#!/usr/bin/env node
import { performance } from 'perf_hooks';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { HookAction, HookConfig } from '@my-many-books/hookey';

const hookeyModulePromise = import('@my-many-books/hookey');

const MB = 1024 * 1024;

interface MemoryBenchmarkConfig {
  hooks: number;
  iterations: number;
  payloadSize: number;
  thresholdMb: number;
  sampleInterval: number;
}

interface MemoryBenchmarkMetrics {
  startHeap: number;
  endHeap: number;
  peakHeap: number;
  heapDeltaMb: number;
  durationMs: number;
  throughput: number;
  samples: number[];
}

const parseNumberFlag = (flag: string, fallback: number, args: string[]): number => {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    const parsed = Number.parseInt(args[index + 1], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const buildConfig = (args: string[]): MemoryBenchmarkConfig => ({
  hooks: parseNumberFlag('--hooks', 100, args),
  iterations: parseNumberFlag('--events', 1000, args),
  payloadSize: parseNumberFlag('--payload-size', 2048, args),
  thresholdMb: parseNumberFlag('--threshold-mb', 5, args),
  sampleInterval: parseNumberFlag('--sample-interval', 200, args),
});

const createAction = (): HookAction => ({
  async execute({ payload }) {
    // No-op action that copies incoming payload to avoid garbage accumulation
    if (payload && typeof payload === 'object') {
      JSON.stringify(payload);
    }
  },
});

const createHookConfig = (index: number): HookConfig => ({
  id: `memory-hook-${index + 1}`,
  name: `Memory Stress Hook ${index + 1}`,
  eventPattern: `memory.event.${index + 1}`,
  actionType: 'noop',
  isActive: true,
  priority: 1,
});

const collectHeapSample = (samples: number[]): void => {
  const heap = process.memoryUsage().heapUsed;
  samples.push(heap);
};

const ensureReportsDir = async (reportDir: string): Promise<void> => {
  await mkdir(reportDir, { recursive: true });
};

const writeReport = async (
  reportDir: string,
  payload: Record<string, unknown>
): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(reportDir, `hookey-memory-${timestamp}.json`);
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return filePath;
};

const createPayload = (size: number): Record<string, unknown> => ({
  blob: 'x'.repeat(size),
  context: { env: 'benchmark', nodeVersion: process.version },
});

const runBenchmark = async (config: MemoryBenchmarkConfig): Promise<MemoryBenchmarkMetrics> => {
  const { HookSystem, InMemoryHookStorage } = await hookeyModulePromise;
  const storage = new InMemoryHookStorage();
  const system = new HookSystem(storage);
  const action = createAction();

  for (let i = 0; i < config.hooks; i += 1) {
    const hook = createHookConfig(i);
    await system.registerExistingHook(hook, action);
  }

  const payload = createPayload(config.payloadSize);
  const startHeap = process.memoryUsage().heapUsed;
  const samples: number[] = [startHeap];
  const startTime = performance.now();

  for (let i = 0; i < config.iterations; i += 1) {
    const target = (i % config.hooks) + 1;
    await system.trigger(`memory.event.${target}`, {
      iteration: i,
      payload,
    });
    if (i % config.sampleInterval === 0 && i > 0) {
      collectHeapSample(samples);
    }
  }

  const endTime = performance.now();
  const endHeap = process.memoryUsage().heapUsed;
  samples.push(endHeap);

  const peakHeap = Math.max(...samples);
  const heapDeltaMb = (peakHeap - startHeap) / MB;
  const durationMs = endTime - startTime;
  const throughput = Math.round((config.iterations / durationMs) * 1000);

  return {
    startHeap,
    endHeap,
    peakHeap,
    heapDeltaMb,
    durationMs,
    throughput,
    samples: samples.map(sample => Math.round(sample / 1024)),
  };
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const config = buildConfig(args);
  const reportDir = path.resolve(process.cwd(), 'reports');
  await ensureReportsDir(reportDir);

  console.log('Running Hookey memory benchmark with config:', config);
  const metrics = await runBenchmark(config);
  const pass = metrics.heapDeltaMb <= config.thresholdMb;

  const result = {
    config,
    metrics,
    passed: pass,
    generatedAt: new Date().toISOString(),
  };

  const reportPath = await writeReport(reportDir, result);
  console.log('Memory benchmark report written to', reportPath);
  console.log(`Heap delta: ${metrics.heapDeltaMb.toFixed(2)} MB (threshold ${config.thresholdMb} MB)`);
  console.log(`Throughput: ${metrics.throughput} events/sec`);

  if (!pass) {
    console.warn('Memory usage exceeded threshold; inspect the generated report for details.');
    process.exitCode = 1;
  }
};

main().catch(error => {
  console.error('Memory benchmark failed:', error);
  process.exitCode = 1;
});
