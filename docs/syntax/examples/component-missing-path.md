---
example_type: "invalid"
syntax_term: "Component Definition"
error_type: "missing_file_path"
description: "Component definition without file path"
---

# Invalid Example: Component Missing Path

This is an **invalid** example of [[Component Definition]].

**Error**: Component name provided but file path is missing.

## Code

```markdown
## Architecture

### Components

1. **ComponentName**
   - method1()
   - method2()
```

## Why Invalid?

Every component must specify its file path using one of:
- Pattern 1: `1. **Name** (`path`)`
- Pattern 2: `**File**: `path``
- Pattern 3: `**Location**: `path``

This example provides only the component name without the file path.

## Error Message

```
❌ Component Definition Error

Component "ComponentName" is missing file path
  at tasks/features/ExampleFeature.md:5

Expected format:
  1. **ComponentName** (`path/to/file.ts`)
```

## Fix

Add the file path:

```markdown
## Architecture

### Components

1. **ComponentName** (`src/components/ComponentName.ts`)
   - method1()
   - method2()
```

## Related

- [[Component Definition]] - Correct syntax
- [Validation Rules](../terms/Component-Definition.md#validation-rules)
