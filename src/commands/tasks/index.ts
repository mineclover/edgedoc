import { Command } from 'commander';
import { ListCommand } from './list.js';
import { GetCommand } from './get.js';
import { ProgressCommand } from './progress.js';

/**
 * Create tasks command with all subcommands
 */
export function createTasksCommand(): Command {
  const tasks = new Command('tasks')
    .description('Task management commands');

  tasks.addCommand(new ListCommand().getCommand());
  tasks.addCommand(new GetCommand().getCommand());
  tasks.addCommand(new ProgressCommand().getCommand());

  return tasks;
}
