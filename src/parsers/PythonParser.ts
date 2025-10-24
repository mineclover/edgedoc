import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import type { ILanguageParser, ParseResult, ImportInfo, ExportInfo } from './ILanguageParser.js';

/**
 * Parser for Python source files
 *
 * Python has a different module system compared to TypeScript:
 * - Imports: `import module`, `from module import name`
 * - Exports: Python doesn't have explicit exports. Instead, all top-level
 *   definitions (functions, classes, variables) are implicitly exported.
 *   Convention: names starting with _ are considered private.
 */
export class PythonParser implements ILanguageParser {
  readonly supportedExtensions = ['py'];
  readonly languageName = 'Python';

  private parser: Parser;
  private language: any;

  constructor() {
    this.parser = new Parser();
    this.language = Python;
    this.parser.setLanguage(this.language);
  }

  /**
   * Check if this parser can handle the given file
   */
  canParse(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.py');
  }

  /**
   * Parse Python source code
   */
  parse(sourceCode: string, filePath: string): ParseResult {
    const tree = this.parser.parse(sourceCode);

    return {
      imports: this.extractImports(tree),
      exports: this.extractExports(tree),
    };
  }

  /**
   * Extract import statements
   *
   * Handles:
   * - import module
   * - import module as alias
   * - from module import name
   * - from module import name as alias
   * - from module import *
   */
  private extractImports(tree: Parser.Tree): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // Query for both import and from...import statements
    const queryString = `
      [
        ; import module
        ; import module as alias
        (import_statement
          name: (dotted_name) @module)

        ; from module import name
        (import_from_statement
          module_name: (dotted_name) @module)

        ; from . import name (relative import)
        (import_from_statement
          module_name: (relative_import) @module)
      ]
    `;

    const query = new Parser.Query(this.language, queryString);
    const captures = query.captures(tree.rootNode);

    const processedImports = new Set<string>();

    for (const capture of captures) {
      if (capture.name === 'module') {
        const moduleName = capture.node.text;
        const importKey = `${moduleName}-${capture.node.startPosition.row}`;

        // Avoid duplicates from the same line
        if (processedImports.has(importKey)) {
          continue;
        }
        processedImports.add(importKey);

        // Extract imported names for from...import statements
        const names = this.extractImportNames(capture.node.parent!);

        imports.push({
          source: moduleName,
          names,
          location: {
            line: capture.node.startPosition.row + 1,
            column: capture.node.startPosition.column,
          },
        });
      }
    }

    return imports;
  }

  /**
   * Extract names from import statement
   */
  private extractImportNames(importNode: Parser.SyntaxNode): string[] {
    const names: string[] = [];

    // For from...import statements, extract the imported names
    if (importNode.type === 'import_from_statement') {
      const queryString = `
        (import_from_statement
          (dotted_name) @name)
      `;

      const query = new Parser.Query(this.language, queryString);
      const captures = query.captures(importNode);

      for (const capture of captures) {
        if (capture.name === 'name' && capture.node.parent?.type !== 'module_name') {
          names.push(capture.node.text);
        }
      }

      // Also check for wildcard imports
      if (importNode.text.includes('import *')) {
        names.push('*');
      }
    }

    return names;
  }

  /**
   * Extract top-level definitions (implicit exports)
   *
   * In Python, all top-level definitions are implicitly exported unless:
   * - The name starts with _ (convention for private)
   * - The module defines __all__ (explicit export list)
   *
   * This parser extracts:
   * - Function definitions (def)
   * - Class definitions (class)
   * - Top-level variable assignments
   */
  private extractExports(tree: Parser.Tree): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // Walk the tree to find top-level definitions
    const cursor = tree.walk();

    // Navigate to module node
    if (cursor.nodeType !== 'module') {
      return exports;
    }

    // Iterate through top-level children
    cursor.gotoFirstChild();

    do {
      const node = cursor.currentNode;

      if (node.type === 'function_definition') {
        const name = this.extractFunctionName(node);
        if (name && !name.startsWith('_')) {
          exports.push({
            name,
            type: 'function',
            isDefault: false,
            location: {
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
            },
          });
        }
      } else if (node.type === 'class_definition') {
        const name = this.extractClassName(node);
        if (name && !name.startsWith('_')) {
          exports.push({
            name,
            type: 'class',
            isDefault: false,
            location: {
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
            },
          });
        }
      } else if (node.type === 'expression_statement') {
        // Check if it's an assignment
        const assignment = node.firstChild;
        if (assignment && assignment.type === 'assignment') {
          const left = assignment.childForFieldName('left');
          if (left && left.type === 'identifier') {
            const name = left.text;
            if (!name.startsWith('_')) {
              exports.push({
                name,
                type: 'variable',
                isDefault: false,
                location: {
                  line: node.startPosition.row + 1,
                  column: node.startPosition.column,
                },
              });
            }
          }
        }
      }
    } while (cursor.gotoNextSibling());

    return exports;
  }

  /**
   * Extract function name from function_definition node
   */
  private extractFunctionName(node: Parser.SyntaxNode): string | null {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : null;
  }

  /**
   * Extract class name from class_definition node
   */
  private extractClassName(node: Parser.SyntaxNode): string | null {
    const nameNode = node.childForFieldName('name');
    return nameNode ? nameNode.text : null;
  }

}
