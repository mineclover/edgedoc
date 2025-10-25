# Reference System Analysis

**Date**: 2025-10-24
**Purpose**: 접기/펼치기 기능을 위한 참조 시스템 분석

## 현재 참조 방식

### 1. Feature → Code (단방향)

**Frontmatter**: `code_references`

```yaml
---
feature: validate-terms
code_references:
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"
---
```

**특징**:
- Feature가 사용하는 코드 파일 명시
- `edgedoc sync`로 자동 동기화
- `edgedoc validate orphans`로 검증

**문제**:
- 역방향 탐색 불가 (코드 → 어떤 feature가 나를 사용?)
- 코드 위치 정보 없음 (line number)

---

### 2. Feature ↔ Feature (양방향)

**Frontmatter**: `related_features`

```yaml
---
feature: validate-terms
related_features:
  - 06_ValidateAll      # ValidateAll이 나를 사용
  - 10_Internationalization  # 내가 i18n을 사용
---
```

**특징**:
- 명시적 관계 표현
- 순환 의존성 검증 가능
- 방향성 불명확 (사용 vs 사용됨)

**문제**:
- 관계 타입 불명확 (depends_on? used_by?)
- 수동 관리 필요

---

### 3. Feature ↔ Interface (간접 참조)

**Interface Frontmatter**:
```yaml
---
from: "00_Init"         # 호출하는 feature
to: "01_ValidateMigration"  # 호출되는 feature
type: "command"
---
```

**Feature Frontmatter**:
```yaml
---
feature: "00_Init"
interfaces:             # 내가 제공하는 인터페이스
  - "00--01"
  - "00--02"
---
```

**특징**:
- Interface가 Feature 간 연결 매개
- 타입 정보 포함 (command, data, etc.)
- 양방향 추적 가능

**문제**:
- Feature → Interface 역방향 탐색 복잡
- "이 feature를 누가 호출하나?" 찾기 어려움

---

### 4. Document ↔ Term (양방향)

**Term Definition** (GLOSSARY.md):
```markdown
## [[Entry Point Module]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
```

**Term Reference** (any document):
```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**특징**:
- 자동 양방향 추적 (정의 ↔ 참조)
- 검증 완전 자동화
- Fuzzy 검색 가능

**문제**:
- 코드/feature 참조와 통합 안 됨

---

## 접기/펼치기 요구사항

### Use Case 1: Feature 문서 읽기

**접기/펼치기 대상**:
1. **Uses (이 feature가 사용하는 것들)**:
   - Code files (`code_references`)
   - Other features (`related_features`)
   - Terms (본문의 `[[Term]]`)
   - Interfaces (제공하는 인터페이스)

2. **Used By (이 feature를 사용하는 것들)**:
   - Other features (역방향 `related_features`)
   - Interfaces (이 feature를 `to`로 지정한 인터페이스)

3. **Tests**:
   - Test files referencing this feature

### Use Case 2: Code 파일 읽기

**접기/펼치기 대상**:
1. **Documented In** (문서화된 곳):
   - Features (`code_references`로 나를 참조)
   - Tests (`test_files`로 나를 참조)

2. **Imports** (이 코드가 import하는 것):
   - Other code files
   - Related features

3. **Imported By** (이 코드를 import하는 것):
   - Other code files
   - Features

### Use Case 3: Interface 문서 읽기

**접기/펼치기 대상**:
1. **Connects**:
   - From feature
   - To feature

2. **Uses**:
   - Shared types
   - Terms

### Use Case 4: Term 읽기

**접기/펼치기 대상**:
1. **Defined In**:
   - GLOSSARY.md or document file

2. **Referenced In**:
   - All documents using `[[Term]]`
   - Features, Interfaces, etc.

---

## 문제점 분석

### P1: 참조 방식 불일치

| 참조 타입 | 현재 방식 | 문제점 |
|----------|----------|--------|
| Feature → Code | `code_references` (array) | 역방향 탐색 불가 |
| Feature → Feature | `related_features` (array) | 방향성 불명확 |
| Feature → Interface | `interfaces` (array) | 사용 관계 불명확 |
| Interface → Feature | `from`, `to` (string) | 양방향이지만 Feature에서 찾기 어려움 |
| Doc → Term | `[[Term]]` (wiki-style) | 유일하게 양방향 자동 추적 |

### P2: 역방향 탐색 불가

**현재**:
- Feature → Code: 가능 (`code_references`)
- Code → Feature: **불가능** (전체 feature 스캔 필요)

**필요**:
- 코드 파일을 열었을 때 "어떤 feature가 나를 사용하나?" 즉시 표시

### P3: 관계 타입 불명확

**현재**:
```yaml
related_features:
  - 06_ValidateAll
  - 10_Internationalization
```

**문제**:
- ValidateAll이 나를 호출? 내가 ValidateAll을 호출?
- Internationalization과 무슨 관계?

**필요**:
```yaml
depends_on:           # 내가 의존
  - 10_Internationalization
used_by:              # 나를 사용
  - 06_ValidateAll
```

### P4: 코드 위치 정보 부재

**현재**:
```yaml
code_references:
  - "src/tools/validate-terms.ts"
```

**문제**:
- 파일 전체 참조? 특정 함수 참조?
- Line number 정보 없음

**필요**:
```yaml
code_references:
  - file: "src/tools/validate-terms.ts"
    symbols:
      - "validateTerms:19-104"      # function with line range
      - "ValidateTermsOptions:8-10" # interface
```

---

## 개선 방안

### Option A: 현재 구조 유지 + 역방향 인덱스

**장점**:
- 기존 문서 변경 최소화
- 빠른 구현

**방법**:
1. Build time에 역방향 인덱스 생성
   - `code-to-features.json`: 코드 파일 → 사용하는 features
   - `feature-dependencies.json`: feature → depends_on/used_by
   - `interface-connections.json`: interface → from/to features

2. 접기/펼치기 시 인덱스 조회

**단점**:
- 관계 타입 여전히 불명확
- 코드 위치 정보 부재

---

### Option B: 참조 방식 통일 ([[]] 확장)

**아이디어**:
모든 참조를 `[[Type:ID]]` 형식으로 통일

```markdown
이 feature는 [[Code:src/tools/validate-terms.ts#validateTerms]]를 사용하고,
[[Feature:06_ValidateAll]]에 의해 호출되며,
[[Term:Validation]]을 수행한다.
```

**장점**:
- 일관된 참조 방식
- 자동 양방향 추적 (Term처럼)
- 타입 안전성

**단점**:
- 기존 문서 대량 수정 필요
- Frontmatter vs 본문 혼재

---

### Option C: Frontmatter 개선 (권장)

**원칙**:
1. Frontmatter = 구조적 관계 (기계 파싱)
2. 본문 = 설명적 참조 (사람 읽기)

**Feature Frontmatter 개선**:
```yaml
---
feature: validate-terms
entry_point: "src/cli.ts"

# 코드 참조 (심볼 레벨)
code:
  uses:
    - file: "src/tools/validate-terms.ts"
      symbols: ["validateTerms:19-104"]
    - file: "src/parsers/TermParser.ts"
      symbols: ["extractDefinitions:11-52", "extractReferences:172-207"]

# Feature 의존성 (명확한 방향)
features:
  depends_on:
    - 10_Internationalization    # 내가 i18n 사용
  used_by:
    - 06_ValidateAll             # ValidateAll이 나를 호출

# Interface (제공/사용)
interfaces:
  provides:                      # 내가 제공
    - "00--13"
  uses:                          # 내가 사용
    - "00--10"                   # i18n interface

# 용어 (자동 추출 가능하지만 명시 가능)
terms:
  defines:
    - "Term Validation"          # 이 문서에서 정의
  uses:
    - "Documentation Symbol"     # 다른 곳에서 정의된 용어 사용
    - "Validation"
---
```

**장점**:
- 관계 방향 명확
- 심볼 레벨 추적
- 자동 역방향 인덱스 생성 가능
- 점진적 마이그레이션 가능 (기존 `code_references` 유지)

**단점**:
- Frontmatter 복잡도 증가
- 수동 관리 부담

---

### Option D: 하이브리드 (권장)

**전략**:
1. **구조적 참조**: Frontmatter (Option C)
   - Feature dependencies (명확한 방향)
   - Code references (파일 레벨은 필수, 심볼은 선택)

2. **설명적 참조**: 본문 `[[]]`
   - Terms: 자동 추적
   - Code/Feature: 선택적 (가독성 위해)

3. **자동 추론**:
   - Import graph → code dependencies
   - Interface from/to → feature connections
   - `[[Term]]` → term references

**예시**:

```yaml
---
feature: validate-terms
code_references:                 # 기존 방식 유지
  - "src/tools/validate-terms.ts"
  - "src/parsers/TermParser.ts"

depends_on:                      # 새로 추가 (optional)
  - 10_Internationalization

used_by:                         # 새로 추가 (optional)
  - 06_ValidateAll
---

# Term Validation

[[Term Definition]]과 참조의 일관성을 검증한다.

이 기능은 [[TermParser]] 클래스(`src/parsers/TermParser.ts:7-274`)를 사용하여
[[Validation]]을 수행한다.
```

**빌드 타임**:
```json
// generated/references.json
{
  "features": {
    "validate-terms": {
      "code": {
        "uses": ["src/tools/validate-terms.ts", ...],
        "used_by": []  // 자동 추론 (import graph)
      },
      "features": {
        "depends_on": ["10_Internationalization"],
        "used_by": ["06_ValidateAll"]
      },
      "terms": {
        "uses": ["Term Definition", "Validation", "TermParser"]  // 본문에서 자동 추출
      }
    }
  },
  "code": {
    "src/tools/validate-terms.ts": {
      "documented_in": ["validate-terms"],
      "imported_by": ["src/cli.ts"]
    }
  }
}
```

---

## 추천 구현 순서

### Phase 1: 역방향 인덱스 (즉시)
- [ ] Build script: 기존 frontmatter에서 역방향 인덱스 생성
- [ ] `feature-to-code.json`, `code-to-features.json`
- [ ] CLI command: `edgedoc graph` (관계 시각화)

### Phase 2: Frontmatter 개선 (단계적)
- [ ] `depends_on`, `used_by` 필드 추가 (optional)
- [ ] Validation: 순환 의존성 체크
- [ ] Migration tool: `related_features` → `depends_on/used_by`

### Phase 3: 심볼 레벨 추적 (선택적)
- [ ] Tree-sitter로 심볼 추출
- [ ] `code_references` → `code.uses` (심볼 포함)
- [ ] Jump to definition 지원

### Phase 4: 통합 UI (미래)
- [ ] VSCode extension: 접기/펼치기
- [ ] Web viewer: 관계 그래프
- [ ] Hover: 참조 정보 표시

---

## 결론

**현재 문제**:
1. 역방향 탐색 불가 (코드 → feature)
2. 관계 방향 불명확 (`related_features`)
3. 코드 위치 정보 부재

**권장 방안**: Option D (하이브리드)
1. 기존 구조 유지 (`code_references`, `related_features`)
2. 신규 필드 추가 (`depends_on`, `used_by`) - optional
3. 빌드 타임 역방향 인덱스 생성
4. 점진적 마이그레이션

**우선순위**: Phase 1 (역방향 인덱스)
- 기존 문서 변경 없음
- 즉시 탐색 가능
- 접기/펼치기 기반 마련
