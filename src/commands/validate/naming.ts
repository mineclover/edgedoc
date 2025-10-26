import { BaseCommand, CommandContext } from '../base.js';
import { validateNaming } from '../../tools/naming.js';

/**
 * Naming convention validation command
 */
export class NamingCommand extends BaseCommand {
  constructor() {
    super('naming', 'Validate interface & shared type naming conventions');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating naming conventions in: ${projectPath}`);
    }

    const result = await validateNaming({
      projectPath,
    });

    if (!result.success) {
      process.exit(1);
    }
  }
}
