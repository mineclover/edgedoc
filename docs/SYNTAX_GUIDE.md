# Syntax Guide

**Last Updated**: 2025-10-25
**Version**: 1.0

edgedoc 문서 작성 문법 가이드입니다.

---

## Overview

이 문서는 edgedoc 프로젝트에서 사용하는 문서 작성 문법을 설명합니다. 각 기능의 구현 스펙은 `tasks/features/` 디렉토리에 있으며, 이 가이드는 사용자 관점에서 문법을 설명합니다.

---

## Frontmatter Syntax

문서 최상단의 YAML 형식 메타데이터입니다. 자세한 구현 스펙은 [Feature 04: ValidateStructure](../tasks/features/04_ValidateStructure.md)를 참조하세요.

### Feature 문서

```yaml
---
feature: "04_ValidateStructure"
entry_point: "src/cli.ts:72-86"
type: "validation"
status: "implemented"
code_references:
  - "src/cli.ts"
  - "src/tools/structure.ts"
test_files:
  - "tests/unit/structure-validation.test.ts"
related_features:
  - "06_ValidateAll"
  - "10_Internationalization"
---
```

### Interface 문서

```yaml
---
from: "00_Init"
to: "01_ValidateMigration"
type: "command"
status: "implemented"
shared_types:
  - "00--01_ValidationResult"
---
```

### Shared Type 문서

```yaml
---
interfaces:
  - "00--01"
  - "00--02"
type: "shared"
status: "implemented"
---
```

---

## Term References

용어 정의 및 참조 문법입니다. 자세한 구현 스펙은 [Feature 13: ValidateTerms](../tasks/features/13_ValidateTerms.md)를 참조하세요.

### 용어 정의

헤딩에서 `[[Term]]` 형식으로 정의합니다:

```markdown
## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
```

### 용어 참조

본문에서 `[[Term]]` 형식으로 참조합니다:

```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

### 예시 작성 시 주의사항

예시를 작성할 때는 백틱으로 감싸서 실제 참조로 인식되지 않도록 합니다:

```markdown
✅ 올바름: 용어는 `[[Term]]` 형식으로 작성합니다.
❌ 잘못됨: 용어는 [[Term]] 형식으로 작성합니다.  (실제 참조로 인식됨)
```

---

## Test References

테스트 파일과 문서 간의 양방향 참조 시스템입니다.

### Documentation → Tests

Feature 문서의 frontmatter에서 테스트 파일을 참조합니다.

#### Frontmatter 필드

**`test_files`**: 이 feature를 테스트하는 파일 목록

```yaml
---
feature: "13_ValidateTerms"
type: "feature"
status: "implemented"
entry_point: "src/cli.ts"
code_references:
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"
test_files:
  - "tests/unit/term-validation.test.ts"
  - "tests/integration/term-commands.test.ts"
---
```

**`test_coverage`** (선택사항): 테스트 커버리지 정보

```yaml
---
feature: "13_ValidateTerms"
test_files:
  - "tests/unit/term-validation.test.ts"
test_coverage:
  functions: 90.48
  lines: 99.51
  branches: 87.23
---
```

#### 예시: Multiple Test Files

```yaml
---
feature: "06_ValidateAll"
type: "validation"
status: "implemented"
entry_point: "src/cli.ts:100-120"
code_references:
  - "src/tools/validate.ts"
test_files:
  - "tests/unit/validate-all.test.ts"
  - "tests/integration/validation-workflow.test.ts"
  - "tests/e2e/cli-validate.test.ts"
test_coverage:
  functions: 95.00
  lines: 98.50
---
```

### Tests → Documentation

테스트 파일에서 JSDoc 주석으로 feature 문서를 참조합니다.

#### JSDoc 어노테이션

**`@feature`**: 이 테스트가 검증하는 feature ID

**`@doc`**: Feature 문서 경로

**`@related`** (선택사항): 관련된 다른 feature ID

#### 기본 예시

```typescript
/**
 * Unit Tests: Term Validation & Management
 *
 * Tests for term definition parsing, reference extraction, and validation.
 *
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 */

describe('TermRegistry - Definition Management', () => {
  // test cases...
});
```

#### 전체 예시 (모든 어노테이션)

```typescript
/**
 * Integration Tests: Validation Workflow
 *
 * End-to-end tests for the complete validation pipeline including
 * structure validation, term validation, and cross-validation.
 *
 * @feature 06_ValidateAll
 * @doc tasks/features/06_ValidateAll.md
 * @related 04_ValidateStructure
 * @related 13_ValidateTerms
 *
 * Test Coverage:
 *   - Full validation pipeline
 *   - Error aggregation
 *   - Warning vs error separation
 *   - Exit code handling
 *   - Recursive validation dependencies
 */

describe('Validation Workflow', () => {
  describe('Complete Pipeline', () => {
    test('should run all validators in correct order', () => {
      // test implementation...
    });
  });
});
```

#### Multi-Feature 테스트

여러 feature를 동시에 테스트하는 경우:

```typescript
/**
 * Integration Tests: Parser Factory
 *
 * Tests for language parser factory and multi-language support.
 * This test validates the interaction between parser factory and
 * individual language parsers.
 *
 * @feature 09_MultiLanguageParser
 * @doc tasks/features/09_MultiLanguageParser.md
 * @related 12_AnalyzeEntryPoints
 *
 * Dependencies:
 *   - TypeScript parser (tree-sitter-typescript)
 *   - Python parser (tree-sitter-python)
 *   - Go parser (tree-sitter-go)
 */
```

### Bidirectional Lookup

양방향 참조 시스템의 작동 방식입니다.

#### 문서에서 테스트 찾기

```bash
# Feature 문서에서 test_files 필드 확인
edgedoc doc find 13_ValidateTerms

# 출력:
# 📄 Feature: 13_ValidateTerms
# Status: implemented
#
# Test Files:
#   - tests/unit/term-validation.test.ts
#   - tests/integration/term-commands.test.ts
#
# Test Coverage:
#   Functions: 90.48%
#   Lines: 99.51%
```

#### 테스트에서 문서 찾기

```bash
# 테스트 파일의 @feature, @doc 어노테이션 확인
edgedoc test find tests/unit/term-validation.test.ts

# 출력:
# 🧪 Test: tests/unit/term-validation.test.ts
#
# Feature: 13_ValidateTerms
# Doc: tasks/features/13_ValidateTerms.md
#
# Related Features:
#   (none specified)
```

#### 전체 테스트 커버리지 확인

```bash
# 모든 feature의 테스트 커버리지 확인
edgedoc test coverage

# 출력:
# 📊 Test Coverage Report
#
# ✅ Tested Features (12/15)
#   - 00_Init: tests/unit/init.test.ts
#   - 01_ValidateMigration: tests/unit/migration.test.ts
#   - 13_ValidateTerms: tests/unit/term-validation.test.ts
#   ...
#
# ⚠️  Untested Features (3/15)
#   - 14_ReverseReferenceIndex (planned)
#   - 15_TasksManagement (planned)
#   - 16_FeatureInfo (active - warning)
```

---

## CLI Commands

테스트-문서 참조 관련 CLI 명령어입니다.

### Test Lookup Commands

```bash
# Feature에서 테스트 파일 찾기
edgedoc test find --feature 13_ValidateTerms

# 출력:
# 🧪 Tests for 13_ValidateTerms:
#   - tests/unit/term-validation.test.ts
#   - tests/integration/term-commands.test.ts

# 테스트 파일에서 Feature 찾기
edgedoc doc find --test tests/unit/term-validation.test.ts

# 출력:
# 📄 Feature: 13_ValidateTerms
#    Doc: tasks/features/13_ValidateTerms.md
```

### Coverage Commands

```bash
# 전체 테스트 커버리지 확인
edgedoc test coverage

# Feature별 커버리지
edgedoc test coverage --feature 13_ValidateTerms

# 테스트되지 않은 feature만 표시
edgedoc test coverage --missing
```

### Validation Commands

```bash
# 테스트-문서 참조 동기화 검증
edgedoc validate test-sync

# 출력:
# ✅ Synchronization Check
#
# Valid References:
#   - 13_ValidateTerms ↔ tests/unit/term-validation.test.ts
#   - 06_ValidateAll ↔ tests/integration/validation-workflow.test.ts
#
# ❌ Errors:
#   - Feature 16_FeatureInfo references non-existent test file
#     tasks/features/16_FeatureInfo.md:7
#     test_files: ["tests/unit/feature-info.test.ts"]
#     File not found!
#
#   - Test file missing @feature annotation
#     tests/unit/orphan-test.test.ts
#     Add: @feature <feature-id>
#
# ⚠️  Warnings:
#   - Feature 14_ReverseReferenceIndex (status: implemented)
#     No test files specified
#     Consider adding tests
```

---

## Validation Rules

### Test File References

**Rule 1**: `test_files` 필드의 파일이 실제로 존재해야 합니다.

```yaml
# ❌ 잘못됨
test_files:
  - "tests/unit/non-existent.test.ts"  # 파일 없음 → 에러
```

```yaml
# ✅ 올바름
test_files:
  - "tests/unit/term-validation.test.ts"  # 파일 존재 ✓
```

**Rule 2**: 테스트 파일은 `@feature` 어노테이션을 가져야 합니다.

```typescript
// ❌ 잘못됨
/**
 * Unit Tests: Term Validation
 */
describe('TermRegistry', () => {
  // @feature 어노테이션 없음 → 경고
});
```

```typescript
// ✅ 올바름
/**
 * Unit Tests: Term Validation
 *
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 */
describe('TermRegistry', () => {
  // 어노테이션 존재 ✓
});
```

### Feature-Test Consistency

**Rule 3**: `@feature`가 가리키는 feature 문서가 존재해야 합니다.

```typescript
// ❌ 잘못됨
/**
 * @feature 99_NonExistent  // Feature 문서 없음 → 에러
 */
```

**Rule 4**: 양방향 참조가 일치해야 합니다.

```yaml
# Feature 문서
---
feature: "13_ValidateTerms"
test_files:
  - "tests/unit/term-validation.test.ts"
---
```

```typescript
// 테스트 파일
/**
 * @feature 13_ValidateTerms  // ✓ 일치
 * @doc tasks/features/13_ValidateTerms.md
 */
```

### Coverage Warnings

**Warning 1**: `status: implemented` 또는 `status: active` feature는 테스트가 있어야 합니다.

```yaml
# ⚠️  경고
---
feature: "16_FeatureInfo"
status: "implemented"
# test_files 필드 없음 → 경고
---
```

**Warning 2**: `status: planned` feature는 테스트가 없어도 됩니다.

```yaml
# ✅ 정상
---
feature: "14_ReverseReferenceIndex"
status: "planned"
# test_files 없어도 OK (아직 구현 전)
---
```

### Orphan Detection

**Rule 5**: 테스트 파일은 feature 문서에서 참조되어야 합니다.

```bash
# 고아 테스트 검출
edgedoc validate test-sync --strict

# 출력:
# ⚠️  Orphan Test Files:
#   - tests/unit/old-feature.test.ts
#     Not referenced by any feature document
#     Consider: Delete or add to feature's test_files
```

---

## Complete Examples

### Example 1: Simple Feature with Single Test

**Feature 문서**: `tasks/features/08_Config.md`

```yaml
---
feature: "08_Config"
type: "core"
status: "implemented"
entry_point: "src/utils/config.ts"
code_references:
  - "src/utils/config.ts"
  - "src/types/config.ts"
test_files:
  - "tests/unit/config.test.ts"
---

# Config Management

설정 파일(`mdoc.config.json`) 로드 및 검증 기능.
```

**테스트 파일**: `tests/unit/config.test.ts`

```typescript
/**
 * Unit Tests: Config Management
 *
 * Tests for configuration file loading, validation, and defaults.
 *
 * @feature 08_Config
 * @doc tasks/features/08_Config.md
 *
 * Test Coverage:
 *   - Load config from file
 *   - Apply default values
 *   - Validate config schema
 *   - Handle missing config
 */

import { describe, test, expect } from 'bun:test';
import { loadConfig } from '../../src/utils/config.js';

describe('Config Loading', () => {
  test('should load config from mdoc.config.json', () => {
    const config = loadConfig('/path/to/project');
    expect(config).toBeDefined();
  });
});
```

### Example 2: Complex Feature with Multiple Tests

**Feature 문서**: `tasks/features/13_ValidateTerms.md`

```yaml
---
feature: "13_ValidateTerms"
type: "validation"
status: "implemented"
entry_point: "src/cli.ts"
code_references:
  - "src/tools/validate-terms.ts"
  - "src/tools/term-registry.ts"
  - "src/parsers/TermParser.ts"
test_files:
  - "tests/unit/term-validation.test.ts"
  - "tests/integration/term-commands.test.ts"
test_coverage:
  functions: 90.48
  lines: 99.51
related_features:
  - "06_ValidateAll"
  - "10_Internationalization"
---

# Term Validation & Management

[[Term Definition]]과 참조의 일관성을 검증하고 용어를 관리하는 기능.
```

**단위 테스트**: `tests/unit/term-validation.test.ts`

```typescript
/**
 * Unit Tests: Term Validation & Management
 *
 * Tests for term definition parsing, reference extraction, and validation.
 *
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 *
 * Test Coverage:
 *   - Term definition parsing
 *   - Term reference extraction
 *   - Undefined term detection
 *   - Scope violation detection
 *   - Duplicate term detection
 */

import { describe, test, expect } from 'bun:test';
import { TermRegistry } from '../../src/tools/term-registry.js';

describe('TermRegistry - Definition Management', () => {
  test('should add and find term definitions', () => {
    // test implementation...
  });
});
```

**통합 테스트**: `tests/integration/term-commands.test.ts`

```typescript
/**
 * Integration Tests: Term Commands
 *
 * End-to-end tests for term list and search CLI commands.
 *
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 * @related 06_ValidateAll
 *
 * Test Coverage:
 *   - `edgedoc terms list` command
 *   - `edgedoc terms find` command
 *   - Fuzzy search functionality
 *   - Output formatting
 */

import { describe, test, expect } from 'bun:test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Term Commands', () => {
  test('should list all terms grouped by type', async () => {
    const { stdout } = await execAsync('edgedoc terms list');
    expect(stdout).toContain('Global Terms');
  });
});
```

### Example 3: Bidirectional Lookup Workflow

```bash
# 1. Feature 문서에서 시작
$ cat tasks/features/13_ValidateTerms.md
---
feature: "13_ValidateTerms"
test_files:
  - "tests/unit/term-validation.test.ts"
---

# 2. 테스트 파일 찾기
$ edgedoc test find --feature 13_ValidateTerms
🧪 Tests for 13_ValidateTerms:
  - tests/unit/term-validation.test.ts

# 3. 테스트 파일에서 역방향 조회
$ cat tests/unit/term-validation.test.ts
/**
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 */

# 4. 문서로 돌아가기
$ edgedoc doc find --test tests/unit/term-validation.test.ts
📄 Feature: 13_ValidateTerms
   Doc: tasks/features/13_ValidateTerms.md

# 5. 전체 동기화 검증
$ edgedoc validate test-sync
✅ All test-document references are synchronized
```

---

## Best Practices

### 1. Always Add Test References

구현된 feature는 반드시 테스트 참조를 추가하세요:

```yaml
# ✅ Good
---
feature: "MyFeature"
status: "implemented"
test_files:
  - "tests/unit/my-feature.test.ts"
---
```

```yaml
# ⚠️  Warning (테스트 없음)
---
feature: "MyFeature"
status: "implemented"
# test_files 없음
---
```

### 2. Use Descriptive JSDoc Comments

테스트 파일의 JSDoc 주석은 상세하게 작성하세요:

```typescript
// ✅ Good
/**
 * Unit Tests: Config Management
 *
 * Comprehensive tests for configuration file loading, validation,
 * and default value application.
 *
 * @feature 08_Config
 * @doc tasks/features/08_Config.md
 *
 * Test Coverage:
 *   - Load config from file
 *   - Apply default values
 *   - Validate config schema
 */
```

```typescript
// ❌ Bad (정보 부족)
/**
 * @feature 08_Config
 */
```

### 3. Group Related Tests

관련된 테스트는 함께 나열하세요:

```yaml
# ✅ Good (논리적 그룹화)
test_files:
  - "tests/unit/parser.test.ts"           # 단위 테스트
  - "tests/integration/parser-cli.test.ts" # 통합 테스트
  - "tests/e2e/parser-workflow.test.ts"   # E2E 테스트
```

### 4. Keep References Synchronized

문서와 테스트의 참조를 항상 동기화하세요:

```bash
# 변경 후 검증
$ edgedoc validate test-sync

# 커밋 전 확인
$ git add . && edgedoc validate test-sync && git commit
```

### 5. Document Test Coverage

가능하면 커버리지 정보를 추가하세요:

```yaml
test_files:
  - "tests/unit/my-feature.test.ts"
test_coverage:
  functions: 95.00
  lines: 98.50
  branches: 87.00
```

---

## Related Documentation

- [Feature 04: ValidateStructure](../tasks/features/04_ValidateStructure.md) - Frontmatter 규칙
- [Feature 13: ValidateTerms](../tasks/features/13_ValidateTerms.md) - 용어 정의 및 참조
- [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) - 검증 시스템 가이드
- [PROGRESS_TRACKING_GUIDE.md](PROGRESS_TRACKING_GUIDE.md) - 진행도 추적 가이드
- [GLOSSARY.md](GLOSSARY.md) - 용어집

---

**Maintained by**: edgedoc team
**Contact**: See main README.md
