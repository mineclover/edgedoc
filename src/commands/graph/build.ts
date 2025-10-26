import { BaseCommand, CommandContext } from '../base.js';
import { buildReferenceIndex } from '../../tools/build-reference-index.js';

interface BuildOptions {
  output?: string;
  symbols?: boolean;
}

/**
 * Graph build command
 */
export class BuildCommand extends BaseCommand {
  constructor() {
    super('build', 'Build reference index');
  }

  protected addCustomOptions(): void {
    this.command
      .option('-o, --output <path>', 'Output path', '.edgedoc/references.json')
      .option('--symbols', 'Include symbol information', false);
  }

  protected async execute(
    context: CommandContext,
    options: BuildOptions
  ): Promise<void> {
    const { projectPath, verbose } = context;

    const result = await buildReferenceIndex({
      projectPath,
      outputPath: options.output || '.edgedoc/references.json',
      includeSymbols: options.symbols,
      verbose,
    });

    if (verbose) {
      console.log(`\n✅ Index built: ${Object.keys(result.index.features).length} features, ${Object.keys(result.index.code).length} code files`);
    }
  }
}
