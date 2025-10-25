---
term: "Component Definition"
syntax_type: "documentation_structure"
parser: "src/tools/implementation-coverage.ts:extractDocumentedComponents"
validator: "docs/syntax/validators/component-validator.ts"
related_terms:
  - "[[Architecture Section]]"
  - "[[Public Interface]]"
  - "[[Implementation Coverage]]"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:56-75"
    - "tasks/features/09_MultiLanguageParser.md:45-65"
    - "tasks/features/10_Internationalization.md:40-55"
  invalid:
    - "docs/syntax/examples/component-missing-path.md"
    - "docs/syntax/examples/component-wrong-section.md"
---

# [[Component Definition]]

**Type**: Documentation Structure
**Scope**: Feature Documents
**Used By**: Implementation Coverage Analysis (`edgedoc test coverage --code`)
**Validated By**: `extractDocumentedComponents()` (src/tools/implementation-coverage.ts:165-280)

## 정의

Feature 문서의 Architecture 섹션에서 **컴포넌트**(주요 클래스, 모듈, 함수 그룹)를 정의하는 문법입니다.

컴포넌트는:
- 실제 코드 파일과 1:1 매핑되며
- Public 인터페이스를 노출하고
- Feature의 핵심 구현 단위입니다

## 문법 (Syntax)

Component Definition은 3가지 패턴을 지원합니다:

### Pattern 1: Numbered List (권장)

```markdown
## Architecture

### Components

1. **ComponentName** (`path/to/file.ts`)
   - publicMethod1()
   - publicMethod2()
   - publicMethod3()

2. **AnotherComponent** (`path/to/another.ts`)
   - anotherMethod()
```

**특징**:
- 가장 명확하고 간결한 형식
- 컴포넌트 이름과 파일 경로를 한 줄에 표현
- Method는 bullet point로 나열

**파싱 로직**:
```typescript
// Match: "1. **ComponentName** (`path/to/file.ts`)"
const numberedMatch = line.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*\s+\(`([^`]+)`\)/);
```

### Pattern 2: Heading with File Field

```markdown
## Architecture

### ComponentName

**File**: `path/to/file.ts`

- publicMethod1()
- publicMethod2()
```

**특징**:
- 컴포넌트 이름이 ### 헤딩으로 표현
- 파일 경로는 **File**: 필드로 별도 명시
- 설명이 긴 경우 유용

**파싱 로직**:
```typescript
// Match heading: "### ComponentName"
const headingMatch = line.match(/^###\s+([A-Z][A-Za-z0-9_\s]+)/);

// Match file field: "**File**: `path`"
const fileMatch = line.match(/^\*\*File\*\*:\s*`([^`]+)`/);
```

### Pattern 3: Heading with Location Field

```markdown
## Implementation

### ComponentName

**Location**: `path/to/file.ts`

- publicMethod1()
- publicMethod2()
```

**특징**:
- Pattern 2와 유사하지만 **Location**: 사용
- **Implementation** 섹션에서도 사용 가능
- 일부 legacy 문서에서 발견됨

**파싱 로직**:
```typescript
// Match location field: "**Location**: `path`"
const fileMatch = line.match(/^\*\*Location\*\*:\s*`([^`]+)`/);
```

## Section Requirements

Component Definition은 다음 섹션 내부에서만 유효합니다:

```markdown
## Architecture      ✅ Valid
## Components        ✅ Valid
## Implementation    ✅ Valid
## Solution          ❌ Invalid
## Usage             ❌ Invalid
```

**파싱 로직**:
```typescript
// Detect valid sections
if (line.match(/^##\s+(Components|Architecture|Implementation)/i)) {
  inArchitectureSection = true;
}
```

## Method Definition

컴포넌트 아래 bullet point로 public method를 정의할 수 있습니다:

### Method Pattern 1: Function Call Style

```markdown
1. **ComponentName** (`path/to/file.ts`)
   - methodName()
   - anotherMethod()
```

**파싱 로직**:
```typescript
// Match: "- methodName()"
const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\(/);
```

### Method Pattern 2: Description Style

```markdown
1. **ComponentName** (`path/to/file.ts`)
   - methodName: Does something important
   - anotherMethod: Another feature
```

**파싱 로직**:
```typescript
// Match: "- methodName: description"
const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):/);
```

## Parser Implementation

**File**: src/tools/implementation-coverage.ts:165-280

**Function**: `extractDocumentedComponents()`

**Full Implementation**:
```typescript
export function extractDocumentedComponents(
  docContent: string,
  featureId: string
): DocumentedComponent[] {
  const components: DocumentedComponent[] = [];
  const lines = docContent.split('\n');

  let inArchitectureSection = false;
  let currentComponent: Partial<DocumentedComponent> | null = null;
  let currentMethods: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Architecture/Components/Implementation section
    if (line.match(/^##\s+(Components|Architecture|Implementation)/i)) {
      inArchitectureSection = true;
      continue;
    }

    // Exit section on next ## heading
    if (inArchitectureSection && line.match(/^##\s+[^#]/)) {
      // Save last component
      if (currentComponent && currentComponent.name && currentComponent.filePath) {
        components.push({
          ...currentComponent,
          publicMethods: currentMethods,
        } as DocumentedComponent);
      }
      break;
    }

    if (!inArchitectureSection) continue;

    // Pattern 1: Numbered list
    const numberedMatch = line.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*\s+\(`([^`]+)`\)/);
    if (numberedMatch) {
      // Save previous component
      if (currentComponent && currentComponent.name && currentComponent.filePath) {
        components.push({
          ...currentComponent,
          publicMethods: currentMethods,
        } as DocumentedComponent);
      }

      currentComponent = {
        name: numberedMatch[1].trim(),
        filePath: numberedMatch[2].trim(),
        description: '',
        featureId,
        docLine: i + 1,
      };
      currentMethods = [];
      continue;
    }

    // Pattern 2 & 3: Heading
    const headingMatch = line.match(/^###\s+([A-Z][A-Za-z0-9_\s]+)/);
    if (headingMatch) {
      // Save previous component
      if (currentComponent && currentComponent.name && currentComponent.filePath) {
        components.push({
          ...currentComponent,
          publicMethods: currentMethods,
        } as DocumentedComponent);
      }

      currentComponent = {
        name: headingMatch[1].trim(),
        filePath: '', // Will be filled by **File**: or **Location**:
        description: '',
        featureId,
        docLine: i + 1,
      };
      currentMethods = [];
      continue;
    }

    // Extract file path
    const fileMatch = line.match(/^\*\*(File|Location)\*\*:\s*`([^`]+)`/);
    if (fileMatch && currentComponent) {
      currentComponent.filePath = fileMatch[2].trim();
      continue;
    }

    // Extract methods
    if (currentComponent) {
      const methodMatch1 = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\(/);
      const methodMatch2 = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):/);

      if (methodMatch1) {
        currentMethods.push(methodMatch1[1]);
      } else if (methodMatch2) {
        currentMethods.push(methodMatch2[1]);
      }
    }
  }

  // Save last component
  if (currentComponent && currentComponent.name && currentComponent.filePath) {
    components.push({
      ...currentComponent,
      publicMethods: currentMethods,
    } as DocumentedComponent);
  }

  return components;
}
```

## Validation Rules

### Rule 1: Component Name Format

컴포넌트 이름은 대문자로 시작해야 합니다:

```markdown
✅ Valid:
1. **ComponentName** (`path.ts`)
1. **Component Name** (`path.ts`)  # Spaces allowed

❌ Invalid:
1. **componentName** (`path.ts`)   # Lowercase start
1. **component_name** (`path.ts`)  # Lowercase start
```

### Rule 2: File Path Required

모든 컴포넌트는 파일 경로를 명시해야 합니다:

```markdown
✅ Valid:
1. **ComponentName** (`path/to/file.ts`)

❌ Invalid:
1. **ComponentName**  # Missing file path
```

### Rule 3: File Must Exist

명시된 파일 경로는 실제로 존재해야 합니다:

```markdown
✅ Valid:
1. **TermParser** (`src/parsers/TermParser.ts`)  # File exists

❌ Invalid:
1. **MissingComponent** (`src/missing.ts`)  # File not found
```

### Rule 4: Valid Section

컴포넌트는 올바른 섹션 내부에 정의되어야 합니다:

```markdown
✅ Valid:
## Architecture
### Components
1. **ComponentName** (`path.ts`)

✅ Valid:
## Implementation
### ComponentName
**File**: `path.ts`

❌ Invalid:
## Solution
1. **ComponentName** (`path.ts`)  # Wrong section
```

## Examples

### ✅ Valid Example 1: Numbered List (13_ValidateTerms.md)

See: tasks/features/13_ValidateTerms.md:56-75

```markdown
## Architecture

### Components

1. **TermParser** (`src/parsers/TermParser.ts`)
   - extractDefinitions()
   - extractReferences()

2. **TermRegistry** (`src/tools/term-registry.ts`)
   - addDefinition()
   - find()
   - search()
   - validate()

3. **validateTerms** (`src/tools/validate-terms.ts`)
   - validateTerms()

4. **Term Commands** (`src/tools/term-commands.ts`)
   - listTerms()
   - findTerm()
```

### ✅ Valid Example 2: Heading with File (10_Internationalization.md)

See: tasks/features/10_Internationalization.md:40-55

```markdown
## Architecture

### TranslationManager

**File**: `src/shared/i18n.ts`

- loadTranslations()
- t()
- setLocale()
```

### ✅ Valid Example 3: Heading with Location (09_MultiLanguageParser.md)

See: tasks/features/09_MultiLanguageParser.md:45-65

```markdown
## Implementation

### ParserFactory

**Location**: `src/parsers/ParserFactory.ts`

- getParser()
- registerParser()
```

### ❌ Invalid Example 1: Missing Path

```markdown
## Architecture

### Components

1. **ComponentName**
   - method1()
```

**Error**: Component missing file path

### ❌ Invalid Example 2: Wrong Section

```markdown
## Solution

1. **ComponentName** (`path.ts`)
```

**Error**: Component defined outside Architecture/Components/Implementation section

### ❌ Invalid Example 3: File Not Found

```markdown
## Architecture

1. **MissingComponent** (`src/does-not-exist.ts`)
```

**Error**: Referenced file does not exist

## Related Terms

- [[Architecture Section]] - 상위 섹션 정의
- [[Public Interface]] - 구현된 코드 인터페이스
- [[Implementation Coverage]] - 이 문법을 사용하는 기능
- [[Frontmatter Field]] - code_references와 연계

## Usage in Project

Check component definitions:

```bash
# Find all component definitions
edgedoc test coverage --code

# Check specific feature
edgedoc test coverage --code --feature 13_ValidateTerms --verbose
```

Validate syntax:

```bash
# Validate all component definitions
edgedoc validate syntax --term "Component Definition"

# Find usage in project
edgedoc syntax usage "Component Definition"
```

## Parser Location

**Main Parser**: src/tools/implementation-coverage.ts:165-280

**Called By**:
- `calculateFeatureCoverage()` (src/tools/implementation-coverage.ts:387)
- `generateImplementationCoverage()` (src/tools/implementation-coverage.ts:561)

**CLI Command**: `edgedoc test coverage --code`

## See Also

- [Implementation Specification](../../../tasks/features/18_ImplementationCoverage.md) - Feature 구현 스펙
- [SYNTAX_GUIDE.md](../../SYNTAX_GUIDE.md) - 전체 문법 가이드
- [VALIDATION_GUIDE.md](../../VALIDATION_GUIDE.md) - 검증 시스템
