#!/usr/bin/env tsx
import { performance } from 'perf_hooks';
import { writeFileSync, mkdirSync } from 'fs';
import { buildReferenceIndex } from '../src/tools/build-reference-index';
import { validateOrphans } from '../src/tools/orphans';
import { validateMigration } from '../src/tools/validate';
import { validateNaming } from '../src/tools/naming';

interface BenchmarkResult {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<any>
): Promise<BenchmarkResult> {
  console.log(`⏱️  Running: ${name}...`);
  const start = performance.now();

  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`   ✅ ${duration.toFixed(2)}ms`);

    return {
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata: result?.metadata || {},
    };
  } catch (error) {
    const end = performance.now();
    const duration = end - start;

    console.log(`   ❌ Failed (${duration.toFixed(2)}ms)`);

    return {
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

async function main() {
  console.log('🚀 Running TIER 2 Performance Benchmarks\n');

  const projectPath = process.cwd();
  const results: BenchmarkResult[] = [];

  // Benchmark 1: Reference index build
  results.push(
    await runBenchmark('graph-build', async () => {
      const result = await buildReferenceIndex({
        projectPath,
        outputPath: '.edgedoc/references.json',
        verbose: false
      });
      return {
        metadata: {
          features: Object.keys(result.index.features).length,
          codeFiles: Object.keys(result.index.code).length,
          terms: Object.keys(result.index.terms).length,
        }
      };
    })
  );

  // Benchmark 2: Orphan file detection
  results.push(
    await runBenchmark('orphan-detection', async () => {
      const result = await validateOrphans({
        projectPath
      });
      return {
        metadata: {
          totalFiles: result.totalFiles || 0,
          orphans: result.orphans?.length || 0,
        }
      };
    })
  );

  // Benchmark 3: Migration validation
  results.push(
    await runBenchmark('migration-validation', async () => {
      const result = await validateMigration({
        projectPath,
        generateMarkdown: false,
      });
      return {
        metadata: {
          files: result.results?.length || 0,
          errors: result.results?.filter(r => r.errors.length > 0).length || 0,
        }
      };
    })
  );

  // Benchmark 4: Naming validation
  results.push(
    await runBenchmark('naming-validation', async () => {
      const result = await validateNaming({
        projectPath
      });
      return {
        metadata: {
          files: result.totalFiles || 0,
          errors: result.errors?.length || 0,
        }
      };
    })
  );

  // 결과 출력
  console.log('\n📊 Benchmark Results:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const result of results) {
    const durationMs = result.duration.toFixed(2);
    const durationSec = (result.duration / 1000).toFixed(2);
    console.log(`  ${result.name.padEnd(25)} ${durationMs.padStart(8)}ms (${durationSec}s)`);

    if (result.metadata && Object.keys(result.metadata).length > 0) {
      for (const [key, value] of Object.entries(result.metadata)) {
        console.log(`    ${key}: ${value}`);
      }
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n  Total: ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);

  // JSON 저장
  mkdirSync('.edgedoc', { recursive: true });
  const outputPath = '.edgedoc/benchmark-tier2.json';

  const benchmarkData = {
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    tier: 2,
    totalDuration,
    results,
  };

  writeFileSync(outputPath, JSON.stringify(benchmarkData, null, 2));
  console.log(`\n✅ Results saved to: ${outputPath}`);
}

main().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
