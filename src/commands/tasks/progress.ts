import { BaseCommand, CommandContext } from '../base.js';
import { listTasks, calculateProgress, printProgressDashboard } from '../../tools/tasks-list.js';

/**
 * Tasks progress command
 */
export class ProgressCommand extends BaseCommand {
  constructor() {
    super('progress', 'Show overall task progress');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    const tasks = await listTasks({ projectPath });
    const progress = calculateProgress(tasks);
    printProgressDashboard(progress);
  }
}
