import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferenceIndex } from '../types/reference-index.js';
import { listTasks, type TaskInfo } from './tasks-list.js';
import { validateTerms } from './validate-terms.js';

/**
 * Dependency readiness check result
 */
export interface DependencyReadinessCheck {
  feature: string;
  status: string;
  progress: number;
  dependencies: {
    interfaceId: string;
    provider: string;
    providerStatus: string;
    providerProgress: number;
    isReady: boolean; // >= 80% or status: implemented
  }[];
  readiness: 'ready' | 'partial' | 'blocked';
  blockers: string[];
}

/**
 * Progress-quality cross check result
 */
export interface ProgressQualityCheck {
  feature: string;
  progress: number;
  status: string;
  qualityIssues: {
    type: 'no_tests' | 'undefined_terms' | 'missing_docs' | 'orphan_code';
    severity: 'error' | 'warning';
    message: string;
    details: any;
  }[];
  recommendation: 'safe_to_use' | 'use_with_caution' | 'not_ready';
}

/**
 * Interface impact analysis result
 */
export interface InterfaceImpactAnalysis {
  interfaceId: string;
  provider: {
    feature: string;
    status: string;
    progress: number;
  };
  consumers: {
    feature: string;
    status: string;
    progress: number;
    isBlocked: boolean;
  }[];
  impact: {
    totalConsumers: number;
    blockedConsumers: number;
    atRiskConsumers: number; // consumer progress > provider progress
  };
}

/**
 * Recursive term validation result
 */
export interface RecursiveTermValidation {
  term: string;
  isDefined: boolean;
  definitionFile?: string;
  usages: {
    file: string;
    feature?: string;
    featureProgress?: number;
    isHighPriority: boolean; // progress > 80% or status: implemented
  }[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Load reference index
 */
function loadReferenceIndex(projectPath: string): ReferenceIndex {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    throw new Error('Reference index not found. Run "edgedoc graph build" first.');
  }

  const indexContent = readFileSync(indexPath, 'utf-8');
  return JSON.parse(indexContent);
}

/**
 * Load tasks as a map
 */
async function loadTasksMap(projectPath: string): Promise<Map<string, TaskInfo>> {
  const tasks = await listTasks({ projectPath });
  return new Map(tasks.map((t) => [t.feature, t]));
}

/**
 * Check dependency readiness
 */
export async function checkDependencyReadiness(
  projectPath: string,
  featureId?: string
): Promise<DependencyReadinessCheck[]> {
  const index = loadReferenceIndex(projectPath);
  const tasksMap = await loadTasksMap(projectPath);

  const results: DependencyReadinessCheck[] = [];

  const features = featureId ? [featureId] : Object.keys(index.features);

  for (const fid of features) {
    const feature = index.features[fid];
    const taskInfo = tasksMap.get(fid);

    if (!taskInfo || !feature) continue;

    const dependencies: DependencyReadinessCheck['dependencies'] = [];

    // Check each used interface
    for (const interfaceId of feature.interfaces.uses) {
      const interfaceData = index.interfaces[interfaceId];
      if (!interfaceData) continue;

      const provider = interfaceData.from;
      const providerTask = tasksMap.get(provider);

      const providerProgress = providerTask?.checkboxes.progress || 0;
      const providerStatus = providerTask?.status || 'unknown';

      dependencies.push({
        interfaceId,
        provider,
        providerStatus,
        providerProgress,
        isReady: providerProgress >= 80 || providerStatus === 'implemented',
      });
    }

    // Determine overall readiness
    const blockers = dependencies
      .filter((d) => !d.isReady)
      .map((d) => `${d.interfaceId} (${d.provider}: ${d.providerProgress}%)`);

    let readiness: DependencyReadinessCheck['readiness'] = 'ready';
    if (blockers.length > 0) {
      readiness = blockers.length === dependencies.length ? 'blocked' : 'partial';
    }

    results.push({
      feature: fid,
      status: taskInfo.status,
      progress: taskInfo.checkboxes.progress,
      dependencies,
      readiness,
      blockers,
    });
  }

  return results;
}

/**
 * Check progress-quality alignment
 */
export async function checkProgressQuality(
  projectPath: string,
  featureId?: string
): Promise<ProgressQualityCheck[]> {
  const index = loadReferenceIndex(projectPath);
  const tasksMap = await loadTasksMap(projectPath);
  const termValidation = await validateTerms({ projectPath });

  const results: ProgressQualityCheck[] = [];

  const features = featureId ? [featureId] : Object.keys(index.features);

  for (const fid of features) {
    const feature = index.features[fid];
    const taskInfo = tasksMap.get(fid);

    if (!taskInfo || !feature) continue;

    const qualityIssues: ProgressQualityCheck['qualityIssues'] = [];

    // Check 1: Tests
    if (feature.tests.tested_by.length === 0) {
      qualityIssues.push({
        type: 'no_tests',
        severity: taskInfo.checkboxes.progress >= 80 ? 'error' : 'warning',
        message: 'No tests found',
        details: { suggestion: `Add tests in tests/${fid}.test.ts` },
      });
    }

    // Check 2: Terms
    const featureFile = feature.file;
    const undefinedInFeature = termValidation.errors.filter(
      (e) => e.type === 'undefined_term' && e.location?.file === featureFile
    );

    if (undefinedInFeature.length > 0) {
      qualityIssues.push({
        type: 'undefined_terms',
        severity: 'error',
        message: `${undefinedInFeature.length} undefined terms`,
        details: undefinedInFeature.map((e) => e.term),
      });
    }

    // Recommendation
    let recommendation: ProgressQualityCheck['recommendation'] = 'safe_to_use';

    if (qualityIssues.some((i) => i.severity === 'error')) {
      recommendation = 'not_ready';
    } else if (
      qualityIssues.some((i) => i.type === 'no_tests') &&
      taskInfo.checkboxes.progress >= 100
    ) {
      recommendation = 'use_with_caution';
    }

    results.push({
      feature: fid,
      progress: taskInfo.checkboxes.progress,
      status: taskInfo.status,
      qualityIssues,
      recommendation,
    });
  }

  return results;
}

/**
 * Analyze interface impact
 */
export async function analyzeInterfaceImpact(
  projectPath: string,
  interfaceId?: string
): Promise<InterfaceImpactAnalysis[]> {
  const index = loadReferenceIndex(projectPath);
  const tasksMap = await loadTasksMap(projectPath);

  const results: InterfaceImpactAnalysis[] = [];

  const interfaces = interfaceId ? [interfaceId] : Object.keys(index.interfaces);

  for (const iid of interfaces) {
    const interfaceData = index.interfaces[iid];
    if (!interfaceData) continue;

    const providerTask = tasksMap.get(interfaceData.from);

    // Find consumers
    const consumers: InterfaceImpactAnalysis['consumers'] = [];

    for (const [fid, feature] of Object.entries(index.features)) {
      if (feature.interfaces.uses.includes(iid)) {
        const consumerTask = tasksMap.get(fid);

        const consumerProgress = consumerTask?.checkboxes.progress || 0;
        const consumerStatus = consumerTask?.status || 'unknown';
        const providerProgress = providerTask?.checkboxes.progress || 0;

        consumers.push({
          feature: fid,
          status: consumerStatus,
          progress: consumerProgress,
          isBlocked: providerProgress < 50 && consumerStatus === 'active',
        });
      }
    }

    const blockedConsumers = consumers.filter((c) => c.isBlocked).length;
    const atRiskConsumers = consumers.filter(
      (c) => c.progress > (providerTask?.checkboxes.progress || 0)
    ).length;

    results.push({
      interfaceId: iid,
      provider: {
        feature: interfaceData.from,
        status: providerTask?.status || 'unknown',
        progress: providerTask?.checkboxes.progress || 0,
      },
      consumers,
      impact: {
        totalConsumers: consumers.length,
        blockedConsumers,
        atRiskConsumers,
      },
    });
  }

  return results;
}

/**
 * Recursive term validation
 */
export async function validateTermsRecursive(
  projectPath: string
): Promise<RecursiveTermValidation[]> {
  const termValidation = await validateTerms({ projectPath });
  const index = loadReferenceIndex(projectPath);
  const tasksMap = await loadTasksMap(projectPath);

  const results: RecursiveTermValidation[] = [];

  // Group by term
  const undefinedTerms = new Map<string, typeof termValidation.errors>();

  for (const error of termValidation.errors) {
    if (error.type !== 'undefined_term') continue;

    const existing = undefinedTerms.get(error.term) || [];
    existing.push(error);
    undefinedTerms.set(error.term, existing);
  }

  // Analyze each undefined term
  for (const [term, errors] of undefinedTerms) {
    const usages: RecursiveTermValidation['usages'] = [];

    for (const error of errors) {
      const file = error.location?.file;
      if (!file) continue;

      // Find feature for this file
      let featureId: string | undefined;
      let featureProgress: number | undefined;
      let featureStatus: string | undefined;

      for (const [fid, feature] of Object.entries(index.features)) {
        if (feature.file === file) {
          featureId = fid;
          const task = tasksMap.get(fid);
          featureProgress = task?.checkboxes.progress;
          featureStatus = task?.status;
          break;
        }
      }

      usages.push({
        file,
        feature: featureId,
        featureProgress,
        isHighPriority:
          (featureProgress || 0) > 80 || featureStatus === 'implemented',
      });
    }

    // Determine severity
    let severity: RecursiveTermValidation['severity'] = 'low';

    if (usages.some((u) => u.isHighPriority)) {
      severity = 'critical';
    } else if (usages.some((u) => (u.featureProgress || 0) > 50)) {
      severity = 'high';
    } else if (usages.some((u) => u.feature)) {
      severity = 'medium';
    }

    results.push({
      term,
      isDefined: false,
      usages,
      severity,
    });
  }

  return results;
}

/**
 * Print dependency readiness results
 */
export function printDependencyReadiness(results: DependencyReadinessCheck[]): void {
  console.log('━━━ Dependency Readiness ━━━\n');

  const blocked = results.filter((d) => d.readiness === 'blocked');
  if (blocked.length > 0) {
    console.log(`❌ Blocked Features (${blocked.length}):\n`);
    for (const check of blocked) {
      console.log(`   ${check.feature} (${check.progress}%)`);
      console.log(`   Status: ${check.status}`);
      console.log(`   Dependencies not ready:`);
      for (const blocker of check.blockers) {
        console.log(`     - ${blocker}`);
      }
      console.log();
    }
  }

  const partial = results.filter((d) => d.readiness === 'partial');
  if (partial.length > 0) {
    console.log(`⚠️  Partial Ready Features (${partial.length}):\n`);
    for (const check of partial) {
      console.log(
        `   ${check.feature}: ${check.blockers.length} dependencies not ready`
      );
    }
    console.log();
  }

  const ready = results.filter((d) => d.readiness === 'ready');
  console.log(`✅ Ready Features: ${ready.length}\n`);
}

/**
 * Print progress-quality results
 */
export function printProgressQuality(results: ProgressQualityCheck[]): void {
  console.log('━━━ Progress-Quality Check ━━━\n');

  const notReady = results.filter((p) => p.recommendation === 'not_ready');
  if (notReady.length > 0) {
    console.log(`❌ Not Ready (${notReady.length}):\n`);
    for (const check of notReady) {
      console.log(`   ${check.feature} (${check.progress}%)`);
      for (const issue of check.qualityIssues.filter((i) => i.severity === 'error')) {
        console.log(`     - ${issue.message}`);
      }
      console.log();
    }
  }

  const caution = results.filter((p) => p.recommendation === 'use_with_caution');
  if (caution.length > 0) {
    console.log(`⚠️  Use With Caution (${caution.length}):\n`);
    for (const check of caution) {
      console.log(
        `   ${check.feature}: ${check.qualityIssues.map((i) => i.type).join(', ')}`
      );
    }
    console.log();
  }

  const safe = results.filter((p) => p.recommendation === 'safe_to_use');
  console.log(`✅ Safe to Use: ${safe.length}\n`);
}

/**
 * Print interface impact results
 */
export function printInterfaceImpact(results: InterfaceImpactAnalysis[]): void {
  console.log('━━━ Interface Impact Analysis ━━━\n');

  const highImpact = results.filter(
    (i) => i.impact.blockedConsumers > 0 || i.impact.atRiskConsumers > 0
  );

  if (highImpact.length > 0) {
    console.log(`⚠️  High Impact Interfaces (${highImpact.length}):\n`);
    for (const impact of highImpact) {
      console.log(`   ${impact.interfaceId}`);
      console.log(
        `     Provider: ${impact.provider.feature} (${impact.provider.progress}%)`
      );
      console.log(`     Consumers: ${impact.impact.totalConsumers}`);
      if (impact.impact.blockedConsumers > 0) {
        console.log(`     ❌ Blocked: ${impact.impact.blockedConsumers}`);
      }
      if (impact.impact.atRiskConsumers > 0) {
        console.log(`     ⚠️  At Risk: ${impact.impact.atRiskConsumers}`);
      }
      console.log();
    }
  } else {
    console.log('✅ No high-impact issues found\n');
  }
}

/**
 * Print recursive term validation results
 */
export function printRecursiveTerms(results: RecursiveTermValidation[]): void {
  console.log('━━━ Recursive Term Validation ━━━\n');

  const criticalTerms = results.filter((t) => t.severity === 'critical');
  if (criticalTerms.length > 0) {
    console.log(`❌ Critical (high-priority features) (${criticalTerms.length}):\n`);
    for (const term of criticalTerms) {
      const highPriorityFiles = term.usages.filter((u) => u.isHighPriority);
      console.log(`   "${term.term}" used in:`);
      for (const usage of highPriorityFiles) {
        console.log(`     - ${usage.feature} (${usage.featureProgress}%)`);
      }
      console.log();
    }
  }

  const highTerms = results.filter((t) => t.severity === 'high');
  if (highTerms.length > 0) {
    console.log(`⚠️  High Priority (${highTerms.length}):\n`);
    for (const term of highTerms) {
      console.log(`   "${term.term}" used in ${term.usages.length} files`);
    }
    console.log();
  }

  if (criticalTerms.length === 0 && highTerms.length === 0) {
    console.log('✅ No critical term issues\n');
  }
}
