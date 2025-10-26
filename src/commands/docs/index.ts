import { Command } from 'commander';
import { ListCommand } from './list.js';
import { OpenCommand } from './open.js';
import { CloseCommand } from './close.js';

/**
 * Create docs command with all subcommands
 */
export function createDocsCommand(): Command {
  const docs = new Command('docs')
    .description('Documentation management commands');

  docs.addCommand(new ListCommand().getCommand());
  docs.addCommand(new OpenCommand().getCommand());
  docs.addCommand(new CloseCommand().getCommand());

  return docs;
}
