#!/usr/bin/env node

import { Command } from 'commander';
import { createValidateCommand } from './commands/validate/index.js';
import { createGraphCommand } from './commands/graph/index.js';
import { createTermsCommand } from './commands/terms/index.js';
import { createTasksCommand } from './commands/tasks/index.js';
import { createDocsCommand } from './commands/docs/index.js';
import { initProject } from './tools/init.js';
import { syncCodeRefs } from './tools/sync.js';
import { EntryPointDetector } from './tools/entry-point-detector.js';
import { collectIssues, printIssuesReport } from './tools/issues.js';
import {
  findTestsForFeature,
  findDocForTest,
  generateCoverageReport,
  validateTestDocSync,
  printTestReference,
  printDocReference,
  printCoverageReport,
  printSyncValidation,
} from './tools/test-doc-lookup.js';
import {
  generateImplementationCoverage,
  printImplementationCoverage,
} from './tools/implementation-coverage.js';
import {
  collectSyntaxTerms,
  findSyntaxTerm,
  getSyntaxTermsByCategory,
} from './tools/syntax-manager.js';

const program = new Command();

program
  .name('edgedoc')
  .version('1.4.0')
  .description('Edge-based documentation validation and sync tool');

// ============================================================================
// Modular Commands (using new architecture)
// ============================================================================

program.addCommand(createValidateCommand());
program.addCommand(createGraphCommand());
program.addCommand(createTermsCommand());
program.addCommand(createTasksCommand());
program.addCommand(createDocsCommand());

// ============================================================================
// Legacy Commands (to be refactored in future)
// ============================================================================

/*
 * Note: The following commands use the old architecture and should be
 * refactored to use the new modular structure in future iterations.
 * For now, they are temporarily disabled to focus on core validation commands.
 */

// Init command
program
  .command('init')
  .description('Initialize project (create config and guides)')
  .option('-p, --project <path>', 'Project directory path', process.cwd())
  .option('-f, --force', 'Overwrite existing files')
  .action(async (options) => {
    try {
      const result = await initProject({
        projectPath: options.project,
        force: options.force,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync code references')
  .option('-p, --project <path>', 'Project directory path', process.cwd())
  .option('--dry-run', 'Show changes without applying')
  .action(async (options) => {
    try {
      const result = await syncCodeRefs({
        projectPath: options.project,
        dryRun: options.dryRun,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// TODO: Refactor these commands to use the new architecture
// Entry points, issues, test, impl-coverage, and syntax commands
// are temporarily disabled to focus on core validation commands

// ============================================================================
// Execute
// ============================================================================

program.parse();
