# Documentation Syntax Guide

**Version**: 1.0

edgedoc 프로젝트의 문서 작성 규칙을 설명합니다.

---

## 1. Frontmatter (필수)

```yaml
---
type: feature                    # feature | interface | shared_type | design | guide
status: active                   # active | deprecated
entry_point: "src/cli.ts"        # 진입점 파일 경로
code_references:                 # 참조하는 코드 파일
  - "src/tools/init.ts"
---
```

**검증**: `edgedoc validate structure`, `edgedoc sync`

---

## 2. 용어 `[[Term]]`

### 정의 = 헤딩에 사용

```markdown
## [[Entry Point Module]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
```

### 참조 = 본문에 사용

```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

### 규칙

- 정의는 프로젝트 내 **고유**해야 함
- 참조는 **반드시 정의**되어 있어야 함
- Global 정의는 `docs/GLOSSARY.md`에 작성
- 코드 블록(triple backtick)과 인라인 코드(single backtick) 내부의 용어 참조는 무시됨

### 예시 작성 시 주의사항

예시로 `[[Term]]`을 보여줄 때는 백틱으로 감싸세요:

```markdown
✅ 올바름: 용어는 `[[Term]]` 형식으로 작성합니다.
❌ 잘못됨: 용어는 [[Term]] 형식으로 작성합니다.  (실제 참조로 인식됨)
```

### 용어 관리 명령어

```bash
edgedoc validate terms         # 용어 일관성 검증
edgedoc terms list             # 전체 용어 목록 (타입별 그룹화)
edgedoc terms find <query>     # 용어 검색 (fuzzy matching)
```

**검증**: `edgedoc validate terms`

---

## 3. 참조 시스템

문서 간 연결을 위한 3가지 참조 방식이 있습니다.

### 3.1 코드 파일 참조 (Frontmatter)

Feature 문서에서 사용하는 코드 파일을 명시:

```yaml
---
code_references:
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"
---
```

### 3.2 Feature 간 참조 (Frontmatter)

Feature 간 의존 관계 명시:

```yaml
---
related_features:
  - 06_ValidateAll         # 연관 feature
  - 10_Internationalization
---
```

**참고**: 현재는 방향성이 불명확합니다. 향후 `depends_on`/`used_by`로 개선 예정.

### 3.3 Interface 참조 (Frontmatter)

Interface 문서에서 연결되는 Feature 명시:

```yaml
---
from: "00_Init"              # 호출하는 feature
to: "01_ValidateMigration"   # 호출되는 feature
shared_types:                # 사용하는 공용 타입
  - "00--01_00--02"
---
```

### 3.4 용어 참조 (본문)

문서 본문에서 정의된 용어 참조:

```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

### 3.5 코드 위치 표기 (본문)

본문에서 코드 위치를 명시할 때:

```markdown
`ParserFactory` 클래스는 파서를 관리한다.

**위치**: `src/parsers/ParserFactory.ts:15`

\`\`\`typescript
export class ParserFactory { }
\`\`\`
```

**형식**: `파일경로:라인번호` 또는 `파일경로:시작-끝`

---

## 4. 네이밍 컨벤션

- Interface: `00--01.md` (prefix 00, ID 01)
- Shared Type: `00--01_00--02.md` (interface 조합)
- Feature: `01_FeatureName.md`

**검증**: `edgedoc validate naming`

---

## 5. 금지 사항

❌ 예시 코드 금지 (실제 코드만 사용)
❌ 순환 의존성 (related_features)

**검증**: `edgedoc validate structure`

---

## 6. 검증 명령어

### 전체 검증
```bash
edgedoc validate all           # 모든 검증 실행
```

### 개별 검증
```bash
edgedoc validate terms         # 용어 일관성 (정의/참조/스코프/순환참조)
edgedoc validate structure     # 문서 구조 (순환 의존성, frontmatter)
edgedoc validate orphans       # 고아 파일 (문서화되지 않은 파일)
edgedoc validate naming        # 네이밍 컨벤션
edgedoc validate spec-orphans  # 스펙 고아 코드 (문서화되지 않은 export)
edgedoc validate interfaces    # 인터페이스 양방향 링크 및 sibling coverage
```

### 동기화 및 관리
```bash
edgedoc sync                   # code_references 자동 업데이트
edgedoc terms list             # 용어 목록
edgedoc terms find <query>     # 용어 검색
```

### Tasks 관리
```bash
edgedoc tasks list                              # 전체 feature tasks 목록
edgedoc tasks list --incomplete                 # 미완료 tasks만 표시
edgedoc tasks list --code <file>                # 코드 파일로 역참조
edgedoc tasks list --interface <id>             # 인터페이스로 역참조
edgedoc tasks list --term <name>                # 용어로 역참조
edgedoc tasks get <feature-id>                  # 특정 feature 상세 조회
edgedoc tasks progress                          # 전체 진행 현황 대시보드
```

### Docs 블록 관리
```bash
edgedoc docs list <file>                        # details 블록 목록
edgedoc docs open <file> --index 0 1            # 특정 블록 열기
edgedoc docs open <file> --all                  # 모든 블록 열기
edgedoc docs close <file> --all                 # 모든 블록 닫기
```

---

## 7. Tasks 관리 시스템

Tasks 디렉토리(`tasks/features/`)의 feature 문서에서 체크박스 기반 진행도를 추적합니다.

### 7.1 체크박스 기반 진행도

Feature 문서에 체크박스를 사용하여 구현 진행 상황을 표시:

```markdown
---
type: feature
status: active
feature: validate-naming
priority: medium
---

# Interface & Shared Type Naming Convention Validation

## Implementation Plan

### Phase 1: Basic Validation ✅
- [x] Interface naming pattern validation
- [x] Shared type naming pattern validation
- [x] CLI integration

### Phase 2: Advanced Features
- [x] Report generation
- [ ] Auto-fix suggestions
- [ ] CI/CD integration
```

진행도 계산: `(checked / total) × 100%` → 예: 4/5 = 80%

### 7.2 역참조 (Reverse Lookup)

`.edgedoc/references.json` 인덱스를 사용하여 코드/인터페이스/용어에서 관련 feature를 찾습니다.

**코드 파일 → Feature → Tasks**:
```bash
# src/tools/validate-naming.ts를 문서화한 feature와 해당 tasks 조회
edgedoc tasks list --code src/tools/validate-naming.ts
```

**인터페이스 → Feature → Tasks**:
```bash
# validation/naming 인터페이스를 제공/사용하는 feature의 tasks 조회
edgedoc tasks list --interface validation/naming
```

**용어 → Feature → Tasks**:
```bash
# "interface-naming" 용어를 정의한 feature의 tasks 조회
edgedoc tasks list --term interface-naming
```

### 7.3 미완료 필터링

현재 작업 중인 코드/인터페이스와 관련된 미완료 tasks만 표시:

```bash
# 현재 파일의 미완료 작업만
edgedoc tasks list --code src/api/client.ts --incomplete

# 특정 인터페이스의 미완료 작업만
edgedoc tasks list --interface api/client --incomplete
```

**워크플로우**: 코드 수정 → 해당 코드의 feature 조회 → 미완료 tasks 확인 → 구현

---

## 8. 인터페이스 검증

Interface 문서 간 연결 무결성을 검증합니다.

### 8.1 양방향 링크 검증 (Bidirectional Links)

`provides` ↔ `uses` 관계가 일치하는지 확인:

```bash
edgedoc validate interfaces
```

**검증 항목**:
- **Missing Providers**: 사용(`uses`)되지만 제공(`provides`)되지 않는 인터페이스
- **Unused Interfaces**: 제공되지만 사용되지 않는 인터페이스

**예시**:
```yaml
# Feature A
interfaces:
  provides:
    - api/client

# Feature B
interfaces:
  uses:
    - api/client    # ✅ 양방향 일치
    - api/response  # ❌ 제공자 없음 (Missing Provider)
```

### 8.2 Sibling Coverage (Field of View)

네임스페이스 내 부분 문서화를 감지합니다.

**개념**: 한 feature가 네임스페이스의 일부 인터페이스만 문서화하면 경고

**예시**:
```yaml
# Feature: authentication
interfaces:
  provides:
    - auth/session/create
    - auth/session/validate
    # auth/session/destroy는 누락됨
```

**출력**:
```
⚠️  Sibling Coverage Issues:

  Namespace: auth/session
  Feature: authentication
  Provided: auth/session/create, auth/session/validate (2/3 siblings)
  Missing: auth/session/destroy

💡 같은 네임스페이스의 인터페이스는 함께 문서화하는 것을 권장합니다.
```

**이유**: 관련 기능이 흩어져 문서화되면 일관성이 떨어집니다.

### 8.3 필터링 옵션

```bash
# 특정 feature만 검증
edgedoc validate interfaces --feature api-client

# 특정 namespace만 검증
edgedoc validate interfaces --namespace api

# 상세 출력
edgedoc validate interfaces --verbose
```

---

## 9. Details 블록 관리

마크다운 파일의 `<details>` 블록을 관리합니다.

### 9.1 Details 블록 구문

```markdown
<details>
<summary>Implementation Details</summary>

여기에 상세 내용...

</details>
```

또는 다중 라인 summary:

```markdown
<details open>
<summary>

**Phase 1** - Basic Implementation

</summary>

내용...

</details>
```

### 9.2 관리 명령어

**목록 조회**:
```bash
edgedoc docs list tasks/features/01_ValidateMigration.md
```

**출력**:
```
[0] ⬇️  Implementation Details (closed)
    Lines: 45-89

[1] ⬆️  Example Output (open)
    Lines: 95-128
```

**선택적 열기/닫기**:
```bash
# 특정 블록만 열기
edgedoc docs open tasks/features/01_ValidateMigration.md --index 0 2

# 모든 블록 열기 (PR 리뷰 시 유용)
edgedoc docs open tasks/features/01_ValidateMigration.md --all

# 모든 블록 닫기 (커밋 전 정리)
edgedoc docs close tasks/features/01_ValidateMigration.md --all
```

**워크플로우**:
1. 개발 중: 작업 관련 details만 열어서 집중
2. 리뷰 시: 모든 details 열어서 전체 확인
3. 커밋 전: 모든 details 닫아서 문서 간결화

---

## 10. 핵심 규칙 요약

| 문법 | 용도 | 검증 |
|------|------|------|
| `## [[Term]]` | 용어 정의 (헤딩) | `validate terms` |
| `[[Term]]` | 용어 참조 (본문) | `validate terms` |
| [[Frontmatter]] | 문서 메타데이터 | `validate structure` |
| `code_references` | 코드 파일 목록 | `validate orphans` |

---

## 11. 작성 워크플로우

**새 기능 문서**:
1. Frontmatter 작성 → `validate structure`
2. 용어 정의/참조 → `validate terms`
3. 코드 참조 동기화 → `sync`

**용어 추가**:
1. `GLOSSARY.md`에 `## [[Term]]` 정의
2. `edgedoc validate terms` 검증
3. 다른 문서에서 `[[Term]]` 참조

**용어 찾기**:
1. `edgedoc terms list` - 모든 용어 확인
2. `edgedoc terms find <query>` - 특정 용어 검색
3. 용어 정의 위치 확인 후 문서에서 참조

**코드 수정 시 관련 tasks 확인**:
1. 코드 파일 수정 (예: `src/api/client.ts`)
2. `edgedoc tasks list --code src/api/client.ts --incomplete` - 미완료 작업 조회
3. 관련 feature 문서 확인 및 체크박스 업데이트
4. `edgedoc tasks progress` - 전체 진행도 확인

**인터페이스 추가 시 검증**:
1. Feature 문서의 frontmatter에 `interfaces.provides` 추가
2. `edgedoc validate interfaces` - 양방향 링크 및 sibling coverage 확인
3. 경고가 있다면 같은 네임스페이스의 다른 인터페이스도 문서화 고려
4. `edgedoc graph build` - 참조 인덱스 재생성

**문서 정리 (PR 준비)**:
1. `edgedoc docs close <file> --all` - 모든 details 블록 닫기
2. `edgedoc validate all` - 전체 검증
3. `edgedoc tasks progress` - 진행도 확인
4. 커밋 및 PR 생성

---

## 예시

```markdown
---
type: feature
status: active
entry_point: "src/tools/validate-terms.ts"
code_references:
  - "src/parsers/TermParser.ts"
  - "src/tools/term-registry.ts"
---

# Term Validation

## Purpose

[[Term Definition]]과 참조의 일관성을 검증한다.

## Architecture

**TermParser** (`src/parsers/TermParser.ts:10`)는 문서에서
`[[Term]]`을 추출한다.

\`\`\`typescript
export class TermParser {
  static extractDefinitions(markdown: string): TermDefinition[]
}
\`\`\`
```
