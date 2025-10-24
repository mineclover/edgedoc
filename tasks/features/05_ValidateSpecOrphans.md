---
feature: "05_ValidateSpecOrphans"
entry_point: "src/cli.ts:88-102"
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

# 05_ValidateSpecOrphans - 스펙 고아 코드 검증

## 개요

문서화되지 않은 코드 export를 탐지합니다. Import 의존성 그래프를 통해 간접 문서화도 확인합니다.

## CLI 명령어

```bash
mdoc validate spec-orphans [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)

## 주요 기능

### 1. Export 탐지

**지원 타입**:
- `export interface Name`
- `export type Name`
- `export class Name`
- `export function name`
- `export const name`

**방식**: 정규표현식 기반 파싱

### 2. 문서 참조 추출

**소스**: Frontmatter `code_references` 필드

```yaml
---
code_references:
  - "src/tools/validate.ts"
  - "src/types/config.ts"
---
```

### 3. Import 의존성 그래프

**구조**: `Map<file, Set<importedFiles>>`

- 상대 경로 import 해석
- `.ts`, `.tsx`, `.js`, `.jsx`, `/index.*` 확장자 지원
- 순환 참조 처리

### 4. 간접 문서화 확인

**로직**: BFS(Breadth-First Search)

고아 코드 판정 조건:
- 직접 문서화 안 됨 (code_references에 없음)
- **AND** 간접 문서화 안 됨 (문서화된 코드에서 import 안 됨)

**예시**:
```
TypeA (문서화됨) → TypeB (문서화 안 됨) → TypeC (문서화 안 됨)

결과:
- TypeB: 고아 아님 (TypeA에서 import)
- TypeC: 고아 아님 (TypeB가 TypeA에 연결됨)
```

## 인터페이스

### 입력

- **CLI**: `00_Init--05_ValidateSpecOrphans`
- **ValidationOptions**: ValidationOptions 타입 사용

### 출력

- **CLI**: `05_ValidateSpecOrphans--00_Init`
- **SpecOrphanResult**: SpecOrphanResult 타입 반환

## 구현 상태

- ✅ Export 탐지 (regex 기반)
- ✅ 문서 참조 추출
- ✅ Import 그래프 구축
- ✅ 상대 경로 해석
- ✅ BFS 기반 reachability 분석
- ✅ 고아 코드 리포팅
- 🔄 Tree-sitter 통합 (향후 계획)
