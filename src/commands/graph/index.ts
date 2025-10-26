import { Command } from 'commander';
import { BuildCommand } from './build.js';
import { QueryCommand } from './query.js';

/**
 * Create graph command with all subcommands
 */
export function createGraphCommand(): Command {
  const graph = new Command('graph')
    .description('Reference graph commands');

  graph.addCommand(new BuildCommand().getCommand());
  graph.addCommand(new QueryCommand().getCommand());

  return graph;
}
