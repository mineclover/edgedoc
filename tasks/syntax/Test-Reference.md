---
feature: "syntax:Test-Reference"
type: "syntax"
status: "documented"
parser: "src/tools/implementation-coverage.ts:extractTestReferences"
validator: "src/validators/test-validator.ts"
related_features:
  - "18_ImplementationCoverage"
  - "17_TestDocLookup"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:85-95"
    - "tasks/features/09_MultiLanguageParser.md:75-85"
  invalid:
    - "docs/syntax/examples/test-missing-path.md"
    - "docs/syntax/examples/test-wrong-format.md"
---

# [[Test Reference]]

**Type**: Test Documentation Syntax
**Scope**: Feature Documents
**Used By**: Implementation Coverage Analysis (`edgedoc test coverage`)
**Validated By**: `extractTestReferences()` (src/tools/implementation-coverage.ts)

## 정의

Feature 문서에서 **테스트 파일**을 참조하는 문법입니다.

테스트 참조는:
- 실제 테스트 파일과 1:1 매핑되며
- 어떤 컴포넌트를 테스트하는지 명시하고
- 테스트 커버리지 분석에 사용됩니다

## 문법 (Syntax)

Test Reference는 2가지 패턴을 지원합니다:

### Pattern 1: JSDoc-style Reference (권장)

```markdown
## Testing

/**
 * @test path/to/test-file.test.ts
 */
```

**특징**:
- JSDoc 스타일로 명확하게 표현
- @test 태그로 테스트 파일 지정
- 간결하고 파싱하기 쉬움

**파싱 로직**:
```typescript
// Match: "* @test path/to/test.ts"
const testMatch = line.match(/\*\s+@test\s+(.+)/);
```

### Pattern 2: Inline Code Reference

```markdown
## Testing

Tests: `path/to/test-file.test.ts`
```

**특징**:
- 인라인 스타일로 간단하게 표현
- Tests: 접두사 사용
- Legacy 문서에서 발견됨

**파싱 로직**:
```typescript
// Match: "Tests: `path/to/test.ts`"
const testMatch = line.match(/Tests:\s*`([^`]+)`/);
```

## Section Requirements

Test Reference는 다음 섹션 내부에서만 유효합니다:

```markdown
## Testing          ✅ Valid
## Tests            ✅ Valid
## Test Coverage    ✅ Valid
## Solution         ❌ Invalid
## Architecture     ❌ Invalid
```

**파싱 로직**:
```typescript
// Detect valid sections
if (line.match(/^##\s+(Testing|Tests|Test Coverage)/i)) {
  inTestSection = true;
}
```

## Parser Implementation

**File**: src/tools/implementation-coverage.ts

**Function**: `extractTestReferences()`

**Interface**:
```typescript
export interface TestReference {
  testPath: string;      // Relative path to test file
  featureId: string;     // Parent feature ID
  docLine: number;       // Line number in doc
  testedComponents?: string[]; // Components being tested
}

export function extractTestReferences(
  docContent: string,
  featureId: string
): TestReference[];
```

**Algorithm**:
1. Find Testing/Tests section
2. Parse JSDoc @test pattern OR inline Tests: pattern
3. Extract test file path
4. Validate file exists
5. Return test references

## Validation Rules

### Rule 1: Test File Path Required

테스트 참조는 파일 경로를 명시해야 합니다:

```markdown
✅ Valid:
/**
 * @test src/tests/feature.test.ts
 */

❌ Invalid:
/**
 * @test
 */
```

### Rule 2: Test File Must Exist

명시된 테스트 파일은 실제로 존재해야 합니다:

```markdown
✅ Valid:
/**
 * @test src/tests/term-parser.test.ts
 */  # File exists

❌ Invalid:
/**
 * @test src/tests/missing.test.ts
 */  # File not found
```

### Rule 3: Valid Section

테스트 참조는 올바른 섹션 내부에 정의되어야 합니다:

```markdown
✅ Valid:
## Testing
/**
 * @test src/tests/feature.test.ts
 */

❌ Invalid:
## Solution
/**
 * @test src/tests/feature.test.ts
 */  # Wrong section
```

### Rule 4: Test File Naming Convention

테스트 파일은 `.test.ts` 또는 `.spec.ts` 확장자를 가져야 합니다:

```markdown
✅ Valid:
/**
 * @test src/tests/feature.test.ts
 */
/**
 * @test src/tests/feature.spec.ts
 */

❌ Invalid:
/**
 * @test src/tests/feature.ts
 */  # Missing .test or .spec
```

## Examples

### ✅ Valid Example 1: JSDoc Style

**Feature**: 13_ValidateTerms
**Location**: tasks/features/13_ValidateTerms.md:85

```markdown
## Testing

/**
 * @test src/tests/term-parser.test.ts
 * @test src/tests/term-registry.test.ts
 * @test src/tests/validate-terms.test.ts
 */
```

### ✅ Valid Example 2: Inline Style

**Feature**: 09_MultiLanguageParser
**Location**: tasks/features/09_MultiLanguageParser.md:75

```markdown
## Tests

Tests: `src/tests/parser-factory.test.ts`
Tests: `src/tests/language-detection.test.ts`
```

### ❌ Invalid Example 1: Missing Path

See: docs/syntax/examples/test-missing-path.md

```markdown
## Testing

/**
 * @test
 */
```

**Error**: Test reference missing file path

### ❌ Invalid Example 2: Wrong Format

See: docs/syntax/examples/test-wrong-format.md

```markdown
## Testing

Test: feature.test.ts
```

**Error**: Invalid test reference format (missing backticks or @test tag)

## Related Terms

- [[Component Definition]] - 테스트 대상 컴포넌트
- [[Implementation Coverage]] - 이 문법을 사용하는 기능
- [[Frontmatter Field]] - test_files와 연계
- [[Test Doc Lookup]] - 테스트 문서 조회 기능

## Usage Commands

Check test references:

```bash
# Find all test references
edgedoc test coverage

# Check specific feature
edgedoc test coverage --feature 13_ValidateTerms --verbose

# Validate syntax usage
edgedoc validate syntax --term "Test Reference"

# Find orphaned tests
edgedoc test lookup orphaned
```

## Implementation Status

- [x] Parser implementation (src/tools/implementation-coverage.ts)
- [x] Pattern 1: JSDoc @test support
- [x] Pattern 2: Inline Tests: support
- [x] Section validation
- [x] File existence check
- [ ] Validator implementation (src/validators/test-validator.ts)
- [ ] Test coverage analysis
- [ ] Auto-fix suggestions

## See Also

- [Test Doc Lookup](../features/17_TestDocLookup.md) - 테스트 문서 조회
- [Implementation Coverage](../features/18_ImplementationCoverage.md) - 구현 커버리지
- [Syntax Index](../../docs/syntax/INDEX.md) - 전체 문법 용어 색인
- [SYNTAX_GUIDE.md](../../docs/SYNTAX_GUIDE.md) - 사용자 문법 가이드
