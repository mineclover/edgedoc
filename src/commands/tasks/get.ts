import { BaseCommand, CommandContext } from '../base.js';
import { listTasks, getTaskDetails } from '../../tools/tasks-list.js';

/**
 * Tasks get command
 */
export class GetCommand extends BaseCommand {
  constructor() {
    super('get', 'Get task details');
  }

  protected addCustomOptions(): void {
    this.command.argument('<feature>', 'Feature name');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;
    const featureName = this.command.args[0];

    if (!featureName) {
      console.error('❌ Feature name is required');
      process.exit(1);
    }

    const tasks = await listTasks({ projectPath });
    const task = getTaskDetails(tasks, featureName);

    if (!task) {
      console.error(`❌ Task not found: ${featureName}`);
      process.exit(1);
    }

    console.log(`\n📋 Task: ${task.feature}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Priority: ${task.priority || 'none'}`);
    console.log(`   Progress: ${task.checkboxes.progress}% (${task.checkboxes.checked}/${task.checkboxes.total})`);
    if (task.title) {
      console.log(`   Title: ${task.title}`);
    }
    console.log(`   File: ${task.file}`);
  }
}
