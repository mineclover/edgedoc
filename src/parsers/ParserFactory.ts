import type { ILanguageParser } from './ILanguageParser.js';

/**
 * Factory for managing and retrieving language parsers
 */
export class ParserFactory {
  private static parsers: Map<string, ILanguageParser> = new Map();
  private static initialized = false;

  /**
   * Register a language parser
   * @param parser The parser to register
   */
  static register(parser: ILanguageParser): void {
    for (const ext of parser.supportedExtensions) {
      this.parsers.set(ext, parser);
    }
  }

  /**
   * Get a parser for the given file path
   * @param filePath The file path to find a parser for
   * @returns The parser, or null if no parser supports this file
   */
  static getParser(filePath: string): ILanguageParser | null {
    this.ensureInitialized();

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return this.parsers.get(ext) || null;
  }

  /**
   * Get all supported file extensions
   * @returns Array of supported extensions (without dots)
   */
  static getSupportedExtensions(): string[] {
    this.ensureInitialized();
    return Array.from(this.parsers.keys());
  }

  /**
   * Get all registered parsers
   * @returns Array of all registered parsers
   */
  static getAllParsers(): ILanguageParser[] {
    this.ensureInitialized();
    const uniqueParsers = new Map<string, ILanguageParser>();
    for (const parser of this.parsers.values()) {
      uniqueParsers.set(parser.languageName, parser);
    }
    return Array.from(uniqueParsers.values());
  }

  /**
   * Initialize parsers (lazy initialization)
   */
  private static ensureInitialized(): void {
    if (this.initialized) return;

    // Import and register parsers
    // Note: Dynamic imports are async, so we use sync requires for simplicity
    const TypeScriptParser = require('./TypeScriptParser.js').TypeScriptParser;
    const PythonParser = require('./PythonParser.js').PythonParser;

    this.register(new TypeScriptParser());
    this.register(new PythonParser());

    this.initialized = true;
  }

  /**
   * Reset the factory (mainly for testing)
   */
  static reset(): void {
    this.parsers.clear();
    this.initialized = false;
  }
}
