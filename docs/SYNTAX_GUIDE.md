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
- 코드 블록(` ``` `)과 인라인 코드(`` ` ``) 내부의 `[[Term]]`은 무시됨

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

## 3. 코드 참조

```markdown
`ParserFactory` 클래스는 파서를 관리한다.

**위치**: `src/parsers/ParserFactory.ts:15`

\`\`\`typescript
export class ParserFactory { }
\`\`\`
```

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
```

### 동기화 및 관리
```bash
edgedoc sync                   # code_references 자동 업데이트
edgedoc terms list             # 용어 목록
edgedoc terms find <query>     # 용어 검색
```

---

## 7. 핵심 규칙 요약

| 문법 | 용도 | 검증 |
|------|------|------|
| `## [[Term]]` | 용어 정의 (헤딩) | `validate terms` |
| `[[Term]]` | 용어 참조 (본문) | `validate terms` |
| [[Frontmatter]] | 문서 메타데이터 | `validate structure` |
| `code_references` | 코드 파일 목록 | `validate orphans` |

---

## 8. 작성 워크플로우

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
