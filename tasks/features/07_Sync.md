---
feature: "07_Sync"
entry_point: "src/cli.ts:158-170"
type: "synchronization"
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

# 07_Sync - 코드 참조 동기화

## 개요

문서와 코드 간의 참조를 동기화하는 기능입니다. (개발 예정)

## CLI 명령어

```bash
mdoc sync
```

## 계획된 기능

### 1. 코드 참조 업데이트

**대상**: Frontmatter `code_references` 필드

- 실제 코드 구조 스캔
- 문서와 코드 매핑
- 자동 참조 업데이트

### 2. 양방향 동기화

**방향 1: 코드 → 문서**
- 코드 변경 감지
- 관련 문서 업데이트

**방향 2: 문서 → 코드**
- 문서 구조 변경 감지
- 코드 스캔 범위 조정

### 3. 변경 감지

**추적 항목**:
- 파일 추가/삭제
- Export 추가/삭제
- Import 관계 변경

## 인터페이스

### 입력

- **CLI**: `00_Init--07_Sync`

### 출력

- **CLI**: `07_Sync--00_Init`
- **SyncResult**: SyncResult 타입 반환

## 구현 상태

- ✅ **구현 완료**
- ✅ 코드 스캔 로직 (Tree-sitter 기반)
- ✅ 참조 매칭 알고리즘
- ✅ 자동 업데이트 로직
- ✅ Dry-run 모드
- ✅ Multi-language 지원 (TypeScript, JavaScript, Python)
