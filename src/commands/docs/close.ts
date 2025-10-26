import { BaseCommand, CommandContext } from '../base.js';
import { closeDetailsBlocks } from '../../tools/docs-toggle.js';

interface CloseOptions {
  index?: string;
  all?: boolean;
}

/**
 * Docs close command
 */
export class CloseCommand extends BaseCommand {
  constructor() {
    super('close', 'Close details blocks');
  }

  protected addCustomOptions(): void {
    this.command
      .argument('<file>', 'Markdown file path')
      .option('--index <indices...>', 'Block indices to close (space-separated)')
      .option('--all', 'Close all blocks', false);
  }

  protected async execute(
    context: CommandContext,
    options: CloseOptions
  ): Promise<void> {
    const filePath = this.command.args[0];

    if (!filePath) {
      console.error('❌ File path is required');
      process.exit(1);
    }

    const indices = options.index
      ? options.index.split(' ').map(Number).filter(n => !isNaN(n))
      : undefined;

    closeDetailsBlocks(filePath, {
      indices,
      all: options.all,
    });
  }
}
