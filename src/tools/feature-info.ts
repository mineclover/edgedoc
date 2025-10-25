/**
 * Feature Info & Coverage
 *
 * Feature의 전체 구현 상태를 통합 조회
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReferenceIndex } from '../types/reference-index.js';
import { listTasks, type TaskInfo } from './tasks-list.js';

// ============================================================================
// Types
// ============================================================================

export interface FeatureInfo {
  // Basic info
  id: string;
  title: string;
  file: string;
  status: string;
  progress: number;
  hasCheckboxes: boolean;

  // Interfaces
  interfaces: {
    provides: InterfaceStatus[];
    uses: InterfaceStatus[];
  };

  // Tests
  tests: {
    files: string[];
    hasCoverage: boolean;
  };

  // Code
  code: {
    files: string[];
    totalSize: number;
  };

  // Dependencies
  dependencies: {
    relatedFeatures: string[];
    readiness: 'ready' | 'partial' | 'blocked' | 'unknown';
  };
}

export interface InterfaceStatus {
  id: string;
  targetFeature: string;
  targetTitle: string;
  status: 'implemented' | 'partial' | 'planned' | 'unknown';
  progress: number;
  hasCheckboxes: boolean;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get complete feature information
 */
export async function getFeatureInfo(
  projectPath: string,
  featureId: string
): Promise<FeatureInfo> {
  // Load reference index
  const indexPath = join(projectPath, '.edgedoc', 'references.json');
  const index: ReferenceIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

  // Load all tasks
  const allTasks = await listTasks({ projectPath });
  const tasksMap = new Map(allTasks.map((t) => [t.feature, t]));

  // Find target feature in index
  const featureData = index.features[featureId];
  if (!featureData) {
    throw new Error(`Feature "${featureId}" not found in reference index`);
  }

  // Get task info
  const taskInfo = tasksMap.get(featureId);
  if (!taskInfo) {
    throw new Error(`Task info for "${featureId}" not found`);
  }

  // Build feature info
  const info: FeatureInfo = {
    id: taskInfo.id,
    title: taskInfo.title,
    file: taskInfo.file,
    status: taskInfo.status,
    progress: taskInfo.checkboxes.progress,
    hasCheckboxes: taskInfo.checkboxes.total > 0,

    interfaces: {
      provides: await getInterfaceStatuses(
        projectPath,
        featureData.interfaces.provides,
        tasksMap,
        'provides'
      ),
      uses: await getInterfaceStatuses(
        projectPath,
        featureData.interfaces.uses,
        tasksMap,
        'uses'
      ),
    },

    tests: {
      files: featureData.tests.tested_by,
      hasCoverage: featureData.tests.tested_by.length > 0,
    },

    code: {
      files: featureData.code.uses,
      totalSize: 0, // TODO: calculate file sizes
    },

    dependencies: {
      relatedFeatures: featureData.features.related,
      readiness: calculateReadiness(featureData, tasksMap),
    },
  };

  return info;
}

/**
 * Get interface statuses for a list of interface IDs
 */
async function getInterfaceStatuses(
  projectPath: string,
  interfaceIds: string[],
  tasksMap: Map<string, TaskInfo>,
  direction: 'provides' | 'uses'
): Promise<InterfaceStatus[]> {
  const statuses: InterfaceStatus[] = [];

  // Load interface index to get from/to mappings
  const interfaceIndex = await loadInterfaceIndex(projectPath);

  for (const interfaceId of interfaceIds) {
    // Get interface data
    const interfaceData = interfaceIndex.get(interfaceId);

    if (!interfaceData) {
      // Interface not found
      statuses.push({
        id: interfaceId,
        targetFeature: 'unknown',
        targetTitle: 'Unknown Feature',
        status: 'unknown',
        progress: 0,
        hasCheckboxes: false,
      });
      continue;
    }

    // Determine target based on direction
    // If 'provides': we check the consumer (to)
    // If 'uses': we check the provider (from)
    const targetFeature = direction === 'provides' ? interfaceData.to : interfaceData.from;
    const targetTask = tasksMap.get(targetFeature);

    if (targetTask) {
      statuses.push({
        id: interfaceId,
        targetFeature: targetTask.id,
        targetTitle: targetTask.title,
        status: getImplementationStatus(targetTask),
        progress: targetTask.checkboxes.progress,
        hasCheckboxes: targetTask.checkboxes.total > 0,
      });
    } else {
      // Target feature exists in interface but not in tasks
      statuses.push({
        id: interfaceId,
        targetFeature: targetFeature,
        targetTitle: targetFeature,
        status: 'unknown',
        progress: 0,
        hasCheckboxes: false,
      });
    }
  }

  return statuses;
}

/**
 * Load interface index from references.json
 * Returns a map of interfaceId → {from, to}
 */
async function loadInterfaceIndex(
  projectPath: string
): Promise<
  Map<
    string,
    {
      from: string;
      to: string;
      file: string;
    }
  >
> {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');
  const index: ReferenceIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

  const interfaceMap = new Map<string, { from: string; to: string; file: string }>();

  for (const [interfaceId, data] of Object.entries(index.interfaces)) {
    interfaceMap.set(interfaceId, {
      from: data.from,
      to: data.to,
      file: data.file,
    });
  }

  return interfaceMap;
}

/**
 * Determine implementation status from task info
 */
function getImplementationStatus(task: TaskInfo): 'implemented' | 'partial' | 'planned' {
  if (task.status === 'implemented') {
    return 'implemented';
  }

  if (task.checkboxes.total === 0) {
    // No checkboxes
    if (task.status === 'active') {
      return 'implemented';
    } else if (task.status === 'planned') {
      return 'planned';
    }
  }

  // Has checkboxes
  if (task.checkboxes.progress === 100) {
    return 'implemented';
  } else if (task.checkboxes.progress === 0) {
    return 'planned';
  } else {
    return 'partial';
  }

  return 'partial';
}

/**
 * Calculate overall readiness based on dependencies
 */
function calculateReadiness(
  featureData: any,
  tasksMap: Map<string, TaskInfo>
): 'ready' | 'partial' | 'blocked' | 'unknown' {
  // Check if all used interfaces are ready
  const usedInterfaces = featureData.interfaces.uses;

  if (usedInterfaces.length === 0) {
    // No dependencies
    return 'ready';
  }

  // TODO: Check actual interface provider statuses
  // For now, return unknown
  return 'unknown';
}

// ============================================================================
// List Functions
// ============================================================================

/**
 * List features with filtering
 */
export async function listFeatures(
  projectPath: string,
  options?: {
    incomplete?: boolean;
    noTests?: boolean;
    incompleteInterfaces?: boolean;
  }
): Promise<FeatureInfo[]> {
  const allTasks = await listTasks({ projectPath });
  const features: FeatureInfo[] = [];

  for (const task of allTasks) {
    try {
      const info = await getFeatureInfo(projectPath, task.feature);
      features.push(info);
    } catch (error) {
      // Skip features that can't be loaded
      console.error(`Warning: Could not load feature info for ${task.feature}`);
    }
  }

  // Apply filters
  let filtered = features;

  if (options?.incomplete) {
    filtered = filtered.filter(
      (f) =>
        f.status !== 'implemented' &&
        (f.hasCheckboxes ? f.progress < 100 : true)
    );
  }

  if (options?.noTests) {
    filtered = filtered.filter((f) => !f.tests.hasCoverage);
  }

  if (options?.incompleteInterfaces) {
    filtered = filtered.filter((f) =>
      f.interfaces.provides.some((i) => i.status !== 'implemented')
    );
  }

  return filtered;
}

/**
 * Check feature readiness (dependency check)
 */
export async function checkFeatureReadiness(
  projectPath: string,
  featureId: string
): Promise<{
  feature: FeatureInfo;
  isReady: boolean;
  blockers: string[];
}> {
  const info = await getFeatureInfo(projectPath, featureId);

  const blockers: string[] = [];

  // Check if used interfaces are ready
  for (const iface of info.interfaces.uses) {
    if (iface.status !== 'implemented') {
      blockers.push(`Interface ${iface.id} (${iface.targetFeature}) is ${iface.status}`);
    }
  }

  // Check if tests exist (warning, not blocker)
  if (!info.tests.hasCoverage) {
    // Not a blocker, just a warning
  }

  return {
    feature: info,
    isReady: blockers.length === 0,
    blockers,
  };
}
