import { BaseCommand, CommandContext } from '../base.js';
import { listTerms } from '../../tools/term-commands.js';

interface ListOptions {
  scope?: 'global' | 'document';
}

/**
 * Terms list command
 */
export class ListCommand extends BaseCommand {
  constructor() {
    super('list', 'List all term definitions');
  }

  protected addCustomOptions(): void {
    this.command
      .option('--scope <type>', 'Filter by scope (global|document)');
  }

  protected async execute(
    context: CommandContext,
    options: ListOptions
  ): Promise<void> {
    const { projectPath, verbose } = context;

    await listTerms({ projectPath });
  }
}
