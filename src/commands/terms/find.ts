import { BaseCommand, CommandContext } from '../base.js';
import { findTerm } from '../../tools/term-commands.js';

/**
 * Terms find command
 */
export class FindCommand extends BaseCommand {
  constructor() {
    super('find', 'Find term definition and usage');
  }

  protected addCustomOptions(): void {
    this.command.argument('<term>', 'Term name to find');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;
    const termName = this.command.args[0];

    if (!termName) {
      console.error('❌ Term name is required');
      process.exit(1);
    }

    await findTerm(termName, { projectPath });
  }
}
