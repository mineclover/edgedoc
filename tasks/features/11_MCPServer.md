---
type: feature
status: active
feature: mcp-server
priority: low
entry_point: "src/index.ts"
related_features:
  - 01_ValidateMigration
  - 02_ValidateNaming
  - 03_ValidateOrphans
  - 07_Sync
code_references:
  - "src/index.ts"
---

# MCP Server Integration

## Purpose

Model Context Protocol (MCP) server for AI agent integration. Exposes validation and sync tools as MCP tools for use with Claude and other AI assistants.

## Status

✅ **Phase 1 Complete** - 18 tools fully exposed with CLI proxy pattern.

## Architecture

**File**: `src/index.ts`

The MCP server provides:
- Standardized tool interface for AI agents
- Validation tools exposure
- Sync command integration
- Real-time documentation status

## Planned Tools

### Validation Tools

1. **validate_migration**
   - Check migration progress from tasks → tasks-v2
   - Parameters: projectPath, markdown (optional)

2. **validate_naming**
   - Verify interface and shared type naming conventions
   - Parameters: projectPath

3. **validate_orphans**
   - Detect undocumented source files
   - Parameters: projectPath

4. **validate_all**
   - Run all validation checks
   - Parameters: projectPath

### Sync Tools

5. **sync_code_refs**
   - Synchronize code_references in documentation
   - Parameters: projectPath, dryRun (optional)

## Implementation Plan

### Phase 1: Basic Server ✅
- [x] MCP server infrastructure
- [x] Tool registration (18 tools)
- [x] Basic validation exposure
- [x] Graph tools (build, query)
- [x] Term tools (validate, list, find)
- [x] Task tools (list, get, progress) with reverse lookup
- [x] Docs tools (list, open, close)
- [x] Interface validation
- [x] Resources (static docs + dynamic project data)

### Phase 2: Advanced Features (Future)
- [ ] Real-time validation events
- [ ] Documentation generation
- [ ] Migration assistance
- [ ] Interactive fixing suggestions

## Usage (Planned)

### Claude Desktop Integration

Add to Claude config:

```json
{
  "mcpServers": {
    "edgedoc": {
      "command": "node",
      "args": ["/path/to/edgedoc/dist/index.js"]
    }
  }
}
```

### MCP Tool Call Example

```typescript
// AI agent calls MCP tool
await use_mcp_tool("validate_orphans", {
  projectPath: "/path/to/project"
});

// Returns:
{
  success: true,
  totalFiles: 23,
  orphanFiles: 0,
  message: "No orphan files found"
}
```

## Documentation

See `docs/MCP_SPEC.md` for detailed specification.

## Development

**Run MCP Server**:
```bash
bun run dev:mcp
```

**Build MCP Server**:
```bash
bun run build:mcp
```

## Dependencies

- `@modelcontextprotocol/sdk` - Official MCP SDK
- Uses same validation logic as CLI

## Future Enhancements

1. **Streaming Results**: Real-time validation feedback
2. **Interactive Fixes**: Suggest and apply fixes automatically
3. **Documentation Generation**: Generate missing documentation
4. **Graph Visualization**: Export dependency graphs
5. **Migration Guidance**: Step-by-step migration assistance

## Related

- **CLI Tool**: `src/cli.ts` - Command-line interface (production ready)
- **MCP Spec**: `docs/MCP_SPEC.md` - Protocol specification
