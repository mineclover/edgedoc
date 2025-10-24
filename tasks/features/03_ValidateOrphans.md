---
feature: "03_ValidateOrphans"
entry_point: "src/cli.ts:52-70"
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

# 03_ValidateOrphans - 고아 파일 검증

## 개요

문서화되지 않고 사용되지 않는 파일(고아 파일)을 탐지합니다.

## CLI 명령어

```bash
mdoc validate orphans [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)
- `--include-node-modules` - node_modules 포함
- `--include-dist` - dist/build 디렉토리 포함

## 주요 기능

### 1. 고아 파일 정의

다음 조건을 모두 만족하는 파일:
- 문서의 `code_references`에 참조되지 않음
- 다른 코드 파일에서 import되지 않음

### 2. 검증 범위

**기본 제외 항목**:
- `node_modules/`
- `dist/`, `build/`
- `.git/`
- 설정 파일들 (`.gitignore`, `package.json` 등)

**포함 옵션**:
- `--include-node-modules`: node_modules 검사
- `--include-dist`: 빌드 디렉토리 검사

### 3. 파일 분류

- **source**: TypeScript/JavaScript 소스 파일
- **config**: 설정 파일
- **other**: 기타 파일

### 4. Import 분석

실제 코드 사용 여부를 확인하기 위해 import 문을 분석합니다.

## 인터페이스

### 입력

- **CLI**: `00_Init--03_ValidateOrphans`
- **OrphanOptions**: OrphanOptions 타입 사용

### 출력

- **CLI**: `03_ValidateOrphans--00_Init`
- **OrphanFilesResult**: OrphanFilesResult 타입 반환

## 구현 상태

- ✅ 고아 파일 탐지
- ✅ 문서 참조 확인
- ✅ Import 분석
- ✅ 파일 분류
- ✅ 제외 패턴 지원
