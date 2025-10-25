---
feature: "17_TestDocLookup"
entry_point: "src/cli.ts:837-919"
type: "query"
status: "implemented"
code_references:
  - "src/cli.ts"
  - "src/tools/test-doc-lookup.ts"
test_files:
  - "tests/unit/test-doc-lookup.test.ts"
related_features:
  - "13_ValidateTerms"
  - "12_AnalyzeEntryPoints"
  - "06_ValidateAll"
---

# 17_TestDocLookup - Test-Document Reference Lookup

## 개요

테스트 파일과 Feature 문서 간의 양방향 참조를 조회하고 검증하는 기능을 제공합니다.

## CLI 명령어

### 1. Test Lookup

Feature ID로 테스트 파일 찾기:

```bash
edgedoc test find --feature <feature-id>
```

**출력 예시**:
```
🧪 Tests for 13_ValidateTerms:
  - tests/unit/term-validation.test.ts
  - tests/integration/term-commands.test.ts

📊 Coverage:
  Functions: 90.48%
  Lines: 99.51%
```

### 2. Doc Lookup

테스트 파일로 Feature 문서 찾기:

```bash
edgedoc docs find --test <test-file-path>
```

**출력 예시**:
```
📄 Feature: 13_ValidateTerms
   Doc: tasks/features/13_ValidateTerms.md

🔗 Related:
  - 14_ReverseReferenceIndex
  - 15_TasksManagement
```

### 3. Test Coverage Report

전체 또는 특정 Feature의 테스트 커버리지 확인:

```bash
# 전체 커버리지
edgedoc test coverage

# 특정 Feature
edgedoc test coverage --feature 13_ValidateTerms

# 테스트 없는 Feature만 표시
edgedoc test coverage --missing
```

**출력 예시**:
```
📊 Test Coverage Report

Total Features: 18
✅ Tested: 4 (22.2%)
⚠️  Untested: 14 (77.8%)

─────────────────────────────────────────────

✅ 13_ValidateTerms
  - tests/unit/term-validation.test.ts
  Coverage: 90.5% functions, 99.5% lines

⚠️  01_ValidateMigration
  No tests
```

### 4. Sync Validation

테스트-문서 참조 동기화 검증:

```bash
edgedoc validate test-sync
```

**출력 예시**:
```
✅ Synchronization Check

Valid References:
  - 13_ValidateTerms ↔ tests/unit/term-validation.test.ts
  - 06_ValidateAll ↔ tests/integration/validation-pipeline.test.ts

❌ Errors:
  - Test file missing @feature annotation
    tests/unit/orphan-test.test.ts
    Add: @feature <feature-id>

⚠️  Warnings:
  - 01_ValidateMigration (tasks/features/01_ValidateMigration.md)
    No test files specified
    Consider adding tests
```

## 주요 기능

### 1. Bidirectional Lookup

**Document → Test**:
- Feature 문서의 `test_files` frontmatter에서 참조 추출
- 실제 파일 존재 여부 확인
- Coverage 정보 표시 (functions, lines)

**Test → Document**:
- 테스트 파일의 `@feature`, `@doc` JSDoc 어노테이션 파싱
- Related features 추출 (`@related` 태그)
- Feature 문서 경로 반환

### 2. Coverage Analysis

**수집 데이터**:
- Total features count
- Tested features count
- Untested features count
- Per-feature test files
- Per-feature coverage metrics

**필터링**:
- `--feature <id>`: 특정 Feature만 표시
- `--missing`: 테스트 없는 Feature만 표시

### 3. Synchronization Validation

**검증 항목**:

1. **File Existence**:
   - `test_files`에 명시된 파일이 실제로 존재하는지 확인
   - 에러: `file_not_found`

2. **Feature Annotations**:
   - 모든 테스트 파일이 `@feature` 어노테이션을 가지는지 확인
   - 에러: `missing_feature_annotation`

3. **Implementation Status**:
   - `status: implemented`인 Feature가 테스트가 없으면 경고
   - 경고: `no_tests`

## 인터페이스

### 입력

**CLI Commands**:
- `test find --feature <id>`
- `docs find --test <path>`
- `test coverage [--feature <id>] [--missing]`
- `validate test-sync`

### 출력

**Data Structures**:

```typescript
interface TestReference {
  featureId: string;
  docPath: string;
  testFiles: string[];
  coverage?: {
    functions?: number;
    lines?: number;
  };
}

interface DocReference {
  testFile: string;
  featureId?: string;
  docPath?: string;
  relatedFeatures?: string[];
}

interface CoverageReport {
  total: number;
  tested: number;
  untested: number;
  features: Array<{
    featureId: string;
    docPath: string;
    tested: boolean;
    testFiles: string[];
    coverage?: {
      functions?: number;
      lines?: number;
    };
  }>;
}

interface SyncValidationResult {
  valid: TestReference[];
  errors: Array<{
    type: 'missing_test_file' | 'missing_feature_annotation' | 'file_not_found';
    message: string;
    file: string;
    line?: number;
  }>;
  warnings: Array<{
    type: 'no_tests' | 'incomplete_coverage';
    message: string;
    featureId: string;
    docPath: string;
  }>;
}
```

## 사용 예시

### 1. Feature에서 테스트 찾기

```bash
# Term Validation 테스트 찾기
edgedoc test find --feature 13_ValidateTerms

# 출력:
# 🧪 Tests for 13_ValidateTerms:
#   - tests/unit/term-validation.test.ts
```

### 2. 테스트에서 Feature 찾기

```bash
# 테스트 파일이 어느 Feature를 테스트하는지 확인
edgedoc docs find --test tests/unit/term-validation.test.ts

# 출력:
# 📄 Feature: 13_ValidateTerms
#    Doc: tasks/features/13_ValidateTerms.md
```

### 3. 전체 커버리지 확인

```bash
# 모든 Feature의 테스트 현황 확인
edgedoc test coverage

# 테스트 없는 Feature만 확인
edgedoc test coverage --missing
```

### 4. CI/CD 파이프라인

```bash
# 테스트-문서 동기화 검증
edgedoc validate test-sync

# Exit code:
# 0 - 모든 참조 유효
# 1 - 에러 발견 (파일 없음, 어노테이션 없음 등)
```

## 구현 상태

- ✅ Test lookup (feature → test files)
- ✅ Doc lookup (test → feature)
- ✅ Coverage reporting
- ✅ Sync validation
- ✅ Frontmatter parsing (`test_files`, `test_coverage`)
- ✅ JSDoc annotation parsing (`@feature`, `@doc`, `@related`)
- ✅ CLI commands
- ❌ Unit tests (planned)

## Tests

**Test File**: TBD - `tests/unit/test-doc-lookup.test.ts`

### Planned Test Coverage

1. **Test Lookup**:
   - Find tests for existing feature
   - Handle feature without tests
   - Parse coverage metrics
   - Handle missing feature

2. **Doc Lookup**:
   - Find doc for test with @feature
   - Handle test without @feature
   - Parse related features
   - Handle non-existent test file

3. **Coverage Report**:
   - Generate full report
   - Filter by feature ID
   - Filter missing only
   - Calculate percentages

4. **Sync Validation**:
   - Detect missing test files
   - Detect missing @feature annotations
   - Warn on implemented features without tests
   - Validate file existence

## 관련 문서

- [SYNTAX_GUIDE.md](../../docs/SYNTAX_GUIDE.md#test-references) - Test-Doc 참조 문법
- [VALIDATION_GUIDE.md](../../docs/VALIDATION_GUIDE.md) - 검증 워크플로우
- [13_ValidateTerms.md](13_ValidateTerms.md) - Term Validation (참조 예시)
- [12_AnalyzeEntryPoints.md](12_AnalyzeEntryPoints.md) - Entry Point Detection (참조 예시)
- [06_ValidateAll.md](06_ValidateAll.md) - Validation Pipeline (참조 예시)
