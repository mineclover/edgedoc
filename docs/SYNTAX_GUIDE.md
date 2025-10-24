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

**검증**: `edgedoc validate terms`, `edgedoc terms list/find`

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

```bash
edgedoc validate all           # 전체 검증
edgedoc validate terms         # 용어 일관성
edgedoc validate structure     # 문서 구조
edgedoc validate orphans       # 고아 파일
edgedoc sync                   # code_references 자동 업데이트
```

---

## 7. 핵심 규칙 요약

| 문법 | 용도 | 검증 |
|------|------|------|
| `## [[Term]]` | 용어 정의 (헤딩) | `validate terms` |
| `[[Term]]` | 용어 참조 (본문) | `validate terms` |
| frontmatter | 문서 메타데이터 | `validate structure` |
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

---

**변경 이력**: 2025-10-24 초기 작성
