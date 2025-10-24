import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

export interface ImportInfo {
  source: string;
  names: string[];
  isTypeOnly: boolean;
  location: { line: number; column: number };
}

export interface ExportInfo {
  name: string;
  type: 'interface' | 'type' | 'class' | 'function' | 'const';
  isDefault: boolean;
  location: { line: number; column: number };
}

export interface ParseResult {
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export class TypeScriptParser {
  private parser: Parser;
  private language: any;

  constructor() {
    this.parser = new Parser();
    this.language = TypeScript.typescript;
    this.parser.setLanguage(this.language);
  }

  /**
   * Parse TypeScript/TSX source code
   */
  parse(sourceCode: string, isTsx = false): ParseResult {
    if (isTsx) {
      this.parser.setLanguage(TypeScript.tsx);
    } else {
      this.parser.setLanguage(TypeScript.typescript);
    }

    const tree = this.parser.parse(sourceCode);

    return {
      imports: this.extractImports(tree, sourceCode),
      exports: this.extractExports(tree, sourceCode),
    };
  }

  /**
   * Extract all imports using Tree-sitter query
   */
  private extractImports(tree: Parser.Tree, sourceCode: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // Query for import statements
    const query = this.language.query(`
      (import_statement
        source: (string) @source) @import
    `);

    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      const importNode = match.captures.find((c) => c.name === 'import')?.node;
      const sourceNode = match.captures.find((c) => c.name === 'source')?.node;

      if (!importNode || !sourceNode) continue;

      const source = this.extractStringValue(sourceNode.text);
      const names = this.extractImportNames(importNode, sourceCode);
      const isTypeOnly = importNode.text.includes('import type');

      imports.push({
        source,
        names,
        isTypeOnly,
        location: {
          line: importNode.startPosition.row + 1,
          column: importNode.startPosition.column,
        },
      });
    }

    return imports;
  }

  /**
   * Extract export declarations using Tree-sitter query
   */
  private extractExports(tree: Parser.Tree, sourceCode: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // Query for export statements
    const query = this.language.query(`
      [
        ; Named exports
        (export_statement
          declaration: [
            (class_declaration name: (type_identifier) @export_name)
            (function_declaration name: (identifier) @export_name)
            (interface_declaration name: (type_identifier) @export_name)
            (type_alias_declaration name: (type_identifier) @export_name)
            (lexical_declaration
              (variable_declarator name: (identifier) @export_name))
          ]) @export

        ; Export clause (export { A, B })
        (export_statement
          (export_clause
            (export_specifier name: (identifier) @export_name))) @export

        ; Default exports
        (export_statement
          "default"
          [
            (class_declaration name: (type_identifier)? @export_name)
            (function_declaration name: (identifier)? @export_name)
            (identifier) @export_name
          ]) @default_export
      ]
    `);

    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      const exportNode = match.captures.find(
        (c) => c.name === 'export' || c.name === 'default_export'
      )?.node;
      const nameNode = match.captures.find((c) => c.name === 'export_name')?.node;

      if (!exportNode) continue;

      const name = nameNode?.text || 'default';
      const type = this.inferExportType(exportNode.text);
      const isDefault = match.captures.some((c) => c.name === 'default_export');

      exports.push({
        name,
        type,
        isDefault,
        location: {
          line: exportNode.startPosition.row + 1,
          column: exportNode.startPosition.column,
        },
      });
    }

    return exports;
  }

  /**
   * Extract import names from import statement
   */
  private extractImportNames(importNode: Parser.SyntaxNode, sourceCode: string): string[] {
    const names: string[] = [];

    // Named imports query
    const namedQuery = this.language.query(`
      (named_imports
        (import_specifier name: (identifier) @name))
    `);

    const namedMatches = namedQuery.matches(importNode);
    for (const match of namedMatches) {
      const nameNodes = match.captures.filter((c) => c.name === 'name');
      names.push(...nameNodes.map((n) => n.node.text));
    }

    // Default import query
    const defaultQuery = this.language.query(`
      (import_clause (identifier) @name)
    `);

    const defaultMatches = defaultQuery.matches(importNode);
    for (const match of defaultMatches) {
      const nameNodes = match.captures.filter((c) => c.name === 'name');
      names.push(...nameNodes.map((n) => n.node.text));
    }

    // Namespace import (import * as Foo)
    const namespaceQuery = this.language.query(`
      (namespace_import (identifier) @name)
    `);

    const namespaceMatches = namespaceQuery.matches(importNode);
    for (const match of namespaceMatches) {
      const nameNodes = match.captures.filter((c) => c.name === 'name');
      names.push(...nameNodes.map((n) => n.node.text));
    }

    return names;
  }

  /**
   * Infer export type from declaration text
   */
  private inferExportType(text: string): ExportInfo['type'] {
    if (text.includes('interface ')) return 'interface';
    if (text.includes('type ') && text.includes('=')) return 'type';
    if (text.includes('class ')) return 'class';
    if (text.includes('function ')) return 'function';
    return 'const';
  }

  /**
   * Extract string value from quoted string node
   */
  private extractStringValue(text: string): string {
    return text.slice(1, -1); // Remove quotes
  }
}
