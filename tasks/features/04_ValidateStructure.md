---
feature: "04_ValidateStructure"
entry_point: "src/cli.ts:72-86"
code_references:
  - "src/cli.ts"
  - "src/tools/structure.ts"
  - "src/types/config.ts"
  - "src/utils/config.ts"
type: "validation"
status: "implemented"
---

# 04_ValidateStructure - 문서 구조 검증

## 개요

문서 구조의 일관성, 순환 의존성, frontmatter를 검증합니다.

## CLI 명령어

```bash
mdoc validate structure [options]
```

### 옵션

- `-p, --project <path>` - 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)

## 주요 기능

### 1. 순환 의존성 검사

**shared_types 참조 그래프**:
- Interface → Shared Type → Interface 순환 확인
- DFS(Depth-First Search)를 사용한 순환 탐지

### 2. 일관성 검증

**양방향 참조 확인**:
- Interface가 Shared Type을 참조하면
- Shared Type도 해당 Interface를 참조해야 함

### 3. Frontmatter 검증

**Feature 문서**:
- `feature`: Feature ID
- `entry_point`: 진입점 경로
- `code_references`: 코드 참조 배열
- `type`: 문서 타입
- `status`: 구현 상태

**Interface 문서**:
- `from`: 출발 Feature ID
- `to`: 도착 Feature ID
- `type`: 인터페이스 타입
- `status`: 구현 상태
- `shared_types`: 공유 타입 배열 (선택)

**Shared Type 문서**:
- `interfaces`: 인터페이스 배열
- `type`: "shared"
- `status`: 구현 상태

### 4. 복잡도 검증

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

공유 타입 파일의 연결된 쌍 개수를 검증합니다.

## 인터페이스

### 입력

- **CLI**: `00_Init--04_ValidateStructure`
- **Config**: MdocConfig 타입 사용

### 출력

- **CLI**: `04_ValidateStructure--00_Init`
- **StructureValidationResult**: 구조 검증 결과 반환

## 구현 상태

- ✅ 순환 의존성 검사
- ✅ 양방향 참조 검증
- ✅ Frontmatter 필드 검증
- ✅ 복잡도 검증 (설정 기반)
- ✅ 교차 플랫폼 경로 처리
