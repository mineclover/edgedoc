import { Command } from 'commander';
import { ListCommand } from './list.js';
import { FindCommand } from './find.js';
import { TermsValidateCommand } from '../validate/terms.js';

/**
 * Create terms command with all subcommands
 */
export function createTermsCommand(): Command {
  const terms = new Command('terms')
    .description('Term management commands');

  terms.addCommand(new ListCommand().getCommand());
  terms.addCommand(new FindCommand().getCommand());
  terms.addCommand(new TermsValidateCommand().getCommand());

  return terms;
}
