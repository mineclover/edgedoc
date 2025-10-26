/**
 * Syntax Usage Tracking System
 *
 * @feature 19_SyntaxTermSystem - Phase 4
 * @doc tasks/features/19_SyntaxTermSystem.md
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SyntaxTerm, collectSyntaxTerms, findSyntaxTerm } from './syntax-manager.js';
import { loadConfig } from '../utils/config.js';
import { getDocsPath } from '../types/config.js';

/**
 * Syntax usage statistics
 */
export interface SyntaxUsageStats {
  term: string;
  termId: string;
  usageCount: number;
  files: Array<{
    file: string;
    count: number;
    lines: number[];
  }>;
  categories: {
    documentation: number;
    implementation: number;
    examples: number;
  };
}

/**
 * Syntax usage report
 */
export interface SyntaxUsageReport {
  generatedAt: string;
  terms: SyntaxUsageStats[];
  summary: {
    totalTerms: number;
    usedTerms: number;
    unusedTerms: number;
    totalUsages: number;
    averageUsagePerTerm: number;
  };
}

/**
 * Find usages of a specific syntax term in the project
 */
export function findUsagesInProject(
  termName: string,
  projectPath: string = process.cwd()
): SyntaxUsageStats {
  const term = findSyntaxTerm(termName, projectPath);
  if (!term) {
    throw new Error(`Syntax term not found: ${termName}`);
  }

  const usages = trackSyntaxReferences(term, projectPath);

  // Count by file
  const fileMap = new Map<string, { count: number; lines: number[] }>();
  for (const usage of usages) {
    if (!fileMap.has(usage.file)) {
      fileMap.set(usage.file, { count: 0, lines: [] });
    }
    const entry = fileMap.get(usage.file)!;
    entry.count++;
    entry.lines.push(usage.line);
  }

  return {
    term: term.name,
    termId: term.id,
    usageCount: usages.length,
    files: Array.from(fileMap.entries()).map(([file, data]) => ({
      file,
      ...data,
    })),
    categories: categorizeUsages(usages),
  };
}

/**
 * Track syntax references in project files
 */
export function trackSyntaxReferences(
  term: SyntaxTerm,
  projectPath: string = process.cwd()
): Array<{ file: string; line: number; context: string }> {
  const usages: Array<{ file: string; line: number; context: string }> = [];

  // Search in tasks/features/
  const config = loadConfig(projectPath);
  const featuresDir = join(projectPath, getDocsPath(config, 'features'));
  if (existsSync(featuresDir)) {
    const features = readdirSync(featuresDir)
      .filter(f => f.endsWith('.md'))
      .map(f => join(featuresDir, f));

    for (const filePath of features) {
      const matches = findTermPatterns(filePath, term);
      usages.push(...matches);
    }
  }

  // Search in docs/ (but not syntax examples)
  const docsDir = join(projectPath, 'docs');
  if (existsSync(docsDir)) {
    const docs = findMarkdownFilesRecursive(docsDir)
      .filter(f => !f.includes('syntax/examples'));

    for (const filePath of docs) {
      const matches = findTermPatterns(filePath, term);
      usages.push(...matches);
    }
  }

  return usages;
}

/**
 * Find term pattern matches in a file
 */
function findTermPatterns(
  filePath: string,
  term: SyntaxTerm
): Array<{ file: string; line: number; context: string }> {
  const matches: Array<{ file: string; line: number; context: string }> = [];

  if (!existsSync(filePath)) {
    return matches;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Search for patterns based on term type
    if (term.name.includes('Component')) {
      // Look for component definitions
      const componentRegex = /^(#+\s+)?(\d+\.\s+)?\*\*([A-Z][A-Za-z0-9_\s]+)\*\*\s+\(`([^`]+)`\)/;
      for (let i = 0; i < lines.length; i++) {
        if (componentRegex.test(lines[i])) {
          matches.push({
            file: filePath,
            line: i + 1,
            context: lines[i].trim(),
          });
        }
      }
    }

    // Look for explicit [[term]] references
    const termRefRegex = new RegExp(`\\[\\[${term.name}\\]\\]`, 'g');
    for (let i = 0; i < lines.length; i++) {
      if (termRefRegex.test(lines[i])) {
        matches.push({
          file: filePath,
          line: i + 1,
          context: lines[i].trim(),
        });
      }
    }
  } catch (error) {
    // Silently skip read errors
  }

  return matches;
}

/**
 * Categorize usages by type
 */
function categorizeUsages(
  usages: Array<{ file: string; line: number; context: string }>
): { documentation: number; implementation: number; examples: number } {
  let documentation = 0;
  let implementation = 0;
  let examples = 0;

  for (const usage of usages) {
    if (usage.file.includes('docs/syntax/examples')) {
      examples++;
    } else if (usage.file.includes('tasks/features')) {
      documentation++;
    } else if (usage.file.includes('src/')) {
      implementation++;
    }
  }

  return { documentation, implementation, examples };
}

/**
 * Generate usage report for all syntax terms
 */
export function generateUsageReport(
  projectPath: string = process.cwd()
): SyntaxUsageReport {
  const terms = collectSyntaxTerms(projectPath);
  const stats: SyntaxUsageStats[] = [];

  for (const term of terms) {
    const stat = findUsagesInProject(term.name, projectPath);
    stats.push(stat);
  }

  // Sort by usage count (most used first)
  stats.sort((a, b) => b.usageCount - a.usageCount);

  const usedTerms = stats.filter(s => s.usageCount > 0).length;
  const totalUsages = stats.reduce((sum, s) => sum + s.usageCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    terms: stats,
    summary: {
      totalTerms: terms.length,
      usedTerms,
      unusedTerms: terms.length - usedTerms,
      totalUsages,
      averageUsagePerTerm: totalUsages / Math.max(1, terms.length),
    },
  };
}

/**
 * Detect unused syntax terms
 */
export function detectUnusedSyntax(
  projectPath: string = process.cwd()
): string[] {
  const report = generateUsageReport(projectPath);
  return report.terms.filter(t => t.usageCount === 0).map(t => t.term);
}

/**
 * Generate and save INDEX.md for syntax terms
 */
export function generateSyntaxIndex(
  projectPath: string = process.cwd()
): string {
  const report = generateUsageReport(projectPath);
  const terms = collectSyntaxTerms(projectPath);

  let content = `# Syntax Terms Index

Generated: ${new Date().toLocaleString()}

## Summary

- **Total Terms**: ${report.summary.totalTerms}
- **Used Terms**: ${report.summary.usedTerms}
- **Unused Terms**: ${report.summary.unusedTerms}
- **Total Usages**: ${report.summary.totalUsages}
- **Average Usage per Term**: ${report.summary.averageUsagePerTerm.toFixed(1)}

## Terms by Category

`;

  // Group by category if available
  const categories = new Map<string, SyntaxUsageStats[]>();
  for (const stat of report.terms) {
    const term = findSyntaxTerm(stat.term, projectPath);
    const category = term?.type || 'Other';

    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(stat);
  }

  // Generate content for each category
  for (const [category, stats] of categories) {
    content += `### ${category} (${stats.length})\n\n`;

    for (const stat of stats) {
      const usageBar = generateUsageBar(stat.usageCount, report.summary.totalUsages);
      content += `- **${stat.term}** (${stat.termId})\n`;
      content += `  - Usages: ${stat.usageCount} ${usageBar}\n`;
      content += `  - Files: ${stat.files.length}\n`;
      content += `  - Categories: ${JSON.stringify(stat.categories)}\n\n`;
    }
  }

  // Add detailed section
  content += `## Detailed Usage Report\n\n`;
  for (const stat of report.terms) {
    if (stat.usageCount === 0) {
      content += `### ${stat.term} ⚠️ UNUSED\n\n`;
    } else {
      content += `### ${stat.term}\n\n`;
      content += `**Total Usages**: ${stat.usageCount}\n\n`;
      content += `**Usage by File**:\n\n`;

      for (const file of stat.files) {
        content += `- \`${file.file}\` (${file.count})\n`;
        for (const line of file.lines.slice(0, 3)) {
          content += `  - Line ${line}\n`;
        }
        if (file.lines.length > 3) {
          content += `  - ... and ${file.lines.length - 3} more\n`;
        }
      }
      content += '\n';
    }
  }

  // Write to file
  const indexPath = join(projectPath, 'docs', 'syntax', 'INDEX.md');
  writeFileSync(indexPath, content, 'utf-8');

  return content;
}

/**
 * Generate usage bar
 */
function generateUsageBar(usage: number, max: number): string {
  const percent = Math.round((usage / max) * 100);
  const barLength = 10;
  const filled = Math.round((usage / max) * barLength);
  const empty = barLength - filled;

  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Find markdown files recursively
 */
function findMarkdownFilesRecursive(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findMarkdownFilesRecursive(fullPath));
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Silently skip read errors
  }

  return files;
}

/**
 * Print usage statistics in a formatted way
 */
export function printUsageStats(stats: SyntaxUsageStats, verbose: boolean = false): void {
  console.log(`\n📊 ${stats.term}\n`);
  console.log(`  ID: ${stats.termId}`);
  console.log(`  Total Usages: ${stats.usageCount}`);

  console.log(`\n  By Category:`);
  console.log(`    Documentation: ${stats.categories.documentation}`);
  console.log(`    Implementation: ${stats.categories.implementation}`);
  console.log(`    Examples: ${stats.categories.examples}`);

  if (stats.files.length > 0 && verbose) {
    console.log(`\n  Files:`);
    for (const file of stats.files.slice(0, 5)) {
      console.log(`    ${file.file} (${file.count})`);
    }
    if (stats.files.length > 5) {
      console.log(`    ... and ${stats.files.length - 5} more files`);
    }
  }
}
