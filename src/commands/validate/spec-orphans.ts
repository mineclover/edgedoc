import { BaseCommand, CommandContext } from '../base.js';
import { validateSpecOrphans } from '../../tools/spec-orphans.js';

/**
 * Spec orphan code validation command
 */
export class SpecOrphansCommand extends BaseCommand {
  constructor() {
    super('spec-orphans', 'Detect orphan code exports (undocumented exports)');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Detecting orphan exports in: ${projectPath}`);
    }

    const result = await validateSpecOrphans({
      projectPath,
    });

    if (result.orphanExports && result.orphanExports.length > 0) {
      process.exit(1);
    }
  }
}
