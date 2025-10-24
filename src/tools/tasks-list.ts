import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findMarkdownFiles } from '../shared/utils.js';

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
