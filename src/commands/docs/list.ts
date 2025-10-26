import { BaseCommand, CommandContext } from '../base.js';
import { listDetailsBlocks, printDetailsBlocks } from '../../tools/docs-toggle.js';

/**
 * Docs list command
 */
export class ListCommand extends BaseCommand {
  constructor() {
    super('list', 'List details blocks in a markdown file');
  }

  protected addCustomOptions(): void {
    this.command.argument('<file>', 'Markdown file path');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const filePath = this.command.args[0];

    if (!filePath) {
      console.error('❌ File path is required');
      process.exit(1);
    }

    const blocks = listDetailsBlocks(filePath);
    printDetailsBlocks(filePath, blocks);
  }
}
