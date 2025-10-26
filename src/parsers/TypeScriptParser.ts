import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import type { ILanguageParser, ParseResult, ImportInfo, ExportInfo } from './ILanguageParser.js';

export class TypeScriptParser implements ILanguageParser {
  readonly supportedExtensions = ['ts', 'tsx', 'js', 'jsx'];
  readonly languageName = 'TypeScript';
  private typescriptParser: Parser;
  private tsxParser: Parser;

  constructor() {
    // Create separate parser instances for TypeScript and TSX to avoid race conditions
    this.typescriptParser = new Parser();
    this.typescriptParser.setLanguage(TypeScript.typescript as any);

    this.tsxParser = new Parser();
    this.tsxParser.setLanguage(TypeScript.tsx as any);
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
    try {
      const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
      const parser = isTsx ? this.tsxParser : this.typescriptParser;
      const tree = parser.parse(sourceCode);

      return {
        imports: this.extractImports(tree, sourceCode, isTsx),
        exports: this.extractExports(tree, sourceCode, isTsx),
      };
    } catch (error) {
      // If parsing fails, return empty results
      // This can happen with syntax errors or malformed code
      console.warn(`Failed to parse ${filePath}:`, error instanceof Error ? error.message : String(error));
      return {
        imports: [],
        exports: [],
      };
    }
  }

  /**
   * Extract all imports using Tree-sitter query
   */
  private extractImports(tree: Parser.Tree, sourceCode: string, isTsx: boolean): ImportInfo[] {
    const imports: ImportInfo[] = [];

    try {
      // Query for import statements (using Parser.Query API)
      const queryString = `
        (import_statement
          source: (string) @source) @import
      `;

      const language = (isTsx ? TypeScript.tsx : TypeScript.typescript) as any;
      const query = new Parser.Query(language, queryString);
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
        const names = this.extractImportNames(importNode, sourceCode, isTsx);
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
    } catch (error) {
      // Query parsing failed, return empty imports
      console.warn('Failed to extract imports:', error instanceof Error ? error.message : String(error));
    }

    return imports;
  }

  /**
   * Extract export declarations using Tree-sitter query
   */
  private extractExports(tree: Parser.Tree, sourceCode: string, isTsx: boolean): ExportInfo[] {
    const exports: ExportInfo[] = [];

    try {
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

      const language = (isTsx ? TypeScript.tsx : TypeScript.typescript) as any;
      const query = new Parser.Query(language, queryString);
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
    } catch (error) {
      // Query parsing failed, return empty exports
      console.warn('Failed to extract exports:', error instanceof Error ? error.message : String(error));
    }

    return exports;
  }

  /**
   * Extract import names from import statement
   */
  private extractImportNames(importNode: Parser.SyntaxNode, sourceCode: string, isTsx: boolean): string[] {
    const names: string[] = [];

    try {
      const language = (isTsx ? TypeScript.tsx : TypeScript.typescript) as any;

      // Named imports query
      const namedQueryString = `
        (named_imports
          (import_specifier name: (identifier) @name))
      `;
      const namedQuery = new Parser.Query(language, namedQueryString);
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
      const defaultQuery = new Parser.Query(language, defaultQueryString);
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
      const namespaceQuery = new Parser.Query(language, namespaceQueryString);
      const namespaceCaptures = namespaceQuery.captures(importNode);
      for (const capture of namespaceCaptures) {
        if (capture.name === 'name') {
          names.push(capture.node.text);
        }
      }
    } catch (error) {
      // Query parsing failed, return empty names list
      console.warn('Failed to extract import names:', error instanceof Error ? error.message : String(error));
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
