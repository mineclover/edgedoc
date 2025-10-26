import { BaseCommand, CommandContext } from '../base.js';
import {
  listTasks,
  printTasksList,
  getTasksByCode,
  getTasksByInterface,
  getTasksByTerm,
  printTasksForReference,
  filterIncompleteTasks,
} from '../../tools/tasks-list.js';

interface ListOptions {
  code?: string;
  interface?: string;
  term?: string;
  incomplete?: boolean;
}

/**
 * Tasks list command
 */
export class ListCommand extends BaseCommand {
  constructor() {
    super('list', 'List all feature tasks');
  }

  protected addCustomOptions(): void {
    this.command
      .option('--code <path>', 'Filter by code file reference')
      .option('--interface <name>', 'Filter by interface')
      .option('--term <name>', 'Filter by term')
      .option('--incomplete', 'Show only incomplete tasks', false);
  }

  protected async execute(
    context: CommandContext,
    options: ListOptions
  ): Promise<void> {
    const { projectPath, verbose } = context;

    // Filter by reference
    if (options.code) {
      const result = await getTasksByCode(projectPath, options.code);
      const filtered = options.incomplete ? filterIncompleteTasks(result.tasks) : result.tasks;
      printTasksForReference('code', options.code, result.featureIds, filtered);
      return;
    }

    if (options.interface) {
      const result = await getTasksByInterface(projectPath, options.interface);
      const filtered = options.incomplete ? filterIncompleteTasks(result.tasks) : result.tasks;
      printTasksForReference('interface', options.interface, result.featureIds, filtered);
      return;
    }

    if (options.term) {
      const result = await getTasksByTerm(projectPath, options.term);
      const filtered = options.incomplete ? filterIncompleteTasks(result.tasks) : result.tasks;
      printTasksForReference('term', options.term, result.featureIds, filtered);
      return;
    }

    // List all
    const tasks = await listTasks({ projectPath });
    const filtered = options.incomplete ? filterIncompleteTasks(tasks) : tasks;
    printTasksList(filtered);
  }
}
