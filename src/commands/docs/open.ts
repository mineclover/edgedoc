import { BaseCommand, CommandContext } from '../base.js';
import { openDetailsBlocks } from '../../tools/docs-toggle.js';

interface OpenOptions {
  index?: string;
  all?: boolean;
}

/**
 * Docs open command
 */
export class OpenCommand extends BaseCommand {
  constructor() {
    super('open', 'Open details blocks');
  }

  protected addCustomOptions(): void {
    this.command
      .argument('<file>', 'Markdown file path')
      .option('--index <indices...>', 'Block indices to open (space-separated)')
      .option('--all', 'Open all blocks', false);
  }

  protected async execute(
    context: CommandContext,
    options: OpenOptions
  ): Promise<void> {
    const filePath = this.command.args[0];

    if (!filePath) {
      console.error('❌ File path is required');
      process.exit(1);
    }

    const indices = options.index
      ? options.index.split(' ').map(Number).filter(n => !isNaN(n))
      : undefined;

    openDetailsBlocks(filePath, {
      indices,
      all: options.all,
    });
  }
}
