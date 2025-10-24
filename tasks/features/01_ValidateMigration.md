---
feature: "01_ValidateMigration"
entry_point: "src/cli.ts:18-34"
type: "validation"
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

# 01_ValidateMigration - 마이그레이션 검증

## 개요

`tasks/` → `tasks-v2/` 점진적 마이그레이션을 검증하는 기능입니다. tasks-v2 디렉토리가 존재하면 자동으로 검증을 실행합니다.

## CLI 명령어

```bash
mdoc validate migration [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)
- `-m, --markdown` - 마크다운 리포트 생성 (`tasks-v2/MIGRATION_REPORT.md`)

## 주요 기능

### 1. 자동 감지

**코드**: `src/tools/validate.ts` (directory existence check)

- `tasks-v2/` 디렉토리가 존재하면 검증 실행
- 디렉토리가 없으면 검증 스킵

### 2. 마이그레이션 검증 항목

- SSOT (Single Source of Truth) 위반 검사
- 섹션 누락 검사
- 타입 정의 누락 검사
- Frontmatter 필드 검증

### 3. 리포트 생성

**옵션**: `--markdown`

마크다운 형식으로 검증 결과를 `tasks-v2/MIGRATION_REPORT.md`에 저장합니다.

## 인터페이스

### 입력

- **CLI**: `00_Init--01_ValidateMigration`
- **ValidationOptions**: ValidationOptions 타입 사용

### 출력

- **CLI**: `01_ValidateMigration--00_Init`
- **ValidationResult**: ValidationResult 타입 반환

## 구현 상태

- ✅ 자동 감지 로직
- ✅ SSOT 검증
- ✅ 섹션 검증
- ✅ 타입 검증
- ✅ 마크다운 리포트 생성
