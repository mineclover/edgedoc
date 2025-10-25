import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { listTasks, type TaskInfo } from './tasks-list.js';
import { validateTerms } from './validate-terms.js';
import { validateOrphans } from './orphans.js';
import type { ReferenceIndex } from '../types/reference-index.js';

export interface IssuesOptions {
  projectPath: string;
  tasks?: boolean;
  orphans?: boolean;
  terms?: boolean;
  quality?: boolean;
  all?: boolean;
}

export interface Issue {
  type: 'task' | 'orphan' | 'term' | 'quality';
  severity: 'warning' | 'info';
  title: string;
  description: string;
  location?: string;
  details?: string[];
}

export interface IssuesReport {
  tasks: Issue[];
  orphans: Issue[];
  terms: Issue[];
  quality: Issue[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

/**
 * Collect task-related issues
 */
async function collectTaskIssues(projectPath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const tasks = await listTasks({ projectPath });

  // Issue 1: Tasks with incomplete core items (excluding future)
  for (const task of tasks) {
    if (task.checkboxes.total > 0 && task.checkboxes.progress < 100) {
      const coreRemaining = task.checkboxes.coreCount -
        Math.floor((task.checkboxes.checked / task.checkboxes.total) * task.checkboxes.coreCount);

      if (coreRemaining > 0) {
        issues.push({
          type: 'task',
          severity: task.priority === 'high' ? 'warning' : 'info',
          title: `Incomplete core tasks in ${task.id}`,
          description: `${task.title} has ${coreRemaining} core tasks remaining`,
          location: task.file,
          details: [
            `Progress: ${task.checkboxes.progress}%`,
            `Core: ${task.checkboxes.coreCount} tasks`,
            `Future: ${task.checkboxes.futureCount} tasks`,
            `Priority: ${task.priority || 'none'}`,
          ],
        });
      }
    }
  }

  // Issue 2: High priority features with no checkboxes
  for (const task of tasks) {
    if (task.priority === 'high' && task.checkboxes.total === 0 && task.status === 'active') {
      issues.push({
        type: 'task',
        severity: 'info',
        title: `High priority feature without tasks: ${task.id}`,
        description: `${task.title} is marked as high priority but has no implementation tasks`,
        location: task.file,
        details: [
          `Status: ${task.status}`,
          'Consider adding implementation tasks or updating status to "implemented"',
        ],
      });
    }
  }

  // Issue 3: Features without tests
  const indexPath = join(projectPath, '.edgedoc', 'references.json');
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, 'utf-8');
    const index: ReferenceIndex = JSON.parse(indexContent);

    for (const [featureId, feature] of Object.entries(index.features)) {
      if (feature.tests.tested_by.length === 0) {
        const task = tasks.find((t) => t.id === featureId || t.feature === featureId);
        if (task && (task.priority === 'high' || task.priority === 'medium')) {
          issues.push({
            type: 'task',
            severity: 'info',
            title: `No tests for ${featureId}`,
            description: `${task.title} has no test files`,
            location: task.file,
            details: [
              `Priority: ${task.priority}`,
              `Status: ${task.status}`,
              'Consider adding test coverage',
            ],
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Collect orphan file issues
 */
async function collectOrphanIssues(projectPath: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    const result = await validateOrphans({ projectPath });

    if (result.orphanFiles && result.orphanFiles.length > 0) {
      for (const file of result.orphanFiles) {
        issues.push({
          type: 'orphan',
          severity: 'warning',
          title: `Orphan file: ${file}`,
          description: 'File is not referenced in any documentation and not imported by other code',
          location: file,
          details: [
            'This file may be unused or need documentation',
            'Add to code_references in a feature document or verify imports',
          ],
        });
      }
    }
  } catch (error) {
    // If validation fails, skip orphan issues
    console.error('Warning: Could not collect orphan issues:', error);
  }

  return issues;
}

/**
 * Collect term-related issues
 */
async function collectTermIssues(projectPath: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    const result = await validateTerms({ projectPath });

    // Circular references
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        if (error.type === 'circular_reference') {
          issues.push({
            type: 'term',
            severity: 'warning',
            title: 'Circular term reference',
            description: error.message,
            location: typeof error.location === 'string' ? error.location : error.location?.file,
            details: error.path ? [`Path: ${error.path.join(' → ')}`] : undefined,
          });
        }
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      for (const warning of result.warnings) {
        if (warning.type === 'circular_reference') {
          issues.push({
            type: 'term',
            severity: 'warning',
            title: 'Circular term reference',
            description: warning.message,
            location: typeof warning.location === 'string' ? warning.location : warning.location?.file,
            details: warning.path ? [`Path: ${warning.path.join(' → ')}`] : undefined,
          });
        }
      }
    }

    // Undefined terms
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        if (error.type === 'undefined_term') {
          issues.push({
            type: 'term',
            severity: 'warning',
            title: `Undefined term: ${error.term}`,
            description: error.message,
            location: error.location,
          });
        }
      }
    }
  } catch (error) {
    console.error('Warning: Could not collect term issues:', error);
  }

  return issues;
}

/**
 * Collect quality-related issues
 */
async function collectQualityIssues(projectPath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const tasks = await listTasks({ projectPath });

  // Issue 1: High progress but no tests
  for (const task of tasks) {
    if (task.checkboxes.progress >= 80 && task.checkboxes.total > 0) {
      const indexPath = join(projectPath, '.edgedoc', 'references.json');
      if (existsSync(indexPath)) {
        const indexContent = readFileSync(indexPath, 'utf-8');
        const index: ReferenceIndex = JSON.parse(indexContent);

        const feature = index.features[task.id] || index.features[task.feature];
        if (feature && feature.tests.tested_by.length === 0) {
          issues.push({
            type: 'quality',
            severity: 'warning',
            title: `High progress without tests: ${task.id}`,
            description: `${task.title} is ${task.checkboxes.progress}% complete but has no tests`,
            location: task.file,
            details: [
              `Progress: ${task.checkboxes.progress}%`,
              'Consider adding tests before marking as complete',
            ],
          });
        }
      }
    }
  }

  // Issue 2: Implemented status but incomplete tasks
  for (const task of tasks) {
    if (task.status === 'implemented' && task.checkboxes.total > 0 && task.checkboxes.progress < 100) {
      issues.push({
        type: 'quality',
        severity: 'warning',
        title: `Status mismatch: ${task.id}`,
        description: `Marked as implemented but has incomplete tasks (${task.checkboxes.progress}%)`,
        location: task.file,
        details: [
          `Progress: ${task.checkboxes.checked}/${task.checkboxes.total}`,
          'Update status to "active" or complete remaining tasks',
        ],
      });
    }
  }

  return issues;
}

/**
 * Collect all issues
 */
export async function collectIssues(options: IssuesOptions): Promise<IssuesReport> {
  const { projectPath, tasks, orphans, terms, quality, all } = options;

  const report: IssuesReport = {
    tasks: [],
    orphans: [],
    terms: [],
    quality: [],
    summary: {
      total: 0,
      byType: {},
      bySeverity: {},
    },
  };

  // Collect based on filters
  if (all || tasks) {
    report.tasks = await collectTaskIssues(projectPath);
  }

  if (all || orphans) {
    report.orphans = await collectOrphanIssues(projectPath);
  }

  if (all || terms) {
    report.terms = await collectTermIssues(projectPath);
  }

  if (all || quality) {
    report.quality = await collectQualityIssues(projectPath);
  }

  // If no filters specified, collect all
  if (!tasks && !orphans && !terms && !quality && !all) {
    report.tasks = await collectTaskIssues(projectPath);
    report.orphans = await collectOrphanIssues(projectPath);
    report.terms = await collectTermIssues(projectPath);
    report.quality = await collectQualityIssues(projectPath);
  }

  // Calculate summary
  const allIssues = [
    ...report.tasks,
    ...report.orphans,
    ...report.terms,
    ...report.quality,
  ];

  report.summary.total = allIssues.length;

  for (const issue of allIssues) {
    report.summary.byType[issue.type] = (report.summary.byType[issue.type] || 0) + 1;
    report.summary.bySeverity[issue.severity] = (report.summary.bySeverity[issue.severity] || 0) + 1;
  }

  return report;
}

/**
 * Print issues report
 */
export function printIssuesReport(report: IssuesReport, options?: { verbose?: boolean }): void {
  const { tasks, orphans, terms, quality, summary } = report;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Issues Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (summary.total === 0) {
    console.log('✅ No issues found!\n');
    return;
  }

  // Summary
  console.log('📊 Summary');
  console.log(`   Total Issues: ${summary.total}`);
  console.log(`   ⚠️  Warnings: ${summary.bySeverity.warning || 0}`);
  console.log(`   ℹ️  Info: ${summary.bySeverity.info || 0}\n`);

  console.log('By Type:');
  if (summary.byType.task) console.log(`   📋 Tasks: ${summary.byType.task}`);
  if (summary.byType.orphan) console.log(`   👻 Orphans: ${summary.byType.orphan}`);
  if (summary.byType.term) console.log(`   📚 Terms: ${summary.byType.term}`);
  if (summary.byType.quality) console.log(`   ⭐ Quality: ${summary.byType.quality}`);
  console.log();

  // Print each category
  if (tasks.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Task Issues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    printIssueList(tasks, options);
  }

  if (orphans.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👻 Orphan Files');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    printIssueList(orphans, options);
  }

  if (terms.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 Term Issues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    printIssueList(terms, options);
  }

  if (quality.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⭐ Quality Issues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    printIssueList(quality, options);
  }
}

function printIssueList(issues: Issue[], options?: { verbose?: boolean }): void {
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const icon = issue.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';

    console.log(`${icon} ${issue.title}`);
    console.log(`   ${issue.description}`);

    if (issue.location) {
      console.log(`   📍 ${issue.location}`);
    }

    if (options?.verbose && issue.details) {
      for (const detail of issue.details) {
        console.log(`      - ${detail}`);
      }
    }

    console.log();
  }
}
