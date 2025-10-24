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
  - "src/types/config.ts"
  - "src/utils/config.ts"
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
