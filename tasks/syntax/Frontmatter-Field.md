---
feature: "syntax:Frontmatter-Field"
type: "syntax"
status: "documented"
parser: "src/tools/structure.ts:validateStructure"
validator: "src/validators/frontmatter-validator.ts"
related_features:
  - "04_ValidateStructure"
  - "19_SyntaxTermSystem"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:1-14"
    - "tasks/features/18_ImplementationCoverage.md:1-14"
  invalid:
    - "docs/syntax/examples/frontmatter-invalid-type.md"
    - "docs/syntax/examples/frontmatter-missing-required.md"
---

# [[Frontmatter Field]]

**Type**: Metadata Syntax
**Scope**: All Documents (features, syntax, interfaces, shared)
**Used By**: Structure Validation (`edgedoc validate structure`)
**Validated By**: `validateStructure()` (src/tools/structure.ts)

## 정의

문서 최상단의 YAML 형식 메타데이터 필드입니다. Feature, interface, shared type 등 모든 문서 타입에서 사용됩니다.

## 문법 (Syntax)

### 기본 구조

```yaml
---
field_name: "value"
---
```

## Required Fields by Document Type

### Feature Documents

```yaml
---
feature: "13_ValidateTerms"          # Required: Feature ID
entry_point: "src/cli.ts"            # Optional: Entry point file/line
type: "validation"                   # Optional: Feature type
status: "implemented"                # Optional: Implementation status
code_references:                     # Optional: Source files
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"
test_files:                          # Optional: Test files
  - "tests/unit/term-validation.test.ts"
related_features:                    # Optional: Related feature IDs
  - "06_ValidateAll"
  - "10_Internationalization"
---
```

### Syntax Documents

```yaml
---
feature: "syntax:Component-Definition"  # Required: syntax: prefix
type: "syntax"                          # Required: Must be "syntax"
status: "documented"                    # Required
parser: "src/tools/file.ts:function"    # Required: Parser location
validator: "src/validators/file.ts"     # Optional: Validator location
related_features:                       # Optional
  - "18_ImplementationCoverage"
examples:                               # Optional
  valid:
    - "path/to/example.md:10-20"
  invalid:
    - "path/to/invalid-example.md"
---
```

### Interface Documents

```yaml
---
from: "00_Init"                      # Required: Source feature
to: "01_ValidateMigration"           # Required: Target feature
type: "command"                      # Optional: Interface type
status: "implemented"                # Optional
shared_types:                        # Optional
  - "00--01_ValidationResult"
---
```

### Shared Type Documents

```yaml
---
interfaces:                          # Required: Interface IDs
  - "00--01"
  - "00--02"
type: "shared"                       # Required: Must be "shared"
status: "implemented"                # Optional
---
```

## Field Definitions

### feature

**Type**: `string`
**Required**: Yes (for feature and syntax documents)
**Format**: `<number>_<CamelCase>` or `syntax:<Name>`

```yaml
✅ Valid:
feature: "13_ValidateTerms"
feature: "syntax:Component-Definition"

❌ Invalid:
feature: "validate-terms"           # Wrong format
feature: "13-validate-terms"        # Wrong format
```

### entry_point

**Type**: `string`
**Required**: No
**Format**: `<file>` or `<file>:<line>` or `<file>:<start>-<end>`

```yaml
✅ Valid:
entry_point: "src/cli.ts"
entry_point: "src/cli.ts:72-86"
entry_point: "src/tools/entry-point-detector.ts"

❌ Invalid:
entry_point: "cli.ts"                # Missing src/
```

### type

**Type**: `string`
**Required**: No (Yes for syntax and shared documents)
**Values**: `validation`, `feature`, `tool`, `documentation`, `syntax`, `shared`, etc.

```yaml
✅ Valid:
type: "validation"
type: "syntax"
type: "shared"

❌ Invalid:
type: "invalid-type"                # Unknown type
```

### status

**Type**: `string`
**Required**: No
**Values**: `planned`, `active`, `implemented`, `documented`, `deprecated`

```yaml
✅ Valid:
status: "implemented"
status: "active"
status: "documented"

❌ Invalid:
status: "done"                      # Use "implemented"
status: "in-progress"               # Use "active"
```

### code_references

**Type**: `string[]`
**Required**: No
**Format**: Array of relative file paths

```yaml
✅ Valid:
code_references:
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"

❌ Invalid:
code_references:
  - "/absolute/path/file.ts"       # Absolute paths not allowed
  - "file.ts"                      # Missing directory
```

### test_files

**Type**: `string[]`
**Required**: No
**Format**: Array of relative test file paths

```yaml
✅ Valid:
test_files:
  - "tests/unit/term-validation.test.ts"
  - "tests/integration/term-commands.test.ts"

❌ Invalid:
test_files:
  - "term-validation.test.ts"      # Missing tests/ directory
```

### related_features

**Type**: `string[]`
**Required**: No
**Format**: Array of feature IDs

```yaml
✅ Valid:
related_features:
  - "06_ValidateAll"
  - "10_Internationalization"
  - "syntax:Component-Definition"

❌ Invalid:
related_features:
  - "validate-all"                 # Wrong format
```

### parser

**Type**: `string`
**Required**: Yes (for syntax documents)
**Format**: `<file>:<function>` or `<file>:<line>`

```yaml
✅ Valid:
parser: "src/tools/implementation-coverage.ts:extractDocumentedComponents"
parser: "src/tools/structure.ts:165-280"

❌ Invalid:
parser: "extractDocumentedComponents"  # Missing file
parser: "src/tools/file.ts"           # Missing function/line
```

### validator

**Type**: `string`
**Required**: No
**Format**: `<file>` or `<file>:<function>`

```yaml
✅ Valid:
validator: "src/validators/component-validator.ts"
validator: "src/validators/syntax-validator.ts:validateComponent"

❌ Invalid:
validator: "component-validator"   # Missing path
```

### examples

**Type**: `object`
**Required**: No (Recommended for syntax documents)
**Structure**: `{ valid: string[], invalid: string[] }`

```yaml
✅ Valid:
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:56-75"
  invalid:
    - "docs/syntax/examples/component-missing-path.md"

❌ Invalid:
examples:
  - "example.md"                   # Wrong structure, needs valid/invalid keys
```

## Parser Implementation

**File**: src/tools/structure.ts

**Function**: `validateStructure()`

Validates frontmatter structure and required fields for each document type.

## Validation Rules

### Rule 1: Valid YAML Syntax

Frontmatter must be valid YAML:

```yaml
✅ Valid:
---
feature: "13_ValidateTerms"
type: "validation"
---

❌ Invalid:
---
feature: 13_ValidateTerms    # Missing quotes for values with underscores
type: validation:            # Extra colon
---
```

### Rule 2: Required Fields Present

Each document type must have its required fields:

```yaml
✅ Valid (Feature):
---
feature: "13_ValidateTerms"
---

❌ Invalid (Feature):
---
type: "validation"           # Missing required 'feature' field
---
```

### Rule 3: Field Types Correct

Field values must match expected types:

```yaml
✅ Valid:
code_references:
  - "src/file1.ts"
  - "src/file2.ts"

❌ Invalid:
code_references: "src/file.ts"  # Should be array, not string
```

### Rule 4: Field Values Valid

Field values must be from allowed sets:

```yaml
✅ Valid:
status: "implemented"

❌ Invalid:
status: "done"              # Not an allowed status value
```

### Rule 5: File Paths Exist

Referenced files should exist:

```yaml
✅ Valid:
code_references:
  - "src/tools/validate-terms.ts"  # File exists

❌ Invalid:
code_references:
  - "src/tools/nonexistent.ts"     # File not found
```

## Examples

### ✅ Valid Example 1: Feature Document

**Location**: tasks/features/13_ValidateTerms.md:1-14

```yaml
---
feature: "13_ValidateTerms"
entry_point: "src/cli.ts"
type: "validation"
status: "implemented"
code_references:
  - "src/tools/validate-terms.ts"
  - "src/tools/term-registry.ts"
  - "src/parsers/TermParser.ts"
test_files:
  - "tests/unit/term-validation.test.ts"
related_features:
  - "06_ValidateAll"
  - "10_Internationalization"
---
```

### ✅ Valid Example 2: Syntax Document

**Location**: tasks/syntax/Component-Definition.md:1-14

```yaml
---
feature: "syntax:Component-Definition"
type: "syntax"
status: "documented"
parser: "src/tools/implementation-coverage.ts:extractDocumentedComponents"
validator: "src/validators/component-validator.ts"
related_features:
  - "18_ImplementationCoverage"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:56-75"
  invalid:
    - "docs/syntax/examples/component-missing-path.md"
---
```

### ❌ Invalid Example 1: Missing Required Field

See: docs/syntax/examples/frontmatter-missing-required.md

```yaml
---
type: "validation"
status: "implemented"
---
```

**Error**: Missing required field `feature`

### ❌ Invalid Example 2: Invalid Type Value

See: docs/syntax/examples/frontmatter-invalid-type.md

```yaml
---
feature: "13_ValidateTerms"
type: "invalid-type"
---
```

**Error**: Invalid type value. Allowed: validation, feature, tool, documentation, syntax, shared

## Related Terms

- [[Term Definition]] - Terms also use frontmatter
- [[Test Reference]] - test_files field
- [[Component Definition]] - code_references field

## Usage Commands

Validate frontmatter:

```bash
# Validate all documents
edgedoc validate structure

# Validate specific document
edgedoc validate structure --file tasks/features/13_ValidateTerms.md
```

## Implementation Status

- [x] Parser implementation (src/tools/structure.ts)
- [x] YAML parsing
- [x] Required field validation
- [x] Field type validation
- [ ] Validator implementation (src/validators/frontmatter-validator.ts)
- [ ] Field value validation (status, type values)
- [ ] File existence validation (code_references, test_files)

## See Also

- [Feature 04: ValidateStructure](../features/04_ValidateStructure.md) - Structure validation
- [Syntax Index](../../docs/syntax/INDEX.md) - All syntax terms
- [SYNTAX_GUIDE.md](../../docs/SYNTAX_GUIDE.md) - User syntax guide
