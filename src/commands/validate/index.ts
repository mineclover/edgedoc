import { Command } from 'commander';
import { MigrationCommand } from './migration.js';
import { NamingCommand } from './naming.js';
import { StructureCommand } from './structure.js';
import { OrphansCommand } from './orphans.js';
import { SpecOrphansCommand } from './spec-orphans.js';
import { InterfacesCommand } from './interfaces.js';
import { TermsValidateCommand } from './terms.js';

/**
 * Create validate command with all subcommands
 */
export function createValidateCommand(): Command {
  const validate = new Command('validate')
    .description('Validation commands');

  // Add subcommands
  validate.addCommand(new MigrationCommand().getCommand());
  validate.addCommand(new NamingCommand().getCommand());
  validate.addCommand(new StructureCommand().getCommand());
  validate.addCommand(new OrphansCommand().getCommand());
  validate.addCommand(new SpecOrphansCommand().getCommand());
  validate.addCommand(new InterfacesCommand().getCommand());
  validate.addCommand(new TermsValidateCommand().getCommand());

  return validate;
}
