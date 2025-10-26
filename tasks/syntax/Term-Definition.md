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
# [[Term Name]]
## [[Term Name]]
### [[Term Name]]

**Type**: concept | class | function | module
**Scope**: global | local
**Aliases**: alternative names
**Related**: [[Related Term 1]], [[Related Term 2]]

Definition text here...
```

**Note**: H1-H3 헤딩 레벨 모두 지원

## Required Fields

### Term Heading

용어는 `#`, `##`, `###` 헤딩으로 정의하며 `[[Term]]` 형식으로 감쌉니다:

```markdown
✅ Valid:
# [[Component Definition]]          # H1
## [[Entry Point Module]]           # H2
### [[Helper Function]]             # H3

❌ Invalid:
## Entry Point Module               # Missing [[ ]]
#### [[Too Deep]]                   # H4+ not supported
```

## 헤딩 레벨 시멘틱 가이드

용어 정의 시 문서 구조와 의미에 맞는 헤딩 레벨을 선택하세요:

### H1 (`#`) - 문서의 주요 주제

**용도**:
- Syntax Term 문서의 핵심 개념
- 단독 문서로 존재하는 최상위 용어
- Feature 문서의 핵심 개념

**예시**:
```markdown
# tasks/syntax/Component-Definition.md
# [[Component Definition]]

# tasks/features/13_ValidateTerms.md
# [[Term Validation System]]
```

**특징**:
- 문서당 1개 권장
- 문서 제목과 일치하는 경우가 많음
- 가장 높은 중요도

### H2 (`##`) - 주요 섹션 개념

**용도**:
- GLOSSARY 내 개별 용어 항목
- 문서 내 주요 섹션별 용어
- 카테고리별 용어 그룹

**예시**:
```markdown
# docs/GLOSSARY.md
## [[Entry Point Module]]
## [[Code Interface]]
## [[Top-Level Interface]]
```

**특징**:
- 문서당 여러 개 가능
- GLOSSARY에서 주로 사용
- 중간 중요도

### H3 (`###`) - 하위 섹션 개념

**용도**:
- H2 용어의 하위 개념
- 특정 컨텍스트 내 세부 용어
- 로컬 스코프 용어

**예시**:
```markdown
## [[Parser System]]

### [[TypeScript Parser]]
### [[Python Parser]]
### [[Parser Factory]]
```

**특징**:
- 계층 구조 표현
- 상위 용어의 세부 개념
- 낮은 중요도, 문맥 의존적

### H4+ (`####`) - 지원 안 함

**이유**:
- 용어 정의는 최대 3단계 계층까지만 허용
- H4 이상은 문서 구조용 섹션 헤딩으로 사용
- 너무 깊은 계층은 복잡도 증가

```markdown
❌ Not Supported:
#### [[Too Deep Term]]              # H4는 용어 정의로 인식 안 됨
##### [[Even Deeper]]               # H5도 마찬가지
```

## 헤딩 레벨 선택 가이드

### 문서 유형별 권장사항

| 문서 유형 | 권장 레벨 | 예시 |
|----------|----------|------|
| **Syntax Term 문서** | H1 | `# [[Component Definition]]` |
| **GLOSSARY** | H2 | `## [[Entry Point Module]]` |
| **Feature 문서** | H1 또는 H3 | `# [[Main Concept]]`, `### [[Sub Concept]]` |
| **Guide 문서** | H2 또는 H3 | `## [[Key Pattern]]`, `### [[Variant]]` |

### 계층 구조 예시

```markdown
# [[Documentation System]]          # H1: 최상위 개념 (문서 주제)

## [[Term Validation]]               # H2: 주요 기능
### [[Term Parser]]                  # H3: 구성 요소
### [[Term Registry]]                # H3: 구성 요소

## [[Syntax Validation]]             # H2: 주요 기능
### [[Component Parser]]             # H3: 구성 요소
### [[Frontmatter Parser]]           # H3: 구성 요소
```

### 결정 기준

**H1 사용 조건**:
- ✅ 문서의 핵심 주제
- ✅ 독립적인 개념
- ✅ 다른 문서에서 자주 참조
- ✅ 최상위 카테고리

**H2 사용 조건**:
- ✅ H1의 주요 하위 개념
- ✅ GLOSSARY 항목
- ✅ 섹션별 구분이 필요한 용어
- ✅ 중간 계층 개념

**H3 사용 조건**:
- ✅ H2의 세부 개념
- ✅ 구현 레벨 용어
- ✅ 특정 컨텍스트 내 용어
- ✅ 계층의 마지막 단계

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

## Complete Examples

### Example 1: H1 용어 정의 (Syntax Term)

```markdown
# [[Component Definition]]

**Type**: Documentation Structure Syntax
**Scope**: Feature Documents
**Used By**: Implementation Coverage Analysis

Feature 문서의 Architecture 섹션에서 컴포넌트를 정의하는 문법입니다.
```

### Example 2: H2 용어 정의 (GLOSSARY)

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

**File**: src/parsers/TermParser.ts:12-52

**Function**: `extractDefinitions()`

**Logic**:
1. Find `# [[Term]]`, `## [[Term]]`, or `### [[Term]]` headings (H1-H3)
2. Extract term name from `[[...]]`
3. Parse **Type**, **Scope**, **Aliases**, **Related** fields
4. Extract definition text (first paragraph after fields)

**Pattern**: `/^(#{1,3})\s+\[\[([^\]]+)\]\]/gm`
- `#{1,3}`: H1-H3 헤딩 레벨만 인식
- H4+ (`####`)는 용어 정의로 인식하지 않음
- 문서 구조용 섹션 헤딩과 명확히 구분

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
# [[Entry Point Module]]    # Error: Duplicate global term
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
