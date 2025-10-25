---
type: feature
status: implemented
feature: analyze-entry-points
priority: high
entry_point: "src/tools/entry-point-detector.ts"
related_features:
  - 09_MultiLanguageParser
code_references:
  - "src/tools/entry-point-detector.ts"
  - "src/parsers/ParserFactory.ts"
---

# Entry Point Detection

## Purpose

Automatically detect and analyze entry point modules in a project. Entry points are externally exposed top-level public API modules (CLI, library exports, API endpoints).

## What is an Entry Point?

An **Entry Point Module** is a file that:
- Exposes public interfaces to external consumers
- Serves as the main entry to a system/feature
- Is referenced in package.json (main, bin, exports)
- Is marked as entry_point in documentation

**Types**:
- `cli`: Command-line interfaces (src/cli.ts, src/index.ts)
- `library`: Public library exports (package.json main/exports)
- `api`: API modules marked in documentation

## Detection Strategy

### 1. CLI Pattern Matching

Searches for common CLI entry point patterns:
- `src/cli.ts`
- `src/index.ts`
- `src/main.ts`
- `cli.ts`
- `index.ts`

### 2. Package.json Analysis

Extracts entry points from:

**Main field**:
```json
{
  "main": "dist/index.js"
}
```

**Bin field**:
```json
{
  "bin": {
    "edgedoc": "dist/cli.js"
  }
}
```

**Exports field** (modern):
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./parsers": "./dist/parsers/index.js"
  }
}
```

### 3. Documentation-Based Detection

Parses all feature docs in `tasks/features/` for `entry_point` frontmatter:

```yaml
---
entry_point: "src/parsers/ParserFactory.ts"
---
```

## Implementation

**File**: `src/tools/entry-point-detector.ts`

### EntryPointDetector Class

```typescript
export class EntryPointDetector {
  static detect(projectPath: string): EntryPointModule[]
  static print(entryPoints: EntryPointModule[]): void
}
```

### EntryPointModule Interface

```typescript
interface EntryPointModule {
  file: string;                // Relative path from project root
  type: 'cli' | 'api' | 'library';
  publicInterfaces: string[];  // Extracted export names
  reason: string;              // Detection source
  importCount?: number;        // Optional usage count
}
```

### Detection Algorithm

1. **CLI Pattern Scan**: Check predefined CLI file patterns
2. **Package.json Parse**: Extract main/bin/exports fields
3. **Documentation Scan**: Parse frontmatter for entry_point fields
4. **Deduplication**: Merge duplicate entries, combine reasons
5. **Export Extraction**: Use ParserFactory to extract public interfaces

## CLI Usage

```bash
# Detect all entry points in current project
edgedoc analyze entry-points

# Detect in specific project
edgedoc analyze entry-points -p /path/to/project
```

**Example Output**:
```
📍 Detected Entry Points:

1. 🚀 src/cli.ts
   Type: cli
   Reason: CLI entry point
   Public Interfaces: 0

2. 🚀 src/index.ts
   Type: cli
   Reason: MCP server, package.json "bin.edgedoc" field
   Public Interfaces: 1
     - createServer

3. 🔧 src/parsers/ParserFactory.ts
   Type: api
   Reason: Marked in 09_MultiLanguageParser.md
   Public Interfaces: 1
     - ParserFactory

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary: 3 entry points detected
```

## Integration with Interface Validation

EntryPointDetector is **Phase 1** of the interface-level validation system:

### Current Role
- Identify top-level modules to analyze
- Extract public interface names
- Provide foundation for interface graph building

### Future Role (Phases 2-4)
- Feed entry points to ExportAnalyzer
- Drive interface-level orphan detection
- Generate public_interfaces frontmatter

**Related Docs**:
- `docs/INTERFACE_LEVEL_VALIDATION_PLAN.md`
- `docs/INTERFACE_VALIDATION_DESIGN.md`
- `docs/INTERFACE_VALIDATION_INTEGRATION.md`

## Implementation Details

### Path Normalization

Maps compiled paths back to source:
```typescript
const mainFile = pkg.main
  .replace(/^\.\//, '')        // Remove leading ./
  .replace(/^dist\//, 'src/'); // Map dist → src
```

### Deduplication Strategy

When multiple detection sources find the same file:
- Merge reasons (comma-separated)
- Combine public interfaces (deduplicate)
- Keep first detected type

**Example**:
```typescript
// First detection
{ file: 'src/index.ts', type: 'cli', reason: 'CLI entry point' }

// Second detection
{ file: 'src/index.ts', type: 'cli', reason: 'package.json "bin"' }

// Merged result
{
  file: 'src/index.ts',
  type: 'cli',
  reason: 'CLI entry point, package.json "bin"'
}
```

### Export Extraction

Uses ParserFactory to extract public interfaces:

```typescript
private static extractExports(filePath: string): string[] {
  const parser = ParserFactory.getParser(filePath);
  if (!parser) return [];

  const content = readFileSync(filePath, 'utf-8');
  const { exports } = parser.parse(content, filePath);

  return exports.map(exp => exp.name);
}
```

## Use Cases

### 1. Documentation Planning
Identify which modules need documentation:
```bash
edgedoc analyze entry-points
# Review output → Create feature docs for each entry point
```

### 2. Interface Validation Preparation
Prepare for interface-level validation:
```bash
edgedoc analyze entry-points > entry-points.txt
# Use list to add entry_point frontmatter to docs
```

### 3. Public API Audit
Review what's exposed to external users:
```bash
edgedoc analyze entry-points
# Check if all public interfaces are intentional
```

## Testing

**Manual Test**: `tests/manual/tree-sitter-parser.test.ts` includes entry point detection tests

**Validation**:
```bash
cd /path/to/project
edgedoc analyze entry-points
# Expected: List of entry points with accurate public interfaces
```

## Limitations

1. **Python __all__**: Not parsed for explicit exports
2. **Dynamic Imports**: Not detected
3. **Monorepo Support**: Single project only (no workspace detection)
4. **Re-exports**: May not follow re-export chains

## Future Enhancements

Planned for Phases 2-4:

1. **Method-Level Tracking**: Extract class methods, not just class names
2. **Usage Analysis**: Track import counts for each interface
3. **Auto-Sync Integration**: Generate public_interfaces frontmatter
4. **Dependency Graph**: Build full interface usage graph

See `docs/INTERFACE_VALIDATION_INTEGRATION.md` for roadmap.

## Performance

- File I/O: O(n) where n = number of CLI patterns + feature docs
- Package.json parse: O(1)
- Export extraction: O(m) where m = number of entry points
- Typical runtime: <100ms for 10 entry points

## Exit Codes

- `0`: Success (entry points detected)
- `1`: Error (invalid project path, parse error)
