import { BaseCommand, CommandContext } from '../base.js';
import { queryGraph } from '../../tools/graph-query.js';

interface QueryOptions {
  code?: string;
  term?: string;
  interface?: string;
}

/**
 * Graph query command
 */
export class QueryCommand extends BaseCommand {
  constructor() {
    super('query', 'Query reference index');
  }

  protected addCustomOptions(): void {
    this.command
      .argument('[feature]', 'Feature name to query')
      .option('--code <path>', 'Query by code file path')
      .option('--term <name>', 'Query by term name')
      .option('--interface <name>', 'Query by interface name');
  }

  protected async execute(
    context: CommandContext,
    options: QueryOptions & { args?: string[] }
  ): Promise<void> {
    const { projectPath, verbose } = context;
    const featureName = this.command.args[0];

    await queryGraph({
      projectPath,
      featureId: featureName,
      codeFile: options.code,
      term: options.term,
    });
  }
}
