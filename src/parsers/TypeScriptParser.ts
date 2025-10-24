import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import type { ILanguageParser, ParseResult, ImportInfo, ExportInfo } from './ILanguageParser.js';

export class TypeScriptParser implements ILanguageParser {
  readonly supportedExtensions = ['ts', 'tsx', 'js', 'jsx'];
  readonly languageName = 'TypeScript';
  private parser: Parser;
  private language: any;

  constructor() {
    this.parser = new Parser();
    this.language = TypeScript.typescript;
    this.parser.setLanguage(this.language);
  }

  /**
   * Check if this parser can handle the given file
   */
  canParse(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Parse TypeScript/TSX source code
   */
  parse(sourceCode: string, filePath: string): ParseResult {
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    if (isTsx) {
      this.language = TypeScript.tsx;
      this.parser.setLanguage(this.language);
    } else {
      this.language = TypeScript.typescript;
      this.parser.setLanguage(this.language);
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

    // Query for import statements (using Parser.Query API)
    const queryString = `
      (import_statement
        source: (string) @source) @import
    `;

    const query = new Parser.Query(this.language, queryString);
    const captures = query.captures(tree.rootNode);

    // Group captures by import statement
    const importNodes = new Map<number, Parser.SyntaxNode>();
    const sourceNodes = new Map<number, Parser.SyntaxNode>();

    for (const capture of captures) {
      if (capture.name === 'import') {
        importNodes.set(capture.node.id, capture.node);
      } else if (capture.name === 'source') {
        // Find parent import_statement
        let parent = capture.node.parent;
        while (parent && parent.type !== 'import_statement') {
          parent = parent.parent;
        }
        if (parent) {
          sourceNodes.set(parent.id, capture.node);
        }
      }
    }

    for (const [nodeId, importNode] of importNodes) {
      const sourceNode = sourceNodes.get(nodeId);
      if (!sourceNode) continue;

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

    // Query for export statements (using Parser.Query API)
    const queryString = `
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
    `;

    const query = new Parser.Query(this.language, queryString);
    const captures = query.captures(tree.rootNode);

    // Group captures by export node
    const exportMap = new Map<number, { export?: Parser.SyntaxNode; name?: string; isDefault: boolean }>();

    for (const capture of captures) {
      if (capture.name === 'export' || capture.name === 'default_export') {
        const nodeId = capture.node.id;
        if (!exportMap.has(nodeId)) {
          exportMap.set(nodeId, { isDefault: capture.name === 'default_export' });
        }
        exportMap.get(nodeId)!.export = capture.node;
        exportMap.get(nodeId)!.isDefault = capture.name === 'default_export';
      } else if (capture.name === 'export_name') {
        // Find parent export_statement
        let parent = capture.node.parent;
        while (parent && parent.type !== 'export_statement') {
          parent = parent.parent;
        }
        if (parent) {
          const nodeId = parent.id;
          if (!exportMap.has(nodeId)) {
            exportMap.set(nodeId, { isDefault: false });
          }
          exportMap.get(nodeId)!.name = capture.node.text;
        }
      }
    }

    for (const entry of exportMap.values()) {
      if (!entry.export) continue;

      const name = entry.name || 'default';
      const type = this.inferExportType(entry.export.text);

      exports.push({
        name,
        type,
        isDefault: entry.isDefault,
        location: {
          line: entry.export.startPosition.row + 1,
          column: entry.export.startPosition.column,
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
    const namedQueryString = `
      (named_imports
        (import_specifier name: (identifier) @name))
    `;
    const namedQuery = new Parser.Query(this.language, namedQueryString);
    const namedCaptures = namedQuery.captures(importNode);
    for (const capture of namedCaptures) {
      if (capture.name === 'name') {
        names.push(capture.node.text);
      }
    }

    // Default import query
    const defaultQueryString = `
      (import_clause (identifier) @name)
    `;
    const defaultQuery = new Parser.Query(this.language, defaultQueryString);
    const defaultCaptures = defaultQuery.captures(importNode);
    for (const capture of defaultCaptures) {
      if (capture.name === 'name') {
        names.push(capture.node.text);
      }
    }

    // Namespace import (import * as Foo)
    const namespaceQueryString = `
      (namespace_import (identifier) @name)
    `;
    const namespaceQuery = new Parser.Query(this.language, namespaceQueryString);
    const namespaceCaptures = namespaceQuery.captures(importNode);
    for (const capture of namespaceCaptures) {
      if (capture.name === 'name') {
        names.push(capture.node.text);
      }
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
