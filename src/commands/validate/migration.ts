import { BaseCommand, CommandContext } from '../base.js';
import { validateMigration } from '../../tools/validate.js';

interface MigrationOptions {
  markdown?: boolean;
}

/**
 * Migration validation command
 */
export class MigrationCommand extends BaseCommand {
  constructor() {
    super('migration', 'Validate migration progress (tasks → tasks-v2)');
  }

  protected addCustomOptions(): void {
    this.command.option('-m, --markdown', 'Generate markdown report', false);
  }

  protected async execute(
    context: CommandContext,
    options: MigrationOptions
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating migration in: ${projectPath}`);
    }

    const result = await validateMigration({
      projectPath,
      markdown: options.markdown,
    });

    if (!result.success) {
      process.exit(1);
    }
  }
}
