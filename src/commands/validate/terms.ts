import { BaseCommand, CommandContext } from '../base.js';
import { validateTerms } from '../../tools/validate-terms.js';

/**
 * Terms validation command
 */
export class TermsValidateCommand extends BaseCommand {
  constructor() {
    super('terms', 'Validate term definitions and references');
  }

  protected async execute(
    context: CommandContext,
    options: any
  ): Promise<void> {
    const { projectPath, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating terms in: ${projectPath}`);
    }

    const result = await validateTerms({
      projectPath,
    });

    if (!result.success) {
      process.exit(1);
    }
  }
}
