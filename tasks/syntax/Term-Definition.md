---
feature: "syntax:Term-Definition"
type: "syntax"
status: "documented"
parser: "src/parsers/TermParser.ts:extractDefinitions"
validator: "src/validators/term-validator.ts"
related_features:
  - "13_ValidateTerms"
  - "19_SyntaxTermSystem"
examples:
  valid:
    - "docs/GLOSSARY.md:15-25"
    - "tasks/features/12_AnalyzeEntryPoints.md:20-35"
  invalid:
    - "docs/syntax/examples/term-missing-type.md"
    - "docs/syntax/examples/term-invalid-scope.md"
---

# [[Term Definition]]

**Type**: Content Syntax
**Scope**: All Documents
**Used By**: Term Validation (`edgedoc validate terms`)
**Validated By**: `extractDefinitions()` (src/parsers/TermParser.ts)

## 정의

문서에서 용어를 정의하는 문법입니다. 정의된 용어는 `[[Term]]` 형식으로 다른 문서에서 참조할 수 있습니다.

## 문법 (Syntax)

### 기본 형식

```markdown
## [[Term Name]]

**Type**: concept | class | function | module
**Scope**: global | local
**Aliases**: alternative names
**Related**: [[Related Term 1]], [[Related Term 2]]

Definition text here...
```

## Required Fields

### Term Heading

용어는 `##` 헤딩으로 정의하며 `[[Term]]` 형식으로 감쌉니다:

```markdown
✅ Valid:
## [[Entry Point Module]]

❌ Invalid:
# [[Entry Point Module]]           # Wrong level (use ##)
## Entry Point Module               # Missing [[ ]]
### [[Entry Point Module]]          # Wrong level (use ##)
```

### Type Field

**Required**: Yes
**Values**: `concept`, `class`, `function`, `module`, `interface`, `type`

```markdown
✅ Valid:
**Type**: concept
**Type**: class

❌ Invalid:
**Type**: unknown                   # Invalid value
Type: concept                       # Missing **bold**
```

### Scope Field

**Required**: Yes
**Values**: `global`, `local`

```markdown
✅ Valid:
**Scope**: global
**Scope**: local

❌ Invalid:
**Scope**: project                  # Invalid value
**Scope**: global, local            # Can't be both
```

## Optional Fields

### Aliases

Alternative names for the term:

```markdown
**Aliases**: entry point, 진입점 모듈, EP module
```

### Related

Related terms:

```markdown
**Related**: [[Top-Level Interface]], [[Public API]]
```

## Complete Example

```markdown
## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
CLI 또는 library의 main entry point로 사용된다.
```

## Type Values

### concept

Abstract ideas or design concepts:

```markdown
## [[Reverse Reference]]

**Type**: concept
**Scope**: global

"A → B를 참조한다"가 아닌 "B를 누가 참조하는가?"를 추적하는 개념.
```

### class

TypeScript/JavaScript classes:

```markdown
## [[TermParser]]

**Type**: class
**Scope**: global

Term 정의와 참조를 파싱하는 클래스.
```

### function

Functions or methods:

```markdown
## [[validateTerms]]

**Type**: function
**Scope**: global

Term 정의와 참조의 일관성을 검증하는 함수.
```

### module

File modules or packages:

```markdown
## [[ParserFactory]]

**Type**: module
**Scope**: global

다양한 언어의 parser를 생성하고 관리하는 모듈.
```

## Scope Values

### global

Can be referenced from any document:

```markdown
## [[Entry Point Module]]

**Type**: concept
**Scope**: global

This term can be used anywhere in the project.
```

### local

Only valid within the current document:

```markdown
## [[Helper Function]]

**Type**: function
**Scope**: local

This term is only valid in this document.
```

## Parser Implementation

**File**: src/parsers/TermParser.ts:45-120

**Function**: `extractDefinitions()`

**Logic**:
1. Find `## [[Term]]` headings
2. Extract term name from `[[...]]`
3. Parse **Type**, **Scope**, **Aliases**, **Related** fields
4. Extract definition text (first paragraph after fields)

```typescript
export interface TermDefinition {
  term: string;           // "Entry Point Module"
  type: string;           // "concept"
  scope: 'global' | 'local';
  aliases: string[];      // ["entry point", "진입점 모듈"]
  related: string[];      // ["Top-Level Interface", "Public API"]
  definition: string;     // Definition text
  file: string;           // Source file
  line: number;           // Line number
}
```

## Validation Rules

### Rule 1: Unique Global Terms

Global terms must be unique across all documents:

```markdown
✅ Valid:
# In GLOSSARY.md
## [[Entry Point Module]]
**Type**: concept
**Scope**: global

❌ Invalid:
# In GLOSSARY.md
## [[Entry Point Module]]
**Scope**: global

# In another-file.md
## [[Entry Point Module]]    # Error: Duplicate global term
**Scope**: global
```

### Rule 2: Local Terms Can Duplicate

Local terms can have same name in different documents:

```markdown
✅ Valid:
# In file1.md
## [[Helper Function]]
**Scope**: local

# In file2.md
## [[Helper Function]]      # OK: Both are local
**Scope**: local
```

### Rule 3: Required Fields Present

All required fields must be present:

```markdown
✅ Valid:
## [[Term Name]]
**Type**: concept
**Scope**: global

❌ Invalid:
## [[Term Name]]
**Type**: concept            # Missing Scope
```

### Rule 4: Valid Type Values

Type must be from allowed set:

```markdown
✅ Valid:
**Type**: concept

❌ Invalid:
**Type**: unknown            # Invalid type
```

### Rule 5: Related Terms Exist

Referenced terms should be defined:

```markdown
✅ Valid:
**Related**: [[Entry Point Module]]  # This term is defined

❌ Invalid:
**Related**: [[Undefined Term]]      # This term is not defined
```

## Examples

### ✅ Valid Example 1: Concept Term

**Location**: docs/GLOSSARY.md

```markdown
## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
```

### ✅ Valid Example 2: Class Term

**Location**: tasks/features/13_ValidateTerms.md

```markdown
## [[TermParser]]

**Type**: class
**Scope**: global
**Related**: [[TermRegistry]]

Term 정의와 참조를 파싱하는 클래스.
Markdown 파일에서 `[[Term]]` 패턴을 찾아 추출한다.
```

### ✅ Valid Example 3: Local Term

**Location**: tasks/features/13_ValidateTerms.md

```markdown
## [[Validation Context]]

**Type**: concept
**Scope**: local

현재 문서 내에서만 사용되는 validation 컨텍스트.
```

### ❌ Invalid Example 1: Missing Type

See: docs/syntax/examples/term-missing-type.md

```markdown
## [[Term Name]]

**Scope**: global

Definition text...
```

**Error**: Missing required field `Type`

### ❌ Invalid Example 2: Invalid Scope

See: docs/syntax/examples/term-invalid-scope.md

```markdown
## [[Term Name]]

**Type**: concept
**Scope**: project

Definition text...
```

**Error**: Invalid scope value. Allowed: global, local

## Term Reference

Defined terms can be referenced in any document using `[[Term]]` syntax:

```markdown
[[Entry Point Module]]은 [[Public API]]를 노출한다.
```

**Parser**: src/parsers/TermParser.ts:extractReferences()

**Validation**: Ensures referenced terms are defined

## Related Terms

- [[Term Reference]] - How to reference defined terms
- [[Frontmatter Field]] - Metadata for term validation
- [[Component Definition]] - Similar structured definition

## Usage Commands

Validate terms:

```bash
# Validate all term definitions and references
edgedoc validate terms

# List all defined terms
edgedoc terms list

# Find a specific term
edgedoc terms find "Entry Point"
```

## Implementation Status

- [x] Parser implementation (src/parsers/TermParser.ts)
- [x] Definition extraction
- [x] Reference extraction
- [x] Type and scope parsing
- [x] Aliases parsing
- [x] Related terms parsing
- [x] Validation (duplicate global terms)
- [x] Validation (undefined references)
- [ ] Validator implementation (src/validators/term-validator.ts)
- [ ] Scope violation detection
- [ ] Circular reference detection

## See Also

- [Feature 13: ValidateTerms](../features/13_ValidateTerms.md) - Term validation system
- [GLOSSARY.md](../../docs/GLOSSARY.md) - Project glossary with term definitions
- [Syntax Index](../../docs/syntax/INDEX.md) - All syntax terms
