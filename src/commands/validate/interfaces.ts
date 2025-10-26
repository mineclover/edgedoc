import { BaseCommand, CommandContext } from '../base.js';
import { validateInterfaceLinks, printValidationResults } from '../../tools/validate-interface-links.js';

interface InterfacesOptions {
  feature?: string;
  namespace?: string;
}

/**
 * Interface links validation command
 */
export class InterfacesCommand extends BaseCommand {
  constructor() {
    super('interfaces', 'Validate interface bidirectional links & sibling coverage');
  }

  protected addCustomOptions(): void {
    this.command
      .option('-f, --feature <name>', 'Validate specific feature only')
      .option('-n, --namespace <name>', 'Validate specific namespace only');
  }

  protected async execute(
    context: CommandContext,
    options: InterfacesOptions
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating interface links in: ${projectPath}`);
    }

    const result = await validateInterfaceLinks(projectPath);

    printValidationResults(result, verbose);

    // Check if there are any issues
    const hasIssues = result.bidirectional.missingProviders.length > 0 ||
                     result.bidirectional.unusedInterfaces.length > 0 ||
                     result.incompleteCoverage.length > 0;

    if (hasIssues) {
      process.exit(1);
    }
  }
}
