# mdoc-tools MCP Server Specification

## Overview

This document defines the Model Context Protocol (MCP) server specification for mdoc-tools, enabling AI agents to interact with documentation validation and management tools.

**Status**: Phase 2 - Completed
**Version**: 2.0.0
**Last Updated**: 2025-10-24

**Architecture Pattern**: CLI Proxy
- MCP server wraps CLI commands via `child_process.spawn`
- Single source of truth for validation logic (CLI)
- No duplicate implementation
- Always synchronized with CLI functionality

## Architecture

```
┌─────────────────────────────────────┐
│     AI Agent (Claude, etc.)         │
└──────────────┬──────────────────────┘
               │ MCP Protocol
               │
┌──────────────▼──────────────────────┐
│         MCP Server (Bun)            │
│         src/index.ts                │
│  ┌──────────────────────────────┐   │
│  │  Tool Handlers (CLI Proxy)   │   │
│  │  - validate_migration        │   │
│  │  - validate_naming           │   │
│  │  - validate_orphans          │   │
│  │  - validate_structure        │   │
│  │  - validate_all              │   │
│  │  - sync_code_refs            │   │
│  └──────────────┬───────────────┘   │
│  ┌──────────────▼───────────────┐   │
│  │  Resource Providers          │   │
│  │  - mdoc://docs/workflows     │   │
│  │  - mdoc://docs/shared-types  │   │
│  │  - mdoc://docs/agent-instr.  │   │
│  │  - mdoc://llms.txt           │   │
│  └──────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │ child_process.spawn
               │ (Bun CLI execution)
┌──────────────▼──────────────────────┐
│         mdoc CLI (src/cli.ts)       │
│  ┌──────────────────────────────┐   │
│  │  Validation Tools            │   │
│  │  - validate.ts               │   │
│  │  - naming.ts                 │   │
│  │  - orphans.ts                │   │
│  │  - structure.ts              │   │
│  │  - sync.ts                   │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Tools

### 1. validate_migration

Validates migration from tasks/ to tasks-v2/ directory.

#### Input Schema
```typescript
{
  name: "validate_migration",
  description: "Validate migration from tasks/ to tasks-v2/, checking for missing sections, type definitions, and documentation completeness",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      },
      generateReport: {
        type: "boolean",
        description: "Generate markdown report (MIGRATION_REPORT.md)",
        default: false
      }
    }
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted ValidationResult
    }
  ]
}

interface ValidationResult {
  success: boolean;
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  totalErrors: number;
  details: ValidationDetails;
}

interface ValidationDetails {
  [category: string]: FileResult[];
}

interface FileResult {
  filename: string;
  missing: boolean;
  sectionErrors: string[];
  typeErrors: string[];
}
```

#### Example
```json
{
  "success": false,
  "totalFiles": 15,
  "passedFiles": 12,
  "failedFiles": 3,
  "totalErrors": 5,
  "details": {
    "features": [
      {
        "filename": "03_Canvas.md",
        "missing": false,
        "sectionErrors": ["Missing '## 타입 정의' section"],
        "typeErrors": []
      }
    ]
  }
}
```

### 2. validate_naming

Validates naming conventions for interfaces and shared types.

#### Input Schema
```typescript
{
  name: "validate_naming",
  description: "Validate naming conventions for interface files (XX--YY.md) and shared type files (XX--YY_YY--ZZ.md), checking format, sorting, frontmatter, and bidirectional references",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      }
    }
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted NamingValidationResult
    }
  ]
}

interface NamingValidationResult {
  success: boolean;
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  totalErrors: number;
  totalWarnings: number;
  errors: NamingError[];
  warnings: NamingWarning[];
}

interface NamingError {
  file: string;
  type: 'format' | 'sorting' | 'duplicate' | 'frontmatter' | 'reference';
  message: string;
}

interface NamingWarning {
  file: string;
  type: 'sorting' | 'style';
  message: string;
}
```

#### Example
```json
{
  "success": false,
  "totalFiles": 8,
  "passedFiles": 6,
  "failedFiles": 2,
  "totalErrors": 2,
  "totalWarnings": 1,
  "errors": [
    {
      "file": "02--03_01--02.md",
      "type": "sorting",
      "message": "Pairs not sorted (should be: 01--02_02--03)"
    },
    {
      "file": "01--02.md",
      "type": "reference",
      "message": "Bidirectional reference mismatch with 02--03_02--05.md"
    }
  ],
  "warnings": [
    {
      "file": "01--02_02--03.md",
      "type": "sorting",
      "message": "interfaces array not sorted in frontmatter"
    }
  ]
}
```

### 3. validate_orphans

Finds orphaned files not referenced in documentation or code.

#### Input Schema
```typescript
{
  name: "validate_orphans",
  description: "Find orphaned files not referenced in documentation or code, classifying them by type (source, config, other) and checking import status",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      },
      includeNodeModules: {
        type: "boolean",
        description: "Include node_modules in search",
        default: false
      },
      includeDist: {
        type: "boolean",
        description: "Include dist directories in search",
        default: false
      }
    }
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted OrphanFilesResult
    }
  ]
}

interface OrphanFilesResult {
  success: boolean;
  totalFiles: number;
  referencedFiles: number;
  orphanFiles: number;
  orphans: OrphanFile[];
}

interface OrphanFile {
  path: string;
  type: 'source' | 'config' | 'other';
  size: number;
  isImportedByCode: boolean;
}
```

#### Example
```json
{
  "success": true,
  "totalFiles": 150,
  "referencedFiles": 145,
  "orphanFiles": 5,
  "orphans": [
    {
      "path": "src/unused-component.tsx",
      "type": "source",
      "size": 2048,
      "isImportedByCode": false
    },
    {
      "path": "test-old.ts",
      "type": "source",
      "size": 512,
      "isImportedByCode": false
    }
  ]
}
```

### 4. create_shared_type

Creates a new shared type document with proper naming.

#### Input Schema
```typescript
{
  name: "create_shared_type",
  description: "Create a new shared type document with proper naming conventions, automatically normalizing and sorting interface pairs",
  inputSchema: {
    type: "object",
    properties: {
      interfaces: {
        type: "array",
        items: { type: "string" },
        description: "List of interface pairs (e.g., ['01--02', '02--03'])",
        minItems: 2
      },
      typeName: {
        type: "string",
        description: "Name of the shared type (e.g., 'LayerNode')"
      },
      typeDefinition: {
        type: "string",
        description: "TypeScript type definition"
      },
      description: {
        type: "string",
        description: "Description of the shared type usage"
      },
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      }
    },
    required: ["interfaces", "typeName", "typeDefinition"]
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted result
    }
  ]
}

interface CreateSharedTypeResult {
  success: boolean;
  filename: string;
  path: string;
  normalizedInterfaces: string[];
  message: string;
}
```

#### Example
```json
{
  "success": true,
  "filename": "01--02_02--03.md",
  "path": "tasks/shared/01--02_02--03.md",
  "normalizedInterfaces": ["01--02", "02--03"],
  "message": "Shared type created successfully"
}
```

### 5. analyze_type_usage

Analyzes where a type is used across the codebase.

#### Input Schema
```typescript
{
  name: "analyze_type_usage",
  description: "Analyze where a specific type is used across the codebase, including full usage, Pick<>, Omit<>, and other utility type usages",
  inputSchema: {
    type: "object",
    properties: {
      typeName: {
        type: "string",
        description: "Name of the type to analyze (e.g., 'ImageAsset')"
      },
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      },
      includePartialUsage: {
        type: "boolean",
        description: "Include Pick<>, Omit<> usages",
        default: true
      }
    },
    required: ["typeName"]
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted result
    }
  ]
}

interface TypeUsageResult {
  typeName: string;
  totalUsages: number;
  usages: TypeUsage[];
  sharedTypeLocation?: string;
}

interface TypeUsage {
  file: string;
  line: number;
  usageType: 'full' | 'pick' | 'omit' | 'partial' | 'extends';
  fields?: string[];  // For Pick/Omit
  context: string;    // Surrounding code
}
```

#### Example
```json
{
  "typeName": "ImageAsset",
  "totalUsages": 5,
  "sharedTypeLocation": "tasks/shared/01--02_02--03_02--05.md",
  "usages": [
    {
      "file": "interfaces/01--02.md",
      "line": 45,
      "usageType": "full",
      "context": "interface Response { assets: ImageAsset[] }"
    },
    {
      "file": "interfaces/02--03.md",
      "line": 32,
      "usageType": "pick",
      "fields": ["id", "name", "width", "height", "blob"],
      "context": "imageAsset: Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>"
    }
  ]
}
```

### 6. validate_all

Runs all validation checks in sequence.

#### Input Schema
```typescript
{
  name: "validate_all",
  description: "Run all validation checks (migration, naming, orphans) in sequence and return comprehensive results",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project directory (default: current directory)"
      }
    }
  }
}
```

#### Output Schema
```typescript
{
  content: [
    {
      type: "text",
      text: string  // JSON-formatted result
    }
  ]
}

interface ValidateAllResult {
  migration: ValidationResult;
  naming: NamingValidationResult;
  orphans: OrphanFilesResult;
  overallSuccess: boolean;
  totalErrors: number;
  totalWarnings: number;
}
```

## Resources

### 1. Project Structure

Provides an overview of the project's mdoc structure.

#### Resource Definition
```typescript
{
  uri: "mdoc://project/structure",
  name: "Project Structure",
  mimeType: "application/json",
  description: "Overview of the project's documentation structure including features, interfaces, and shared types"
}
```

#### Content Schema
```typescript
interface ProjectStructure {
  features: FeatureInfo[];
  interfaces: InterfaceInfo[];
  sharedTypes: SharedTypeInfo[];
  statistics: {
    totalFeatures: number;
    totalInterfaces: number;
    totalSharedTypes: number;
    documentationCoverage: number;  // percentage
  };
}

interface FeatureInfo {
  filename: string;
  name: string;
  status: string;
  entryPoint?: string;
  codeReferences: string[];
  sharedTypes: string[];
}

interface InterfaceInfo {
  filename: string;
  from: string;
  to: string;
  type: string;
  status: string;
  sharedTypes: string[];
}

interface SharedTypeInfo {
  filename: string;
  interfaces: string[];
  typeNames: string[];
  status: string;
}
```

### 2. Validation Report

Provides the most recent validation report.

#### Resource Definition
```typescript
{
  uri: "mdoc://validation/report",
  name: "Latest Validation Report",
  mimeType: "text/markdown",
  description: "Most recent validation report in markdown format"
}
```

#### Content Format
Markdown document containing:
- Validation summary
- Error details
- Warning details
- Recommendations

### 3. Shared Types List

Lists all shared type documents.

#### Resource Definition
```typescript
{
  uri: "mdoc://shared-types/list",
  name: "Shared Types",
  mimeType: "application/json",
  description: "List of all shared type documents with metadata"
}
```

#### Content Schema
```typescript
interface SharedTypesList {
  total: number;
  sharedTypes: SharedTypeDetail[];
}

interface SharedTypeDetail {
  filename: string;
  path: string;
  interfaces: string[];
  typeNames: string[];
  status: string;
  usageCount: number;
}
```

### 4. Naming Conventions Guide

Provides naming conventions reference.

#### Resource Definition
```typescript
{
  uri: "mdoc://guide/naming-conventions",
  name: "Naming Conventions Guide",
  mimeType: "text/markdown",
  description: "Complete guide to mdoc naming conventions including SSOT principles"
}
```

#### Content
- Reads from `tasks/SHARED_TYPES.md` (Single Source of Truth)
- Provides naming rules, examples, and best practices

## Prompts

### 1. Create Feature Documentation

```typescript
{
  name: "create-feature-doc",
  description: "Create a new feature documentation with proper structure",
  arguments: [
    {
      name: "featureName",
      description: "Name of the feature",
      required: true
    },
    {
      name: "featureNumber",
      description: "Feature number (e.g., 11)",
      required: true
    }
  ]
}
```

### 2. Fix Naming Violations

```typescript
{
  name: "fix-naming-violations",
  description: "Analyze and fix naming convention violations",
  arguments: [
    {
      name: "autoFix",
      description: "Automatically fix sortable errors",
      required: false
    }
  ]
}
```

### 3. Clean Orphan Files

```typescript
{
  name: "clean-orphan-files",
  description: "Analyze orphan files and suggest cleanup actions",
  arguments: []
}
```

## Implementation Details

### Technology Stack
- **Runtime**: Bun
- **Language**: TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **CLI Framework**: Commander.js

### Entry Points
- **MCP Server**: `mdoc-tools/src/index.ts`
- **CLI**: `mdoc-tools/src/cli.ts`
- **Shared Code**: `mdoc-tools/src/shared/`

### Server Configuration
```typescript
// Example MCP server configuration
{
  "mcpServers": {
    "mdoc-tools": {
      "command": "bun",
      "args": ["run", "mdoc-tools/src/index.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Error Handling
All tools should return structured error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

Error codes:
- `INVALID_PATH`: Project path does not exist
- `INVALID_FORMAT`: File format error
- `VALIDATION_FAILED`: Validation checks failed
- `FILE_NOT_FOUND`: Referenced file not found
- `PARSING_ERROR`: Failed to parse frontmatter or markdown
- `CIRCULAR_DEPENDENCY`: Circular dependency detected

## Usage Examples

### Example 1: Validate All Documentation
```typescript
// AI Agent Request
{
  "method": "tools/call",
  "params": {
    "name": "validate_all",
    "arguments": {
      "projectPath": "/path/to/project"
    }
  }
}

// Server Response
{
  "content": [{
    "type": "text",
    "text": "{\"overallSuccess\": false, \"totalErrors\": 5, ...}"
  }]
}
```

### Example 2: Create Shared Type
```typescript
// AI Agent Request
{
  "method": "tools/call",
  "params": {
    "name": "create_shared_type",
    "arguments": {
      "interfaces": ["01--02", "02--03", "02--05"],
      "typeName": "ImageAsset",
      "typeDefinition": "interface ImageAsset { id: string; ... }",
      "description": "Shared image asset type for project management and canvas"
    }
  }
}

// Server Response
{
  "content": [{
    "type": "text",
    "text": "{\"success\": true, \"filename\": \"01--02_02--03_02--05.md\", ...}"
  }]
}
```

### Example 3: Analyze Type Usage
```typescript
// AI Agent Request
{
  "method": "tools/call",
  "params": {
    "name": "analyze_type_usage",
    "arguments": {
      "typeName": "LayerNode",
      "includePartialUsage": true
    }
  }
}

// Server Response
{
  "content": [{
    "type": "text",
    "text": "{\"typeName\": \"LayerNode\", \"totalUsages\": 8, ...}"
  }]
}
```

## Testing

### Unit Tests
```typescript
// Test naming validation
describe('validate_naming', () => {
  it('should detect unsorted pairs', async () => {
    const result = await validateNaming({
      projectPath: './test-fixtures'
    });
    expect(result.errors).toContainEqual({
      file: '02--03_01--02.md',
      type: 'sorting',
      message: expect.stringContaining('not sorted')
    });
  });
});
```

### Integration Tests
```bash
# Test full workflow
bun test:integration

# Expected workflow:
# 1. Create test project structure
# 2. Run validate_all
# 3. Create shared type
# 4. Validate again
# 5. Verify results
```

## Migration from CLI to MCP

### Phase 1: CLI Implementation (Complete)
- ✅ validate migration
- ✅ validate naming
- ✅ validate orphans
- ✅ validate all

### Phase 2: MCP Server (Current)
- [ ] Implement MCP server with tools
- [ ] Implement resource providers
- [ ] Add prompts
- [ ] Write integration tests
- [ ] Update documentation

### Phase 3: Enhanced Features
- [ ] Auto-fix capabilities
- [ ] Real-time validation
- [ ] Visual dependency graphs
- [ ] CI/CD integration helpers

## Best Practices for AI Agents

1. **Always validate before making changes**
   - Call `validate_all` before any modifications
   - Check errors and warnings

2. **Use incremental validation**
   - Call specific validators (`validate_naming`, `validate_orphans`) for targeted checks
   - More efficient than always running `validate_all`

3. **Follow SSOT principles**
   - Never create duplicate type definitions
   - Always reference shared types from `shared/` directory
   - Use 🔗 emoji for reference links

4. **Handle errors gracefully**
   - Parse error responses
   - Suggest fixes to users
   - Auto-fix simple errors (sorting, formatting)

5. **Maintain bidirectional references**
   - When creating shared types, update all interface references
   - When updating interfaces, check shared type consistency

6. **Document reasoning**
   - When creating shared types, explain why
   - When fixing errors, explain what was wrong
   - When suggesting changes, explain the impact

## Reference Links

- **SSOT Principles**: See `tasks/SHARED_TYPES.md`
- **CLI Tool**: `mdoc-tools/README.md`
- **Workflows**: `mdoc-tools/docs/WORKFLOWS.md`
- **Validation System**: `mdoc-tools/docs/VALIDATION.md`
- **Type Definitions**: `mdoc-tools/src/shared/types.ts`

## Implementation Details

### CLI Proxy Pattern

The MCP server implements a CLI proxy pattern:

```typescript
// src/index.ts
async function executeMdocCommand(args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const mdocPath = join(__dirname, 'cli.js');
    const child = spawn('bun', [mdocPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
    });

    // Capture stdout/stderr and return structured result
    // ...
  });
}
```

**Benefits**:
1. **Single Source of Truth**: Validation logic lives only in CLI
2. **Always Synchronized**: MCP automatically uses latest CLI
3. **No Duplication**: No need to reimplement validation logic
4. **Consistent Results**: Same validation results in CLI and MCP
5. **Easy Maintenance**: Update CLI, MCP automatically benefits

**Tool Handler Example**:
```typescript
case 'validate_naming': {
  const cliArgs = ['validate', 'naming'];
  if (args?.projectPath) {
    cliArgs.push('--project', args.projectPath);
  }
  const result = await executeMdocCommand(cliArgs);
  return formatResult(result);
}
```

### Building and Running

**Build CLI**:
```bash
bun run build
```

**Build MCP Server**:
```bash
bun run build:mcp
```

**Run MCP Server**:
```bash
bun run dev:mcp
```

### MCP Server Integration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "mdoc-tools": {
      "command": "bun",
      "args": ["run", "/path/to/mdoc-tools/src/index.ts"]
    }
  }
}
```

## Changelog

### 2.0.0 (2025-10-24)
- ✅ Initial MCP specification
- ✅ Defined 6 core tools
- ✅ Defined 4 resource types
- ✅ Added 3 prompt templates
- ✅ Consolidated SSOT principles to `tasks/SHARED_TYPES.md`
- ✅ Removed duplicate `SHARED_TYPE_PRINCIPLES.md`
- ✅ **Implemented CLI proxy pattern**
- ✅ **Created src/index.ts MCP server**
- ✅ **Migrated bash scripts to TypeScript**
- ✅ **Added structure validation**
- ✅ **Added bidirectional reference checking**

### Future Versions
- 2.1.0: Add auto-fix capabilities
- 2.2.0: Add real-time validation
- 3.0.0: Add visual dependency graphs
