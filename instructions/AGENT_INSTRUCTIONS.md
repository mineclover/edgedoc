# mdoc-tools Agent Instructions

> Comprehensive instructions for AI agents working with mdoc-tools

## Purpose

These instructions guide AI agents (sub-agents, autonomous agents, or human users) in effectively using mdoc-tools for documentation validation and management. The system enforces SSOT (Single Source of Truth) principles across all documentation.

## Core Operating Principles

### 1. SSOT is Absolute Law
- Shared types MUST be defined ONLY in `shared/` directory
- Features and interfaces MUST only reference, never define
- Any violation is a critical error that must be fixed immediately
- Reference format: Frontmatter `shared_types` field + 🔗 emoji link

### 2. Validation is Mandatory
- Always run `mdoc validate all` before making changes
- Always run `mdoc validate all` after making changes
- Never skip validation - it prevents propagating errors
- Never commit without passing all validations

### 3. Documentation Precedes Code
- If code exists without documentation → document it immediately
- If documentation is missing → code is considered non-existent
- Orphan files (undocumented) → document or delete
- New files → add to relevant feature's `code_references` immediately

## Agent Capabilities

### As a Documentation Agent, You Can:

1. **Validate Documentation**
   - Run naming convention checks
   - Find orphaned files
   - Validate migration progress
   - Check SSOT compliance

2. **Create Shared Types**
   - Identify duplicate type definitions
   - Generate properly named shared type files
   - Update all necessary references
   - Maintain bidirectional consistency

3. **Maintain References**
   - Update frontmatter `shared_types` fields
   - Add 🔗 reference links
   - Ensure bidirectional reference consistency
   - Track type usage across codebase

4. **Clean Up**
   - Identify and handle orphan files
   - Fix naming violations
   - Resolve reference mismatches
   - Remove duplicate definitions

### What You Cannot Do:

1. **Never** define shared types outside `shared/` directory
2. **Never** skip validation steps
3. **Never** create files without documenting them
4. **Never** modify shared types without checking all references
5. **Never** ignore naming conventions

## Step-by-Step Workflows

### Workflow 1: Validate All Documentation

**Goal**: Ensure all documentation follows standards

```bash
# Step 1: Run full validation
mdoc validate all

# Step 2: If errors, categorize them
# - Naming errors → Fix with Workflow 2
# - Orphan files → Fix with Workflow 3
# - Migration errors → Fix with Workflow 4
# - Reference errors → Fix with Workflow 5

# Step 3: Re-validate after fixes
mdoc validate all

# Step 4: Confirm success (exit code 0)
```

### Workflow 2: Fix Naming Violations

**Goal**: Correct file naming and structure errors

```bash
# Step 1: Identify violations
mdoc validate naming

# Step 2: For each error, determine type:

# Type A: Unsorted pairs (e.g., 02--03_01--02.md)
# Fix: Rename to sorted version (01--02_02--03.md)
git mv shared/02--03_01--02.md shared/01--02_02--03.md

# Type B: Unnormalized pairs (e.g., 02--01.md)
# Fix: Rename to normalized version (01--02.md)
git mv interfaces/02--01.md interfaces/01--02.md
# Update frontmatter: from: "02", to: "01" → from: "01", to: "02"

# Type C: Missing frontmatter fields
# Fix: Add required fields to frontmatter

# Type D: Bidirectional reference mismatch
# Fix: Use Workflow 5

# Step 3: Validate again
mdoc validate naming

# Step 4: Confirm all errors resolved
```

### Workflow 3: Handle Orphan Files

**Goal**: Resolve undocumented files

```bash
# Step 1: Find orphans
mdoc validate orphans

# Step 2: For each orphan, decide:

# Decision A: File is needed
# Action: Add to relevant feature's code_references
# Example:
# Edit features/03_Canvas.md
# Add "src/components/NewComponent.tsx" to code_references array

# Decision B: File is obsolete
# Action: Delete file
git rm path/to/obsolete/file.ts

# Decision C: File is test/example
# Action: Document in appropriate test documentation or delete

# Step 3: Validate again
mdoc validate orphans

# Step 4: Confirm no orphans remain
```

### Workflow 4: Create Shared Type

**Goal**: Extract duplicate type definitions into shared type

```bash
# Step 1: Identify duplicate types
# Run validation or manually search
grep -r "interface TypeName" tasks/interfaces/

# Step 2: Verify same source
# Check if types are:
# - 100% structurally identical, OR
# - Same source with Pick<>/Omit<> usage

# Step 3: Determine interfaces using this type
# Example: 01--02, 02--03, 02--05

# Step 4: Generate filename (normalized, sorted)
# Result: 01--02_02--03_02--05.md

# Step 5: Create shared type file
# Create shared/01--02_02--03_02--05.md with:
---
interfaces:
  - "01--02"
  - "02--03"
  - "02--05"
type: "shared"
status: "defined"
---

# Shared Type: TypeName

## Usage Interfaces
- **01--02**: Full fields
- **02--03**: Selective fields (id, name)
- **02--05**: Full fields

## Type Definition
\```typescript
interface TypeName {
  id: string;
  name: string;
  // ... complete definition
}
\```

## Invariant Rules
- id must be UUID v4
- name cannot be empty

# Step 6: Update all interface references
# For each interface (01--02, 02--03, 02--05):
# - Add to frontmatter: shared_types: ["01--02_02--03_02--05"]
# - Replace type definition with reference:
#   > 🔗 **Shared Type**: `TypeName` defined in [../shared/01--02_02--03_02--05.md](../shared/01--02_02--03_02--05.md)
# - Remove original type definition

# Step 7: Validate
mdoc validate naming
mdoc validate all

# Step 8: Confirm success
```

### Workflow 5: Fix Bidirectional Reference Mismatch

**Goal**: Ensure shared types and interfaces reference each other correctly

```bash
# Step 1: Identify mismatch
mdoc validate naming
# Example error: "01--02: 02--03_02--05.md's interfaces doesn't include 01--02"

# Step 2: Check shared type file
# Open shared/02--03_02--05.md
# Current interfaces: ["02--03", "02--05"]

# Step 3: Check interface file
# Open interfaces/01--02.md
# Current shared_types: ["02--03_02--05"]

# Step 4: Determine correct state
# Option A: 01--02 should use this shared type
#   → Add "01--02" to shared type's interfaces
#   → Rename file to 01--02_02--03_02--05.md

# Option B: 01--02 shouldn't use this shared type
#   → Remove "02--03_02--05" from 01--02's shared_types

# Step 5: Apply fix

# For Option A:
git mv shared/02--03_02--05.md shared/01--02_02--03_02--05.md
# Edit shared/01--02_02--03_02--05.md:
interfaces:
  - "01--02"
  - "02--03"
  - "02--05"
# Update 01--02.md shared_types to ["01--02_02--03_02--05"]
# Update 02--03.md shared_types to ["01--02_02--03_02--05"]
# Update 02--05.md shared_types to ["01--02_02--03_02--05"]

# For Option B:
# Edit interfaces/01--02.md:
# Remove "02--03_02--05" from shared_types array

# Step 6: Validate
mdoc validate naming

# Step 7: Confirm fixed
```

### Workflow 6: Migrate Feature to tasks-v2

**Goal**: Migrate feature documentation with all required sections

```bash
# Step 1: Check migration status
mdoc validate migration --markdown

# Step 2: For each feature needing migration:

# Copy to tasks-v2
cp tasks/features/03_Canvas.md tasks-v2/features/

# Step 3: Check for missing sections
mdoc validate migration

# Step 4: Add missing sections
# Required sections:
# - ## 개요
# - ## 요구사항
# - ## 인터페이스
# - ## 타입 정의
# - ## 코드 구조

# Step 5: Validate again
mdoc validate migration

# Step 6: Repeat for all features
```

## Decision Trees

### When to Create Shared Type?

```
Is type defined in multiple places?
  ├─ No → Keep in current location
  └─ Yes → Are they structurally identical?
      ├─ Yes (100%) → Create shared type
      ├─ Yes (same source, different fields) → Create shared type
      └─ No (different sources) → Rename to distinguish
```

### How to Handle Orphan Files?

```
File is orphaned
  ├─ Is it source code?
  │   ├─ Yes → Is it imported anywhere?
  │   │   ├─ Yes → Add to feature code_references
  │   │   └─ No → Delete or document
  │   └─ No → Is it config/docs?
  │       ├─ Important → Add to appropriate feature
  │       └─ Obsolete → Delete
  └─ Document decision
```

### How to Fix Naming Error?

```
Naming error detected
  ├─ Is it pair ordering? (02--03_01--02)
  │   └─ Sort pairs: 01--02_02--03
  ├─ Is it pair normalization? (02--01)
  │   └─ Normalize: 01--02
  ├─ Is it frontmatter?
  │   └─ Add missing fields
  └─ Is it reference mismatch?
      └─ Use Workflow 5
```

## Common Scenarios

### Scenario 1: New Feature Added

```typescript
// Code written: src/features/NewFeature.tsx

// Agent actions:
// 1. Create feature document
// 2. Add code_references
// 3. Define interfaces if needed
// 4. Run validation
// 5. Commit together

// Result: Code + Docs committed as unit
```

### Scenario 2: Type Definition Found in Multiple Places

```typescript
// Found: LayerNode in 03--04.md, 04--03.md, 06--05.md

// Agent actions:
// 1. Verify same source (✓ all from Canvas)
// 2. Create shared/03--04_06--05.md
// 3. Move complete definition
// 4. Update 3 files with references
// 5. Remove original definitions
// 6. Validate

// Result: SSOT established
```

### Scenario 3: Naming Convention Violation

```bash
# Found: shared/02--03_01--02.md

# Agent actions:
# 1. Recognize: pairs not sorted
# 2. Rename: 01--02_02--03.md
# 3. Update references in interfaces
# 4. Validate
# 5. Commit

# Result: Naming convention enforced
```

## Error Handling

### If Validation Fails

1. **Don't panic** - Validation errors are fixable
2. **Categorize** - Group errors by type
3. **Prioritize** - Fix critical errors (SSOT) first
4. **One at a time** - Fix one error, validate, repeat
5. **Document** - Note what was fixed and why

### If Circular Dependency Found

1. **Identify cycle** - Trace dependency path
2. **Break cycle** - Remove unnecessary dependency
3. **Refactor** - Restructure if needed
4. **Validate** - Ensure cycle removed
5. **Document** - Note structural change

### If Shared Type Conflict

1. **Check source** - Same or different?
2. **If same** - Merge into shared type
3. **If different** - Rename to distinguish
4. **Update references** - Fix all uses
5. **Validate** - Confirm resolved

## Validation Checkpoints

### Before Any Change
- [ ] Run `mdoc validate all`
- [ ] Understand current state
- [ ] Identify what needs changing
- [ ] Plan changes

### During Changes
- [ ] Follow naming conventions
- [ ] Maintain SSOT
- [ ] Update references immediately
- [ ] Keep bidirectional consistency

### After Changes
- [ ] Run `mdoc validate all`
- [ ] Fix any new errors
- [ ] Re-validate until clean
- [ ] Document what changed

### Before Commit
- [ ] All validations pass
- [ ] No orphan files
- [ ] All references valid
- [ ] Documentation complete

## Quick Reference Commands

```bash
# Full validation
mdoc validate all

# Check naming only
mdoc validate naming

# Find orphans only
mdoc validate orphans

# Check migration status
mdoc validate migration

# With custom project path
mdoc validate all --project /path/to/project

# Generate markdown report
mdoc validate migration --markdown
```

## Tips for Success

1. **Validate Early, Validate Often**
   - Before making changes
   - After each change
   - Before committing

2. **Think in SSOT**
   - One definition location
   - Multiple reference locations
   - Always consistent

3. **Use Git for Renames**
   - `git mv` preserves history
   - Better than delete + create
   - Easier to track changes

4. **Document Your Reasoning**
   - Why did you create shared type?
   - Why did you rename?
   - Why did you delete?

5. **Check Both Directions**
   - Shared type → interfaces
   - Interfaces → shared type
   - Must match exactly

## Authority Document

**Single Source of Truth for Principles**: `tasks/SHARED_TYPES.md`

When in doubt, consult this document for:
- Naming conventions
- SSOT principles
- Reference methods
- Validation rules
- Best practices

## Support

For issues or questions:
1. Check `mdoc-tools/docs/` documentation
2. Review `tasks/SHARED_TYPES.md`
3. Run `mdoc validate all` for diagnostics
4. Check error messages for guidance

## Version

- **Instructions Version**: 1.0.0
- **Compatible with**: mdoc-tools 1.0.0+
- **Last Updated**: 2025-10-24
