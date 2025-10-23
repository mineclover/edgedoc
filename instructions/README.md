# mdoc-tools Instructions Directory

> Reusable instruction documents for AI agents and human users

## Purpose

This directory contains comprehensive instructions for using mdoc-tools effectively. These documents are designed to be:

1. **Reusable** - Copy to any project using mdoc-tools
2. **Agent-friendly** - Optimized for AI agent consumption
3. **Human-readable** - Also useful for developers
4. **Self-contained** - Complete with examples and workflows

## Files in This Directory

### AGENT_INSTRUCTIONS.md
**Target Audience**: AI Agents (Sub-agents, Autonomous Agents)

**Contents**:
- Core operating principles
- Step-by-step workflows
- Decision trees
- Common scenarios
- Error handling procedures
- Validation checkpoints

**When to Use**:
- Setting up autonomous agents
- Creating sub-agents for documentation tasks
- Providing context to AI assistants
- Training new team members

### Quick Start for Agents

To use these instructions with an AI agent:

```markdown
# In your agent prompt:

You are a documentation management agent using mdoc-tools.

Load instructions from: mdoc-tools/instructions/AGENT_INSTRUCTIONS.md
Load documentation standard from: tasks/SHARED_TYPES.md
Load CLI reference from: mdoc-tools/llms.txt

Your primary responsibilities:
1. Validate all documentation (mdoc validate all)
2. Maintain SSOT principles
3. Fix violations immediately
4. Document all code

Follow the workflows in AGENT_INSTRUCTIONS.md exactly.
```

## How to Copy to Another Project

### Option 1: Direct Copy

```bash
# Copy entire instructions directory
cp -r mdoc-tools/instructions /path/to/new/project/mdoc-tools/

# Also copy llms.txt
cp mdoc-tools/llms.txt /path/to/new/project/mdoc-tools/
```

### Option 2: Git Subtree (Recommended)

```bash
# From new project root
git subtree add --prefix=mdoc-tools/instructions \
  https://github.com/your-repo/web-drag-builder.git \
  main:mdoc-tools/instructions

# To update later
git subtree pull --prefix=mdoc-tools/instructions \
  https://github.com/your-repo/web-drag-builder.git \
  main:mdoc-tools/instructions
```

### Option 3: Symlink (For monorepo)

```bash
# From new project
ln -s ../../web-drag-builder/mdoc-tools/instructions mdoc-tools/instructions
ln -s ../../web-drag-builder/mdoc-tools/llms.txt mdoc-tools/llms.txt
```

## Integration Examples

### With Claude Code

```markdown
# .claude/skills/mdoc.md

Load the following resources:
- mdoc-tools/instructions/AGENT_INSTRUCTIONS.md
- mdoc-tools/llms.txt
- tasks/SHARED_TYPES.md

When user requests documentation tasks:
1. Follow AGENT_INSTRUCTIONS.md workflows
2. Reference llms.txt for commands
3. Consult SHARED_TYPES.md for standards
```

### With MCP Server

```typescript
// MCP Server prompt template
{
  name: "validate-and-fix",
  description: "Validate documentation and fix errors",
  arguments: [],
  getMessages: async () => {
    const instructions = await readFile('mdoc-tools/instructions/AGENT_INSTRUCTIONS.md');
    const llmsTxt = await readFile('mdoc-tools/llms.txt');

    return [
      {
        role: "system",
        content: `${instructions}\n\n${llmsTxt}`
      },
      {
        role: "user",
        content: "Run validation and fix all errors following the workflows."
      }
    ];
  }
}
```

### With Task Runner

```yaml
# tasks.yml
validate-docs:
  description: Validate all documentation
  steps:
    - name: Load Instructions
      run: cat mdoc-tools/instructions/AGENT_INSTRUCTIONS.md

    - name: Run Validation
      run: mdoc validate all

    - name: Fix Errors
      agent: documentation-agent
      instructions: mdoc-tools/instructions/AGENT_INSTRUCTIONS.md
```

## Customization

### Project-Specific Instructions

Create a `LOCAL_INSTRUCTIONS.md` with project-specific additions:

```markdown
# Local Instructions for [Project Name]

## Additional Validations

[Project-specific validations]

## Custom Workflows

[Project-specific workflows]

## Team Conventions

[Project-specific conventions]

---

**Base Instructions**: See [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md)
```

### Override Workflows

If you need different workflows:

1. Copy `AGENT_INSTRUCTIONS.md` to `AGENT_INSTRUCTIONS.local.md`
2. Modify the local version
3. Update agent configurations to use local version
4. Document differences in comments

## Maintenance

### Updating Instructions

When mdoc-tools adds new features:

1. Update `AGENT_INSTRUCTIONS.md` with new workflows
2. Update `llms.txt` with new commands
3. Increment version numbers
4. Update this README with changes
5. Notify all projects using these instructions

### Version Compatibility

| Instructions Version | mdoc-tools Version | Compatible |
|---------------------|-------------------|------------|
| 1.0.0               | 1.0.0+            | ✅         |

### Change Log

**1.0.0** (2025-10-24)
- Initial release
- Complete workflows for all validation types
- Decision trees and error handling
- Common scenarios and examples

## Support

For issues or questions:

1. **Check Documentation**
   - `mdoc-tools/docs/` - Complete documentation
   - `tasks/SHARED_TYPES.md` - SSOT principles

2. **Run Diagnostics**
   ```bash
   mdoc validate all
   ```

3. **Check Examples**
   - See `AGENT_INSTRUCTIONS.md` for workflows
   - See `llms.txt` for quick reference

4. **Report Issues**
   - If instructions are unclear
   - If workflows are incomplete
   - If examples are wrong

## Contributing

To improve these instructions:

1. Identify gaps or unclear areas
2. Propose improvements
3. Test with actual agents
4. Update with examples
5. Submit changes

## License

Same as mdoc-tools main project.

## Version

- **Instructions**: 1.0.0
- **Last Updated**: 2025-10-24
- **Compatible With**: mdoc-tools 1.0.0+
