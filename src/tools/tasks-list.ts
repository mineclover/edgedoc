import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findMarkdownFiles } from '../shared/utils.js';
import type { ReferenceIndex } from '../types/reference-index.js';

export interface TasksListOptions {
  projectPath: string;
  status?: string;
  priority?: string;
}

export interface TaskInfo {
  id: string;
  file: string;
  title: string;
  type: string;
  status: string;
  priority?: string;
  feature: string;
  checkboxes: {
    total: number;
    checked: number;
    progress: number;
  };
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Count checkboxes in markdown content
 */
function countCheckboxes(content: string): { total: number; checked: number } {
  const checkboxPattern = /^[\s-]*\[([ xX])\]/gm;
  const matches = content.match(checkboxPattern) || [];

  const total = matches.length;
  const checked = matches.filter((m) => m.includes('[x]') || m.includes('[X]')).length;

  return { total, checked };
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Find first # heading
  const match = withoutFrontmatter.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * List all tasks from features directory
 */
export async function listTasks(options: TasksListOptions): Promise<TaskInfo[]> {
  const { projectPath, status, priority } = options;

  const featuresDir = join(projectPath, 'tasks', 'features');
  const files = findMarkdownFiles(featuresDir);

  const tasks: TaskInfo[] = [];

  for (const file of files) {
    const relativePath = relative(projectPath, file);
    const content = readFileSync(file, 'utf-8');

    const frontmatter = parseFrontmatter(content);

    // Skip if no type field (not a feature document)
    if (!frontmatter.type) continue;

    // Apply filters
    if (status && frontmatter.status !== status) continue;
    if (priority && frontmatter.priority !== priority) continue;

    const checkboxes = countCheckboxes(content);
    const title = extractTitle(content);
    const id = file.split('/').pop()?.replace('.md', '') || '';

    tasks.push({
      id,
      file: relativePath,
      title,
      type: frontmatter.type,
      status: frontmatter.status || 'unknown',
      priority: frontmatter.priority,
      feature: frontmatter.feature || id,
      checkboxes: {
        total: checkboxes.total,
        checked: checkboxes.checked,
        progress: checkboxes.total > 0 ? Math.round((checkboxes.checked / checkboxes.total) * 100) : 0,
      },
    });
  }

  // Sort by priority (high > medium > low) then by progress
  tasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.checkboxes.progress - a.checkboxes.progress;
  });

  return tasks;
}

/**
 * Print tasks list
 */
export function printTasksList(tasks: TaskInfo[], options?: { verbose?: boolean }): void {
  if (tasks.length === 0) {
    console.log('No tasks found.');
    return;
  }

  console.log(`📋 Tasks (${tasks.length} total)\n`);

  for (const task of tasks) {
    const statusIcon = task.status === 'active' ? '✅' : task.status === 'in_progress' ? '🔄' : '⬜';
    const priorityBadge = task.priority ? `[${task.priority.toUpperCase()}]` : '';

    console.log(`${statusIcon} ${task.id} ${priorityBadge}`);
    console.log(`   ${task.title}`);

    if (task.checkboxes.total > 0) {
      const progressBar = '█'.repeat(Math.floor(task.checkboxes.progress / 10));
      const emptyBar = '░'.repeat(10 - Math.floor(task.checkboxes.progress / 10));
      console.log(
        `   Progress: ${progressBar}${emptyBar} ${task.checkboxes.checked}/${task.checkboxes.total} (${task.checkboxes.progress}%)`
      );
    }

    console.log(`   Status: ${task.status}`);

    if (options?.verbose) {
      console.log(`   File: ${task.file}`);
    }

    console.log();
  }
}

/**
 * Get specific task details
 */
export function getTaskDetails(tasks: TaskInfo[], taskId: string): TaskInfo | undefined {
  return tasks.find((t) => t.id === taskId || t.feature === taskId);
}

/**
 * Calculate project progress summary
 */
export interface ProgressSummary {
  total: number;
  byStatus: {
    planned: number;
    in_progress: number;
    active: number;
    implemented: number;
    deprecated: number;
  };
  byType: {
    feature: number;
    test: number;
    interface: number;
    shared: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  overallProgress: {
    totalCheckboxes: number;
    checkedCheckboxes: number;
    percentage: number;
  };
}

export function calculateProgress(tasks: TaskInfo[]): ProgressSummary {
  const summary: ProgressSummary = {
    total: tasks.length,
    byStatus: {
      planned: 0,
      in_progress: 0,
      active: 0,
      implemented: 0,
      deprecated: 0,
    },
    byType: {
      feature: 0,
      test: 0,
      interface: 0,
      shared: 0,
    },
    byPriority: {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    },
    overallProgress: {
      totalCheckboxes: 0,
      checkedCheckboxes: 0,
      percentage: 0,
    },
  };

  for (const task of tasks) {
    // Count by status
    const status = task.status as keyof typeof summary.byStatus;
    if (status in summary.byStatus) {
      summary.byStatus[status]++;
    }

    // Count by type
    const type = task.type as keyof typeof summary.byType;
    if (type in summary.byType) {
      summary.byType[type]++;
    }

    // Count by priority
    const priority = (task.priority || 'none') as keyof typeof summary.byPriority;
    if (priority in summary.byPriority) {
      summary.byPriority[priority]++;
    }

    // Accumulate checkboxes
    summary.overallProgress.totalCheckboxes += task.checkboxes.total;
    summary.overallProgress.checkedCheckboxes += task.checkboxes.checked;
  }

  // Calculate overall percentage
  if (summary.overallProgress.totalCheckboxes > 0) {
    summary.overallProgress.percentage = Math.round(
      (summary.overallProgress.checkedCheckboxes / summary.overallProgress.totalCheckboxes) * 100
    );
  }

  return summary;
}

/**
 * Print progress dashboard
 */
export function printProgressDashboard(summary: ProgressSummary): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Project Progress Dashboard');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Overall progress
  const progressBarLength = 30;
  const filledLength = Math.floor(
    (summary.overallProgress.percentage / 100) * progressBarLength
  );
  const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

  console.log('Overall Progress');
  console.log(`${progressBar} ${summary.overallProgress.percentage}%\n`);

  // Features count
  console.log(`Features: ${summary.total}`);

  // By status
  console.log('\n━━━ By Status ━━━');
  if (summary.byStatus.implemented > 0) {
    console.log(`  ✅ Implemented: ${summary.byStatus.implemented}`);
  }
  if (summary.byStatus.active > 0) {
    console.log(`  ✅ Active: ${summary.byStatus.active}`);
  }
  if (summary.byStatus.in_progress > 0) {
    console.log(`  🔄 In Progress: ${summary.byStatus.in_progress}`);
  }
  if (summary.byStatus.planned > 0) {
    console.log(`  ⬜ Planned: ${summary.byStatus.planned}`);
  }
  if (summary.byStatus.deprecated > 0) {
    console.log(`  ⚠️  Deprecated: ${summary.byStatus.deprecated}`);
  }

  // By type
  console.log('\n━━━ By Type ━━━');
  if (summary.byType.feature > 0) {
    console.log(`  Features: ${summary.byType.feature}`);
  }
  if (summary.byType.test > 0) {
    console.log(`  Tests: ${summary.byType.test}`);
  }
  if (summary.byType.interface > 0) {
    console.log(`  Interfaces: ${summary.byType.interface}`);
  }
  if (summary.byType.shared > 0) {
    console.log(`  Shared: ${summary.byType.shared}`);
  }

  // By priority
  console.log('\n━━━ By Priority ━━━');
  if (summary.byPriority.high > 0) {
    console.log(`  🔴 High: ${summary.byPriority.high}`);
  }
  if (summary.byPriority.medium > 0) {
    console.log(`  🟡 Medium: ${summary.byPriority.medium}`);
  }
  if (summary.byPriority.low > 0) {
    console.log(`  🟢 Low: ${summary.byPriority.low}`);
  }
  if (summary.byPriority.none > 0) {
    console.log(`  ⚪ None: ${summary.byPriority.none}`);
  }

  // Checkboxes
  console.log('\n━━━ Checkboxes ━━━');
  console.log(`  Total: ${summary.overallProgress.totalCheckboxes}`);
  console.log(
    `  ✅ Completed: ${summary.overallProgress.checkedCheckboxes} (${summary.overallProgress.percentage}%)`
  );
  console.log(
    `  ⬜ Remaining: ${summary.overallProgress.totalCheckboxes - summary.overallProgress.checkedCheckboxes}`
  );

  console.log();
}

/**
 * Get tasks by code file (reverse lookup via reference index)
 */
export async function getTasksByCode(
  projectPath: string,
  codeFile: string
): Promise<{ featureIds: string[]; tasks: TaskInfo[] }> {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    throw new Error('Reference index not found. Run "edgedoc graph build" first.');
  }

  const indexContent = readFileSync(indexPath, 'utf-8');
  const index: ReferenceIndex = JSON.parse(indexContent);

  const codeRef = index.code[codeFile];

  if (!codeRef) {
    throw new Error(`Code file "${codeFile}" not found in index. Not documented in any feature.`);
  }

  const featureIds = codeRef.documented_in;

  if (featureIds.length === 0) {
    throw new Error(`Code file "${codeFile}" is not documented in any feature.`);
  }

  // Get tasks for all features documenting this code
  const allTasks = await listTasks({ projectPath });
  const tasks = allTasks.filter((t) => featureIds.includes(t.feature) || featureIds.includes(t.id));

  return { featureIds, tasks };
}

/**
 * Get tasks by interface (reverse lookup via reference index)
 */
export async function getTasksByInterface(
  projectPath: string,
  interfaceId: string
): Promise<{ featureIds: string[]; tasks: TaskInfo[] }> {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    throw new Error('Reference index not found. Run "edgedoc graph build" first.');
  }

  const indexContent = readFileSync(indexPath, 'utf-8');
  const index: ReferenceIndex = JSON.parse(indexContent);

  const interfaceData = index.interfaces[interfaceId];

  if (!interfaceData) {
    throw new Error(`Interface "${interfaceId}" not found in index.`);
  }

  // Get features that provide or use this interface
  const featureIds: string[] = [];

  for (const [featureId, feature] of Object.entries(index.features)) {
    if (
      feature.interfaces.provides.includes(interfaceId) ||
      feature.interfaces.uses.includes(interfaceId)
    ) {
      featureIds.push(featureId);
    }
  }

  if (featureIds.length === 0) {
    throw new Error(`No features found for interface "${interfaceId}".`);
  }

  const allTasks = await listTasks({ projectPath });
  const tasks = allTasks.filter((t) => featureIds.includes(t.feature) || featureIds.includes(t.id));

  return { featureIds, tasks };
}

/**
 * Get tasks by term (reverse lookup via reference index)
 */
export async function getTasksByTerm(
  projectPath: string,
  termName: string
): Promise<{ featureIds: string[]; tasks: TaskInfo[] }> {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    throw new Error('Reference index not found. Run "edgedoc graph build" first.');
  }

  const indexContent = readFileSync(indexPath, 'utf-8');
  const index: ReferenceIndex = JSON.parse(indexContent);

  const termData = index.terms[termName];

  if (!termData) {
    throw new Error(`Term "[[${termName}]]" not found in index.`);
  }

  // Get features that use or define this term
  const featureIds: string[] = [];

  for (const [featureId, feature] of Object.entries(index.features)) {
    if (
      feature.terms.defines.includes(termName) ||
      feature.terms.uses.includes(termName)
    ) {
      featureIds.push(featureId);
    }
  }

  if (featureIds.length === 0) {
    throw new Error(`No features found using term "[[${termName}]]".`);
  }

  const allTasks = await listTasks({ projectPath });
  const tasks = allTasks.filter((t) => featureIds.includes(t.feature) || featureIds.includes(t.id));

  return { featureIds, tasks };
}

/**
 * Print tasks for a reference (code/interface/term)
 */
export function printTasksForReference(
  referenceType: string,
  referenceName: string,
  featureIds: string[],
  tasks: TaskInfo[]
): void {
  const icons = {
    code: '💾',
    interface: '🔌',
    term: '📚',
  };

  const icon = icons[referenceType as keyof typeof icons] || '📦';

  console.log(`${icon} ${referenceType.charAt(0).toUpperCase() + referenceType.slice(1)}: ${referenceName}\n`);
  console.log(`📄 Used in ${featureIds.length} feature(s):\n`);

  for (const task of tasks) {
    const statusIcon = task.status === 'active' ? '✅' : task.status === 'in_progress' ? '🔄' : '⬜';

    console.log(`${statusIcon} ${task.id}`);
    console.log(`   ${task.title}`);

    if (task.checkboxes.total > 0) {
      const progressBar = '█'.repeat(Math.floor(task.checkboxes.progress / 10));
      const emptyBar = '░'.repeat(10 - Math.floor(task.checkboxes.progress / 10));
      console.log(
        `   Progress: ${progressBar}${emptyBar} ${task.checkboxes.checked}/${task.checkboxes.total} (${task.checkboxes.progress}%)`
      );
    }

    console.log();
  }
}
