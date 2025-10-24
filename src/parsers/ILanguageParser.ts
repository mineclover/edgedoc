/**
 * Common interface for all language parsers
 */
export interface ILanguageParser {
  /** List of file extensions this parser supports (without dot) */
  readonly supportedExtensions: string[];

  /** Human-readable language name */
  readonly languageName: string;

  /**
   * Parse source code and extract imports/exports
   * @param sourceCode The source code to parse
   * @param filePath The file path (used for determining language variant like TSX)
   * @returns Parse result with imports and exports
   */
  parse(sourceCode: string, filePath: string): ParseResult;

  /**
   * Check if this parser can handle the given file
   * @param filePath The file path to check
   * @returns True if this parser supports the file
   */
  canParse(filePath: string): boolean;
}

/**
 * Result of parsing a source file
 */
export interface ParseResult {
  imports: ImportInfo[];
  exports: ExportInfo[];
}

/**
 * Information about an import statement
 */
export interface ImportInfo {
  /** The module/package being imported */
  source: string;

  /** Names being imported (e.g., ['A', 'B'] from 'import { A, B }') */
  names: string[];

  /** Whether this is a type-only import (TypeScript specific) */
  isTypeOnly?: boolean;

  /** Location in source file */
  location: { line: number; column: number };
}

/**
 * Information about an export declaration
 */
export interface ExportInfo {
  /** The name of the exported symbol */
  name: string;

  /** The type of the exported symbol */
  type: 'interface' | 'type' | 'class' | 'function' | 'const' | 'variable';

  /** Whether this is a default export */
  isDefault: boolean;

  /** Location in source file */
  location: { line: number; column: number };
}
