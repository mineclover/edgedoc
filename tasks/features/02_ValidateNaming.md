---
feature: "02_ValidateNaming"
entry_point: "src/cli.ts:36-50"
type: "validation"
status: "implemented"
code_references:
  - "src/cli.ts"
  - "src/parsers/TypeScriptParser.ts"
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

# 02_ValidateNaming - 네이밍 컨벤션 검증

## 개요

인터페이스 및 공유 타입 파일명의 네이밍 컨벤션을 검증합니다.

## CLI 명령어

```bash
mdoc validate naming [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)

## 주요 기능

### 1. 인터페이스 파일명 검증

**형식**: `XX--YY.md`

- 두 개의 feature ID를 `--`로 연결
- 작은 숫자가 앞에 위치 (정규화)

### 2. 공유 타입 파일명 검증

**형식**: `XX--YY_ZZ--WW.md`

- 여러 인터페이스 쌍을 `_`로 연결
- 각 쌍은 정규화 및 사전순 정렬 필수

**예시**:
- ✅ `03--04_03--06_05--06.md`
- ❌ `03--04_06--05.md` (05--06으로 정규화 필요)

### 3. 복잡도 검증

**설정**: `mdoc.config.json`

```json
{
  "validation": {
    "sharedTypes": {
      "maxPairs": 12,
      "warnAtPairs": 8
    }
  }
}
```

- 8개 쌍 이상: ⚠️ 경고 (Global type 고려 권장)
- 12개 쌍 이상: ❌ 에러 (Global type으로 격상 필수)

### 4. Frontmatter 검증

- 필수 필드 확인
- interfaces 배열 개수와 파일명 일치 확인
- 양방향 참조 일관성 검증

## 인터페이스

### 입력

- **CLI**: `00_Init--02_ValidateNaming`
- **NamingOptions**: NamingOptions 타입 사용

### 출력

- **CLI**: `02_ValidateNaming--00_Init`
- **NamingValidationResult**: NamingValidationResult 타입 반환

## 구현 상태

- ✅ 인터페이스 파일명 검증
- ✅ 공유 타입 파일명 검증
- ✅ 정규화 검증
- ✅ 정렬 검증
- ✅ 복잡도 검증 (설정 기반)
- ✅ Frontmatter 검증
