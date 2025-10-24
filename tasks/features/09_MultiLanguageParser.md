---
type: feature
status: active
feature: multi-language-parser
priority: high
entry_point: "src/parsers/ParserFactory.ts"
related_interfaces:
  - 00--07
related_features:
  - 03_ValidateOrphans
  - 05_ValidateSpecOrphans
  - 07_Sync
code_references:
  - "src/parsers/ILanguageParser.ts"
  - "src/parsers/ParserFactory.ts"
---

# Multi-Language Parser System

## Purpose

Extensible architecture for parsing multiple programming languages using Tree-sitter. Provides unified interface for extracting imports and exports from source code.

## Architecture

### ILanguageParser Interface

Common contract for all language parsers:

```typescript
interface ILanguageParser {
  readonly supportedExtensions: string[];
  readonly languageName: string;
  parse(sourceCode: string, filePath: string): ParseResult;
  canParse(filePath: string): boolean;
}
```

**Location**: `src/parsers/ILanguageParser.ts`

### ParserFactory

Central registry for managing language parsers:

- Automatic parser registration
- Extension-based parser lookup
- Lazy initialization
- Supported extensions query

**Location**: `src/parsers/ParserFactory.ts`

### Supported Languages

| Language | Parser | Extensions | Status |
|----------|--------|------------|--------|
| TypeScript | TypeScriptParser | .ts, .tsx | ✅ |
| JavaScript | TypeScriptParser | .js, .jsx | ✅ |
| Python | PythonParser | .py | ✅ |

## Language Implementations

### TypeScript/JavaScript Parser

**File**: `src/parsers/TypeScriptParser.ts`

**Features**:
- Named, default, namespace imports
- Type-only imports
- Interface, type, class, function, const exports
- TSX/JSX support

**Example Output**:
```typescript
{
  imports: [
    { source: './utils', names: ['helper'], location: { line: 1, column: 0 } }
  ],
  exports: [
    { name: 'MyClass', type: 'class', isDefault: false, location: { line: 5, column: 0 } }
  ]
}
```

### Python Parser

**File**: `src/parsers/PythonParser.ts`

**Features**:
- `import` and `from ... import` statements
- Top-level functions, classes, variables
- Private name filtering (underscore prefix)
- Relative import tracking

**Example Output**:
```typescript
{
  imports: [
    { source: 'os', names: [], location: { line: 1, column: 0 } },
    { source: 'typing', names: ['List', 'Dict'], location: { line: 2, column: 0 } }
  ],
  exports: [
    { name: 'process_data', type: 'function', isDefault: false, location: { line: 5, column: 0 } }
  ]
}
```

## Usage

### Tools Integration

All validation and sync tools use ParserFactory:

```typescript
import { ParserFactory } from '../parsers/ParserFactory.js';

const parser = ParserFactory.getParser('main.py');
if (parser) {
  const { imports, exports } = parser.parse(content, filePath);
}
```

### Used By

1. **Orphan Detection** (`03_ValidateOrphans`): Builds import dependency graph
2. **Spec Orphans** (`05_ValidateSpecOrphans`): Extracts exports for documentation verification
3. **Code Sync** (`07_Sync`): Tracks transitive dependencies

## Extension Guide

To add a new language:

1. Install tree-sitter grammar: `bun add tree-sitter-{language}`
2. Create parser class implementing `ILanguageParser`
3. Register in `ParserFactory.ensureInitialized()`
4. Add tests to `tests/manual/tree-sitter-parser.test.ts`

See `docs/LANGUAGE_EXTENSION_GUIDE.md` for detailed instructions.

## Test Coverage

**Test File**: `tests/manual/tree-sitter-parser.test.ts`

- TypeScript: 7 tests (imports, exports, TSX)
- Python: 3 tests (imports, exports with private filtering, complex example)

**Run Tests**:
```bash
bun tests/manual/tree-sitter-parser.test.ts
```

## Performance

- Lazy parser initialization (only when needed)
- Tree-sitter incremental parsing
- Extension-based lookup (O(1))
- No redundant grammar loading

## Limitations

### Python Parser
- Only top-level definitions extracted
- `__all__` not parsed for explicit exports
- Relative imports tracked but not resolved to files

### TypeScript Parser
- Comments not extracted
- Dynamic imports not fully supported
- Re-exports may need special handling
