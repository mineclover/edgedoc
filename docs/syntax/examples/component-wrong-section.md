---
example_type: "invalid"
syntax_term: "Component Definition"
error_type: "wrong_section"
description: "Component defined in wrong section"
---

# Invalid Example: Component in Wrong Section

This is an **invalid** example of [[Component Definition]].

**Error**: Component is defined outside of Architecture/Components/Implementation sections.

## Code

```markdown
## Solution

Our solution is to implement the following components:

1. **ComponentName** (`src/components/ComponentName.ts`)
   - method1()
   - method2()

2. **AnotherComponent** (`src/components/Another.ts`)
   - anotherMethod()
```

## Why Invalid?

Component Definitions are only recognized in these sections:
- `## Architecture`
- `## Components`
- `## Implementation`

This example defines components in `## Solution` section, which is not parsed.

## Impact

- Components will **not be detected** by `edgedoc test coverage --code`
- Implementation coverage will show components as missing
- Documentation-code sync will fail

## Error Message

```
⚠️  Component Definition Warning

Components defined in unsupported section "Solution"
  at tasks/features/ExampleFeature.md:3

Components will not be tracked. Move to one of:
  - ## Architecture
  - ## Components
  - ## Implementation
```

## Fix

Move components to a valid section:

```markdown
## Solution

Our solution is to implement a component-based architecture.

## Architecture

### Components

1. **ComponentName** (`src/components/ComponentName.ts`)
   - method1()
   - method2()

2. **AnotherComponent** (`src/components/Another.ts`)
   - anotherMethod()
```

## Related

- [[Component Definition]] - Correct syntax
- [[Architecture Section]] - Valid sections
- [Section Requirements](../terms/Component-Definition.md#section-requirements)
