---
type: feature
status: active
feature: validate-terms
priority: high
entry_point: "src/cli.ts"
related_features:
  - 06_ValidateAll
  - 10_Internationalization
code_references:
  - "src/tools/validate-terms.ts"
  - "src/tools/term-registry.ts"
  - "src/tools/term-commands.ts"
  - "src/parsers/TermParser.ts"
  - "src/types/terminology.ts"
---

# Term Validation & Management

**Command**: `edgedoc validate terms`, `edgedoc terms list`, `edgedoc terms find <query>`

## Purpose

[[Term Definition]]과 참조의 일관성을 검증하고 용어를 관리하는 기능을 제공한다.

## Problem

문서에서 동일한 개념을 다른 용어로 표현하거나, 정의되지 않은 용어를 사용하면:
- 문서 간 용어 충돌 발생
- 독자 혼란 야기
- 일관성 유지 어려움

## Solution

[[Documentation Symbol]] 개념을 도입하여 용어를 코드의 심볼처럼 취급한다:
- 명시적 정의 (`## [[Term]]`)
- 고유 식별자
- 타입 정보 (concept, entity, process, attribute, abbreviation)
- 스코프 (global, document)
- 참조 추적 (`[[Term]]`)

## Architecture

### Components

1. **TermParser** (`src/parsers/TermParser.ts`)
   - 마크다운에서 `## [[Term]]` 정의 추출
   - 본문에서 `[[Term]]` 참조 추출
   - 코드 블록(` ``` `) 및 인라인 코드(`` ` ``) 내부 무시
   - 메타데이터 파싱 (Type, Scope, Aliases, Related)

2. **TermRegistry** (`src/tools/term-registry.ts`)
   - 용어 정의 저장소
   - Alias 매핑 (동의어 → 정규명)
   - 검증 로직:
     - Undefined terms (참조만 있고 정의 없음)
     - Scope violations (document 스코프 용어를 다른 파일에서 참조)
     - Circular references (Related 필드의 순환 참조)
     - Unused definitions (정의만 있고 참조 없음)
   - Fuzzy 검색 기능

3. **validateTerms** (`src/tools/validate-terms.ts`)
   - 전체 프로젝트 용어 검증
   - 마크다운 파일 재귀 탐색
   - 정의 추출 → 참조 추출 → 검증 → 리포트

4. **Term Commands** (`src/tools/term-commands.ts`)
   - `terms list`: 타입별로 그룹화된 용어 목록
   - `terms find <query>`: 용어 검색 (exact match → fuzzy search)

### Validation Rules

1. **Uniqueness**: 정의는 프로젝트 내 고유해야 함 (중복 정의 금지)
2. **Completeness**: 모든 참조는 정의가 있어야 함 (미정의 용어 금지)
3. **Scope Consistency**: document 스코프 용어는 정의된 파일 내에서만 참조 가능
4. **Acyclicity**: Related 필드의 순환 참조 금지

### Syntax

**정의 (헤딩에 사용)**:
```markdown
## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
```

**참조 (본문에 사용)**:
```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**예시 작성 시**:
```markdown
✅ 올바름: 용어는 `[[Term]]` 형식으로 작성합니다.
❌ 잘못됨: 용어는 [[Term]] 형식으로 작성합니다.  (실제 참조로 인식됨)
```

## Usage

### Validation

```bash
# 용어 검증
edgedoc validate terms -p /path/to/project

# 출력:
# 1. 정의되지 않은 용어 (undefined terms)
# 2. 스코프 위반 (scope violations)
# 3. 순환 참조 (circular references)
# 4. 사용되지 않는 정의 (unused definitions)
```

### List All Terms

```bash
# 전체 용어 목록 (타입별 그룹화)
edgedoc terms list -p /path/to/project

# 출력:
# ## Global Terms
# ### Concept (7)
# - **Entry Point Module**
#   - Aliases: 진입점 모듈, entry point
#   - 외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.
#   - 📍 docs/GLOSSARY.md:11
```

### Search Terms

```bash
# 용어 검색 (fuzzy matching)
edgedoc terms find "Parser" -p /path/to/project

# 출력:
# 📚 4개 결과 발견:
# 1. **Language Parser**
#    Aliases: 언어 파서, ILanguageParser
#    특정 프로그래밍 언어의 소스 코드를 파싱하는 인터페이스를 의미한다.
#    📍 docs/GLOSSARY.md:290
```

## Implementation

### Key Features

1. **Code Block Filtering**
   - Triple backtick 코드 블록 내부의 용어 참조 무시
   - 인라인 코드 (single backtick) 내부의 용어 참조 무시
   - 예시 문서 작성 시 오탐 방지

2. **Metadata Parsing**
   - `**Type**: concept` → type 필드
   - `**Aliases**: 동의어, other` → aliases 배열
   - `**Related**: [[Term1]], [[Term2]]` → related 배열
   - 첫 문단 → definition 필드

3. **Fuzzy Search**
   - 용어명 검색
   - Alias 검색
   - Definition 내용 검색
   - 대소문자 무시

4. **Detailed Error Reporting**
   - 에러 타입별 그룹화
   - 파일:라인 위치 정보
   - 수정 제안 (suggestion)
   - 통계 요약

## Test Cases

```bash
# 1. Undefined term
[[Unknown Term]] 참조 → 에러 (정의 없음)

# 2. Duplicate definition
GLOSSARY.md: ## [[Foo]]
other.md: ## [[Foo]]  → 에러 (중복 정의)

# 3. Scope violation
file1.md: ## [[Helper]] (document scope)
file2.md: [[Helper]] 참조 → 에러 (스코프 위반)

# 4. Circular reference
## [[A]]
**Related**: [[B]]

## [[B]]
**Related**: [[A]]  → 경고 (순환 참조)

# 5. Unused definition
## [[Unused]] 정의만 있고 참조 없음 → 경고

# 6. Code block example (ignored)
## [[Term Definition]]
문법:
\`\`\`markdown
## [[Example Term]]  ← 이것은 무시됨 (코드 블록)
\`\`\`

# 7. Inline code example (ignored)
용어는 `[[Term]]` 형식입니다.  ← 이것은 무시됨 (인라인 코드)

# 8. Alias resolution
## [[Entry Point Module]]
**Aliases**: 진입점 모듈

문서에서:
[[진입점 모듈]] 참조 → 정상 (alias로 해석)
```

## Related

- [[Validation]]: 전체 검증 시스템
- [[Documentation Symbol]]: 문서 용어 개념
- [[Term Definition]]: 용어 정의 메타정보
- docs/GLOSSARY.md: Global 용어 정의 파일
- docs/SYNTAX_GUIDE.md: 문법 가이드
