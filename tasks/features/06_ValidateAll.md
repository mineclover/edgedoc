---
feature: "06_ValidateAll"
entry_point: "src/cli.ts:104-156"
type: "orchestration"
status: "implemented"
code_references:
  - "src/cli.ts"
  - "src/parsers/ParserFactory.ts"
  - "src/shared/i18n.ts"
  - "src/shared/types.ts"
  - "src/shared/utils.ts"
  - "src/tools/init.ts"
  - "src/tools/naming.ts"
  - "src/tools/orphans.ts"
  - "src/tools/spec-orphans.ts"
  - "src/tools/structure.ts"
  - "src/tools/sync.ts"
  - "src/tools/validate.ts"
  - "src/tools/validate-cross.ts"
  - "src/types/config.ts"
  - "src/utils/config.ts"
test_files:
  - "tests/integration/validation-pipeline.test.ts"
---

# 06_ValidateAll - 전체 검증

## 개요

모든 검증 기능을 순차적으로 실행하고 통합 리포트를 제공합니다.

## CLI 명령어

```bash
mdoc validate all [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)

## 주요 기능

### 1. 검증 실행 순서

**순차 실행**:
1. `validateMigration` - 마이그레이션 검증
2. `validateNaming` - 네이밍 컨벤션 검증
3. `validateStructure` - 문서 구조 검증
4. `validateOrphans` - 고아 파일 검증
5. `validateSpecOrphans` - 스펙 고아 코드 검증

각 검증 사이에 `\n` 출력으로 구분

### 2. 통합 결과 판정

**성공 조건**: 모든 검증이 성공

```typescript
const success =
  migrationResult.success &&
  namingResult.success &&
  structureResult.success &&
  orphansResult.success &&
  specOrphansResult.success;
```

### 3. 요약 리포트

**출력 형식**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 전체 검증 요약

마이그레이션: ✅ 통과
네이밍 컨벤션: ✅ 통과
구조 검증: ✅ 통과
고아 파일: ✅ 통과
스펙 고아 코드: ✅ 통과

✅ 전체 검증 통과
```

**실패 시**:
```
고아 파일: ⚠️  3개 발견
스펙 고아 코드: ❌ 5개 발견

❌ 일부 검증 실패
```

### 4. Exit Code

- `0`: 모든 검증 성공
- `1`: 하나 이상의 검증 실패

## 인터페이스

### 입력

- **CLI**: `00_Init--06_ValidateAll`
- **각 검증 기능**: 01~05 기능 호출

### 출력

- **CLI**: `06_ValidateAll--00_Init`
- **통합 결과**: 각 검증 결과를 집계

## 사용 예시

```bash
# 현재 디렉토리 검증
mdoc validate all

# 특정 프로젝트 검증
mdoc validate all -p ~/my-project

# CI/CD 파이프라인
mdoc validate all && echo "All validations passed!"
```

## 구현 상태

- ✅ 순차 검증 실행
- ✅ 통합 결과 판정
- ✅ 요약 리포트 출력
- ✅ Exit code 처리

## Tests

### 테스트 파일
- `tests/integration/validation-pipeline.test.ts` - End-to-end integration tests

### 테스트 커버리지

#### Phase 1: Individual Validations
1. **Migration Validation**
   - 마이그레이션 검증 실행
   - 결과 구조 검증 (success, totalFiles, passedFiles, failedFiles, totalErrors)
   - 파일 카운트 일관성 확인

2. **Naming Convention Validation**
   - 네이밍 컨벤션 검증 실행
   - 에러/경고 배열 구조 검증
   - 에러 객체 속성 확인 (category, severity, file, message)

3. **Structure Validation**
   - 문서 구조 검증 실행
   - 결과 객체 반환 확인

4. **Orphan File Validation**
   - 고아 파일 검증 실행
   - 결과 구조 검증 (success, orphanFiles, orphanFileList)
   - 고아 파일 목록 형식 확인

5. **Spec Orphan Validation**
   - 스펙 고아 코드 검증 실행
   - orphanExports 배열 검증
   - 고아 export 객체 구조 확인 (file, exportName, type)

6. **Interface Link Validation**
   - 인터페이스 링크 검증 실행
   - Summary 객체 검증 (errorCount, warningCount, totalFeatures, checkedInterfaces)
   - 에러/경고 배열 검증

7. **Term Validation**
   - 용어 검증 실행
   - 결과 구조 검증 (success, errors, warnings, stats)
   - 통계 객체 확인 (totalDefinitions, totalReferences, undefinedTerms)

#### Phase 2: Cross Validations
1. **Reference Index Building**
   - 인터페이스 참조 인덱스 구축
   - checkedInterfaces 카운트 검증

2. **Bidirectional Verification**
   - 양방향 링크 검증
   - 에러 타입 확인 (missing_bidirectional, orphan_interface)

#### Integration Tests
1. **Error Aggregation**
   - 모든 검증 단계의 에러 집계
   - 전체 성공/실패 판정
   - 동시 다중 에러 처리

2. **Success/Failure Reporting**
   - 전체 검증 성공 시나리오
   - 개별 검증 실패 시나리오
   - 검증 요약 생성 (counts, status)

3. **Options Support**
   - 커스텀 프로젝트 경로
   - 누락된 디렉토리 처리
   - includeNodeModules, includeDist 옵션
   - feature-specific 검증

4. **Performance and Reliability**
   - 전체 검증 완료 시간 (30초 이내)
   - 멱등성 검증 (동일한 결과 반환)
   - 동시 실행 처리

5. **Error Types and Messages**
   - 상세한 에러 정보 제공
   - 인터페이스 에러 분류
   - 실행 가능한 용어 에러 메시지

### 테스트 실행

```bash
# 전체 integration tests 실행
bun test tests/integration/

# validation pipeline 테스트만 실행
bun test tests/integration/validation-pipeline.test.ts

# verbose 모드
bun test tests/integration/validation-pipeline.test.ts --verbose
```

### 주요 테스트 시나리오

1. **Clean Project** - 모든 검증이 통과하는 프로젝트
2. **Migration Issues** - 마이그레이션 문제 감지
3. **Naming Violations** - 네이밍 규칙 위반 감지
4. **Orphan Files** - 고아 파일 감지
5. **Structure Issues** - 구조 문제 감지
6. **Spec Orphans** - 스펙 고아 코드 감지
7. **Term Issues** - 용어 문제 감지
8. **Error Aggregation** - 여러 에러 동시 발생
9. **Summary Output** - 검증 요약 출력
10. **Multiple Errors** - 다중 동시 에러 처리
