# Language Extension Guide

This guide explains how to add support for new programming languages to edgedoc's parser system.

## Overview

edgedoc uses Tree-sitter based parsers to extract imports and exports from source code. The parser system is designed to be extensible, making it straightforward to add support for new languages.

## Architecture

### Core Components

1. **ILanguageParser Interface** (`src/parsers/ILanguageParser.ts`)
   - Common interface that all language parsers must implement
   - Defines `parse()`, `canParse()`, and metadata methods

2. **ParserFactory** (`src/parsers/ParserFactory.ts`)
   - Central registry for all language parsers
   - Automatically maps file extensions to parsers
   - Lazy initialization of parsers

3. **Language-specific Parsers**
   - `TypeScriptParser` - Handles .ts, .tsx, .js, .jsx
   - `PythonParser` - Handles .py

## Adding a New Language

### Step 1: Install Tree-sitter Grammar

First, install the Tree-sitter grammar package for your target language:

```bash
bun add tree-sitter-{language}
```

For example:
- `tree-sitter-rust` for Rust
- `tree-sitter-go` for Go
- `tree-sitter-java` for Java

### Step 2: Create Parser Class

Create a new file `src/parsers/{Language}Parser.ts`:

```typescript
import Parser from 'tree-sitter';
import Language from 'tree-sitter-{language}';
import type { ILanguageParser, ParseResult, ImportInfo, ExportInfo } from './ILanguageParser.js';

export class {Language}Parser implements ILanguageParser {
  readonly supportedExtensions = ['ext1', 'ext2'];  // e.g., ['rs'] for Rust
  readonly languageName = '{Language}';

  private parser: Parser;
  private language: any;

  constructor() {
    this.parser = new Parser();
    this.language = Language;
    this.parser.setLanguage(this.language);
  }

  canParse(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return this.supportedExtensions.includes(ext);
  }

  parse(sourceCode: string, filePath: string): ParseResult {
    const tree = this.parser.parse(sourceCode);

    return {
      imports: this.extractImports(tree),
      exports: this.extractExports(tree),
    };
  }

  private extractImports(tree: Parser.Tree): ImportInfo[] {
    // Implement import extraction logic using Tree-sitter queries
    // See language-specific examples below
  }

  private extractExports(tree: Parser.Tree): ExportInfo[] {
    // Implement export extraction logic
    // See language-specific examples below
  }
}
```

### Step 3: Register Parser in Factory

Edit `src/parsers/ParserFactory.ts` and add your parser to `ensureInitialized()`:

```typescript
private static ensureInitialized(): void {
  if (this.initialized) return;

  const TypeScriptParser = require('./TypeScriptParser.js').TypeScriptParser;
  const PythonParser = require('./PythonParser.js').PythonParser;
  const {Language}Parser = require('./{Language}Parser.js').{Language}Parser;  // Add this

  this.register(new TypeScriptParser());
  this.register(new PythonParser());
  this.register(new {Language}Parser());  // Add this

  this.initialized = true;
}
```

### Step 4: Add Tests

Create or update test file `tests/manual/tree-sitter-parser.test.ts`:

```typescript
import { {Language}Parser } from '../../src/parsers/{Language}Parser.js';

const {lang}Parser = new {Language}Parser();

// Test imports
console.log('Test X: {Language} Imports');
const {lang}Imports = `
// Add sample code with imports
`;

const resultX = {lang}Parser.parse({lang}Imports, 'test.{ext}');
console.log('  Imports found:', resultX.imports.length);
if (resultX.imports.length !== EXPECTED_COUNT) {
  throw new Error(`Expected ${EXPECTED_COUNT} imports, found ${resultX.imports.length}`);
}
console.log('  ✅ Passed\n');
```

### Step 5: Update Dependencies

Add the language to package.json's `trustedDependencies`:

```json
{
  "trustedDependencies": [
    "tree-sitter",
    "tree-sitter-typescript",
    "tree-sitter-python",
    "tree-sitter-{language}"
  ]
}
```

## Language-Specific Implementation Examples

### Example 1: Rust Parser

Rust uses `use` statements for imports and `pub` for exports:

```typescript
private extractImports(tree: Parser.Tree): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // Query for use declarations
  const queryString = `
    [
      (use_declaration
        argument: (scoped_identifier) @module)
      (use_declaration
        argument: (identifier) @module)
    ]
  `;

  const query = new Parser.Query(this.language, queryString);
  const captures = query.captures(tree.rootNode);

  for (const capture of captures) {
    if (capture.name === 'module') {
      imports.push({
        source: capture.node.text,
        names: [],
        location: {
          line: capture.node.startPosition.row + 1,
          column: capture.node.startPosition.column,
        },
      });
    }
  }

  return imports;
}

private extractExports(tree: Parser.Tree): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // Query for pub items
  const queryString = `
    [
      (function_item
        (visibility_modifier) @pub
        name: (identifier) @name)
      (struct_item
        (visibility_modifier) @pub
        name: (type_identifier) @name)
    ]
  `;

  const query = new Parser.Query(this.language, queryString);
  const captures = query.captures(tree.rootNode);

  // Process captures and build export list
  // ...

  return exports;
}
```

### Example 2: Go Parser

Go uses `import` statements and capitalized names for exports:

```typescript
private extractImports(tree: Parser.Tree): ImportInfo[] {
  const imports: ImportInfo[] = [];

  const queryString = `
    (import_declaration
      (import_spec
        path: (interpreted_string_literal) @path))
  `;

  const query = new Parser.Query(this.language, queryString);
  const captures = query.captures(tree.rootNode);

  for (const capture of captures) {
    if (capture.name === 'path') {
      // Remove quotes from string literal
      const path = capture.node.text.slice(1, -1);
      imports.push({
        source: path,
        names: [],
        location: {
          line: capture.node.startPosition.row + 1,
          column: capture.node.startPosition.column,
        },
      });
    }
  }

  return imports;
}

private extractExports(tree: Parser.Tree): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // In Go, exported names start with uppercase
  const queryString = `
    [
      (function_declaration
        name: (identifier) @name)
      (type_declaration
        (type_spec
          name: (type_identifier) @name))
    ]
  `;

  const query = new Parser.Query(this.language, queryString);
  const captures = query.captures(tree.rootNode);

  for (const capture of captures) {
    if (capture.name === 'name') {
      const name = capture.node.text;
      // Only exported if starts with uppercase
      if (name[0] === name[0].toUpperCase()) {
        exports.push({
          name,
          type: this.inferType(capture.node.parent),
          isDefault: false,
          location: {
            line: capture.node.startPosition.row + 1,
            column: capture.node.startPosition.column,
          },
        });
      }
    }
  }

  return exports;
}
```

## Tree-sitter Query Debugging

### Playground

Use the [Tree-sitter Playground](https://tree-sitter.github.io/tree-sitter/playground) to:
1. Visualize the AST for your sample code
2. Test and refine Tree-sitter queries
3. Understand node types and structure

### Query Syntax

Tree-sitter queries use S-expression syntax:

```scheme
; Match specific node types
(function_definition) @function

; Match with predicates
(function_definition
  name: (identifier) @name)

; Match alternatives
[
  (class_definition)
  (function_definition)
] @definition

; Anchor patterns
(module
  (function_definition) @top_level_function)
```

### Common Patterns

1. **Extract names with field names:**
   ```typescript
   const nameNode = node.childForFieldName('name');
   const name = nameNode ? nameNode.text : null;
   ```

2. **Walk tree cursor:**
   ```typescript
   const cursor = tree.walk();
   cursor.gotoFirstChild();
   do {
     const node = cursor.currentNode;
     // Process node
   } while (cursor.gotoNextSibling());
   ```

3. **Check node ancestry:**
   ```typescript
   let parent = node.parent;
   while (parent) {
     if (parent.type === 'module') return true;
     parent = parent.parent;
   }
   ```

## Language-Specific Considerations

### Import/Export Semantics

Different languages have different module systems:

| Language | Import Syntax | Export Semantics |
|----------|--------------|------------------|
| TypeScript | `import/export` | Explicit `export` keyword |
| Python | `import/from` | Implicit (all top-level) |
| Rust | `use/mod` | Explicit `pub` modifier |
| Go | `import` | Implicit (capitalized names) |
| Java | `import` | Explicit `public` modifier |

### Path Resolution

Consider how the language resolves import paths:

- **TypeScript**: Relative paths (`./ ../`) vs package names
- **Python**: Relative imports (`.` `..`) and absolute imports
- **Rust**: Crate names and module paths
- **Go**: Full package paths
- **Java**: Package hierarchy

### Visibility Rules

Understand what constitutes a "public" export:

- **TypeScript**: Has `export` keyword
- **Python**: Top-level and not starting with `_`
- **Rust**: Has `pub` modifier
- **Go**: Name starts with uppercase letter
- **Java**: Has `public` modifier

## Testing Checklist

Before submitting a new parser:

- [ ] Parser implements all `ILanguageParser` methods
- [ ] `supportedExtensions` list is complete
- [ ] Import extraction handles all import syntaxes
- [ ] Export extraction handles all export syntaxes
- [ ] Private/internal symbols are correctly filtered
- [ ] Parser is registered in `ParserFactory`
- [ ] Manual tests cover common patterns
- [ ] Manual tests cover edge cases
- [ ] Documentation is updated (README.md)
- [ ] All existing tests still pass

## Example: Complete Python Parser Implementation

See `src/parsers/PythonParser.ts` for a complete, production-ready example that demonstrates:

- Tree cursor walking for top-level definitions
- Handling implicit exports (no explicit keyword)
- Filtering private names by convention (`_` prefix)
- Extracting import names from different statement types
- Proper error handling and edge cases

## Resources

- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Tree-sitter Query Syntax](https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries)
- [Available Grammars](https://github.com/tree-sitter)
- [Tree-sitter Playground](https://tree-sitter.github.io/tree-sitter/playground)

## Support

For questions or issues:
- Check existing parser implementations in `src/parsers/`
- Review test files in `tests/manual/`
- Open an issue on GitHub with `[parser]` tag
