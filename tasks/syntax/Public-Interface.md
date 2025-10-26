---
feature: "syntax:Public-Interface"
type: "syntax"
status: "documented"
parser: "src/tools/implementation-coverage.ts:extractPublicInterfaces"
validator: "src/validators/interface-validator.ts"
related_features:
  - "18_ImplementationCoverage"
  - "12_AnalyzeEntryPoints"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:78-82"
    - "tasks/features/09_MultiLanguageParser.md:55-60"
  invalid:
    - "docs/syntax/examples/interface-missing-methods.md"
    - "docs/syntax/examples/interface-wrong-section.md"
---

# [[Public Interface]]

**Type**: Code Reference Syntax
**Scope**: Feature Documents
**Used By**: Implementation Coverage Analysis (`edgedoc test coverage --code`)
**Validated By**: `extractPublicInterfaces()` (src/tools/implementation-coverage.ts)

## 정의

Feature 문서에서 **Public Interface**(공개 API, 노출된 함수/메서드)를 정의하는 문법입니다.

Public Interface는:
- 컴포넌트가 외부에 노출하는 공개 API를 명시하고
- 실제 코드 구현과 비교하여 커버리지를 확인하며
- 문서와 코드의 동기화를 보장합니다

## 문법 (Syntax)

Public Interface는 2가지 패턴을 지원합니다:

### Pattern 1: Bullet List under Component (권장)

```markdown
## Architecture

### Components

1. **ComponentName** (`path/to/file.ts`)
   - publicMethod1()
   - publicMethod2()
   - publicMethod3()
```

**특징**:
- 컴포넌트 정의 아래 직접 나열
- 함수 호출 형식으로 표현
- 가장 일반적인 형식

**파싱 로직**:
```typescript
// Match: "- methodName()"
const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\(/);
```

### Pattern 2: Public Interface Section

```markdown
## Public Interface

### ComponentName

- methodName()
- anotherMethod()
- thirdMethod()
```

**특징**:
- 별도 Public Interface 섹션에서 정의
- 컴포넌트별로 그룹화
- 인터페이스가 복잡한 경우 유용

**파싱 로직**:
```typescript
// Detect section
if (line.match(/^##\s+Public Interface/i)) {
  inInterfaceSection = true;
}

// Match component heading
const componentMatch = line.match(/^###\s+([A-Z][A-Za-z0-9_\s]+)/);

// Match methods
const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\(/);
```

## Method Syntax Variants

메서드는 여러 형식으로 표현할 수 있습니다:

### Variant 1: Function Call Style

```markdown
- methodName()
- anotherMethod()
```

### Variant 2: With Description

```markdown
- methodName(): Returns something important
- anotherMethod(): Does something else
```

### Variant 3: With Parameters

```markdown
- methodName(param1, param2)
- anotherMethod(options?: Options)
```

**파싱 로직**:
```typescript
// All variants match:
const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
// Extract just the method name (everything before '(')
```

## Section Requirements

Public Interface는 다음 섹션에서 정의할 수 있습니다:

```markdown
## Architecture        ✅ Valid (under Components)
## Components          ✅ Valid (under numbered list)
## Implementation      ✅ Valid (under Components)
## Public Interface    ✅ Valid (dedicated section)
## Solution            ❌ Invalid
## Usage               ❌ Invalid
```

## Parser Implementation

**File**: src/tools/implementation-coverage.ts

**Function**: `extractPublicInterfaces()`

**Interface**:
```typescript
export interface PublicInterface {
  componentName: string;    // Parent component name
  methodName: string;       // Method name
  signature?: string;       // Full signature with params
  description?: string;     // Optional description
  featureId: string;        // Parent feature ID
  docLine: number;          // Line number in doc
}

export function extractPublicInterfaces(
  docContent: string,
  featureId: string
): PublicInterface[];
```

**Algorithm**:
1. Find Architecture/Components/Public Interface section
2. Identify parent component
3. Parse bullet list of methods
4. Extract method name, signature, description
5. Link to parent component
6. Return all public interfaces

## Validation Rules

### Rule 1: Method Name Format

메서드 이름은 유효한 JavaScript 식별자여야 합니다:

```markdown
✅ Valid:
- methodName()
- _privateMethod()
- method123()

❌ Invalid:
- 123method()      # Starts with number
- method-name()    # Contains hyphen
- method name()    # Contains space
```

### Rule 2: Parentheses Required

모든 메서드는 괄호를 포함해야 합니다:

```markdown
✅ Valid:
- methodName()
- methodName(param)

❌ Invalid:
- methodName      # Missing parentheses
```

### Rule 3: Must Have Parent Component

Public Interface는 컴포넌트 아래에 정의되어야 합니다:

```markdown
✅ Valid:
1. **ComponentName** (`path.ts`)
   - methodName()

✅ Valid:
## Public Interface
### ComponentName
- methodName()

❌ Invalid:
## Public Interface
- methodName()    # No parent component
```

### Rule 4: Valid Section

Public Interface는 올바른 섹션에서만 정의할 수 있습니다:

```markdown
✅ Valid:
## Architecture
1. **ComponentName** (`path.ts`)
   - methodName()

✅ Valid:
## Public Interface
### ComponentName
- methodName()

❌ Invalid:
## Usage
### ComponentName
- methodName()    # Wrong section
```

## Examples

### ✅ Valid Example 1: Under Component

**Feature**: 13_ValidateTerms
**Location**: tasks/features/13_ValidateTerms.md:78-82

```markdown
## Architecture

### Components

1. **TermRegistry** (`src/tools/term-registry.ts`)
   - addDefinition()
   - find()
   - search()
   - validate()
```

### ✅ Valid Example 2: Dedicated Section

**Feature**: 09_MultiLanguageParser
**Location**: tasks/features/09_MultiLanguageParser.md:55-60

```markdown
## Public Interface

### ParserFactory

- getParser(language: string)
- registerParser(language: string, parser: Parser)
- getSupportedLanguages()
```

### ✅ Valid Example 3: With Descriptions

```markdown
## Public Interface

### TermParser

- extractDefinitions(): Extract term definitions from markdown
- extractReferences(): Find all term references
- validate(): Validate term usage
```

### ❌ Invalid Example 1: Missing Methods

See: docs/syntax/examples/interface-missing-methods.md

```markdown
## Architecture

1. **ComponentName** (`path.ts`)
```

**Warning**: Component has no public methods defined

### ❌ Invalid Example 2: Wrong Section

See: docs/syntax/examples/interface-wrong-section.md

```markdown
## Solution

### ComponentName

- methodName()
```

**Error**: Public Interface defined in invalid section

## Related Terms

- [[Component Definition]] - 인터페이스를 가진 컴포넌트
- [[Entry Point]] - 진입점 함수/메서드
- [[Implementation Coverage]] - 이 문법을 사용하는 기능
- [[Frontmatter Field]] - entry_point와 연계

## Usage Commands

Check public interfaces:

```bash
# Find all public interfaces
edgedoc test coverage --code

# Check specific feature
edgedoc test coverage --code --feature 13_ValidateTerms --verbose

# Validate syntax usage
edgedoc validate syntax --term "Public Interface"

# Compare with actual code
edgedoc analyze entry-points --compare-docs
```

## Implementation Status

- [x] Parser implementation (src/tools/implementation-coverage.ts)
- [x] Pattern 1: Bullet list under component
- [x] Pattern 2: Dedicated Public Interface section
- [x] Method name extraction
- [x] Signature parsing
- [ ] Validator implementation (src/validators/interface-validator.ts)
- [ ] Code comparison (doc vs actual implementation)
- [ ] Auto-sync suggestions

## See Also

- [Implementation Coverage](../features/18_ImplementationCoverage.md) - 구현 커버리지
- [Analyze Entry Points](../features/12_AnalyzeEntryPoints.md) - 진입점 분석
- [Syntax Index](../../docs/syntax/INDEX.md) - 전체 문법 용어 색인
- [SYNTAX_GUIDE.md](../../docs/SYNTAX_GUIDE.md) - 사용자 문법 가이드
