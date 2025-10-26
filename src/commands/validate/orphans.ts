import { BaseCommand, CommandContext } from '../base.js';
import { validateOrphans } from '../../tools/orphans.js';

/**
 * Orphan files validation command
 */
export class OrphansCommand extends BaseCommand {
  constructor() {
    super('orphans', 'Detect orphan files (undocumented & unused)');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Detecting orphan files in: ${projectPath}`);
    }

    const result = await validateOrphans({
      projectPath,
    });

    if (result.orphans && result.orphans.length > 0) {
      process.exit(1);
    }
  }
}
