import { BaseCommand, CommandContext } from '../base.js';
import { validateStructure } from '../../tools/structure.js';

/**
 * Structure validation command
 */
export class StructureCommand extends BaseCommand {
  constructor() {
    super('structure', 'Validate task structure (circular deps, frontmatter, etc)');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating structure in: ${projectPath}`);
    }

    const result = await validateStructure({
      projectPath,
    });

    if (!result.success) {
      process.exit(1);
    }
  }
}
