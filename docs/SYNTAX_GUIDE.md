# Documentation Syntax Guide

**Version**: 1.0
**Last Updated**: 2025-10-24

이 문서는 edgedoc 프로젝트에서 사용하는 문서 작성 문법을 설명합니다.

---

## 1. Frontmatter (필수)

모든 문서는 YAML frontmatter로 시작합니다.

```yaml
---
type: feature                    # 문서 타입 (feature, design, guide 등)
status: active                   # 상태 (active, deprecated 등)
entry_point: "src/cli.ts"        # 진입점 파일 경로
code_references:                 # 참조하는 코드 파일 목록
  - "src/tools/init.ts"
  - "src/utils/config.ts"
related_features:                # 관련 기능 문서 (선택)
  - "00_Init"
---
```

**검증**:
- `edgedoc validate structure`: frontmatter 필드 검증
- `edgedoc sync`: code_references 자동 동기화

---

## 2. 용어 정의 `[[Term]]`

### 정의 (Definition)

**헤딩에 `[[용어]]`를 사용하면 정의**로 간주됩니다.

```markdown
## [[Entry Point Module]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
```

**규칙**:
- `## [[Term]]` 형식으로 정의 (## 또는 ### 모두 가능)
- 정의는 프로젝트 내에서 **고유**해야 함
- Global 정의는 `docs/GLOSSARY.md`에 작성 권장

### 참조 (Reference)

**본문에 `[[용어]]`를 사용하면 참조**입니다.

```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**규칙**:
- 참조하는 용어는 반드시 어딘가에 **정의되어 있어야 함**
- 정의되지 않은 용어 참조 시 검증 오류

**검증**:
```bash
# 용어 정의/참조 일관성 검증
edgedoc validate terms

# 정의된 용어 목록
edgedoc terms list

# 용어 검색
edgedoc terms find "Entry Point"
```

**검증 항목**:
1. 정의되지 않은 용어 참조 감지
2. 용어 정의 중복 감지
3. 순환 참조 감지
4. 미사용 정의 경고

---

## 3. 코드 참조

### 인라인 코드

코드 심볼은 백틱으로 표시:

```markdown
`ParserFactory` 클래스는 파서를 관리한다.
```

### 파일 경로

파일 경로는 프로젝트 루트 기준 상대 경로:

```markdown
**위치**: `src/parsers/ParserFactory.ts`
```

### 코드 블록

코드 예시는 언어 지정 필수:

```markdown
\`\`\`typescript
export class ParserFactory {
  static getParser(filePath: string): ILanguageParser | null
}
\`\`\`
```

---

## 4. 파일 위치 참조

코드 위치를 명시할 때 `파일:라인` 형식 사용:

```markdown
진입점은 `src/cli.ts:15`에서 정의됩니다.
```

이 형식은 사용자가 쉽게 소스로 이동할 수 있게 합니다.

---

## 5. 네이밍 컨벤션

### Interface 문서

파일명: `00--01.md` (00은 prefix, 01은 ID)

```yaml
---
type: interface
prefix: "00"
interface_id: "01"
interface_name: "ValidationResult"
---
```

**검증**: `edgedoc validate naming`

### Shared Type 문서

파일명: `00--01_00--02.md` (여러 interface 조합)

```yaml
---
type: shared_type
interfaces:
  - "00--01"
  - "00--02"
shared_type_name: "CommonTypes"
---
```

### Feature 문서

파일명: `01_FeatureName.md`

```yaml
---
type: feature
feature: "feature-name"
---
```

---

## 6. 문서 간 참조

### Related Features

```yaml
---
related_features:
  - "00_Init"
  - "01_Validate"
---
```

### Related Interfaces

```yaml
---
related_interfaces:
  - "00--01"
  - "00--02"
---
```

**검증**: `edgedoc validate structure` (순환 의존성 감지)

---

## 7. 금지 사항

### ❌ 예시 코드 금지

실제 코드만 사용, 예시 코드 금지:

```markdown
❌ 금지:
\`\`\`typescript
// Example
function example() { }
\`\`\`

✅ 권장:
실제 파일 경로 명시:
**위치**: `src/example.ts:10`
```

**검증**: `edgedoc validate structure` (예시 코드 감지)

---

## 8. 문서 타입

### feature

기능 구현 문서:

```yaml
---
type: feature
status: active
entry_point: "src/tools/feature.ts"
---
```

### interface

인터페이스 정의 문서:

```yaml
---
type: interface
prefix: "00"
interface_id: "01"
---
```

### shared_type

공용 타입 문서:

```yaml
---
type: shared_type
interfaces: ["00--01", "00--02"]
---
```

### design

설계 문서:

```yaml
---
type: design
status: draft
---
```

### guide

가이드 문서:

```yaml
---
type: guide
---
```

### glossary

용어 사전:

```yaml
---
type: glossary
language: bilingual
---
```

---

## 9. 검증 명령어

```bash
# 전체 검증
edgedoc validate all

# 개별 검증
edgedoc validate migration     # 마이그레이션 검증
edgedoc validate naming        # 네이밍 컨벤션
edgedoc validate structure     # 문서 구조
edgedoc validate orphans       # 고아 파일
edgedoc validate spec-orphans  # 스펙 고아
edgedoc validate terms         # 용어 일관성

# 동기화
edgedoc sync                   # code_references 자동 업데이트
edgedoc sync --dry-run         # 시뮬레이션

# 분석
edgedoc analyze entry-points   # 진입점 탐지

# 용어 관리
edgedoc terms list             # 용어 목록
edgedoc terms find <query>     # 용어 검색
```

---

## 10. 핵심 규칙 요약

| 문법 | 용도 | 검증 방법 |
|------|------|-----------|
| `---` frontmatter `---` | 문서 메타데이터 | `validate structure` |
| `## [[Term]]` | 용어 정의 (헤딩) | `validate terms` |
| `[[Term]]` | 용어 참조 (본문) | `validate terms` |
| `code_references: [...]` | 코드 파일 목록 | `validate orphans` |
| `entry_point: "..."` | 진입점 파일 | `analyze entry-points` |
| `00--01.md` | Interface 네이밍 | `validate naming` |
| `` `file.ts:line` `` | 파일 위치 참조 | (수동) |

---

## 11. 작성 워크플로우

### 새 기능 문서 작성

1. **파일 생성**: `tasks/features/XX_FeatureName.md`

2. **Frontmatter 작성**:
```yaml
---
type: feature
status: active
feature: "feature-name"
entry_point: "src/tools/feature.ts"
code_references: []  # 나중에 sync로 채움
---
```

3. **내용 작성**:
   - 핵심 용어는 `[[Term]]`으로 정의 또는 참조
   - 코드 심볼은 백틱 사용
   - 파일 위치는 `file:line` 형식

4. **검증**:
```bash
edgedoc validate structure  # frontmatter 확인
edgedoc validate terms      # 용어 확인
edgedoc sync                # code_references 자동 생성
edgedoc validate orphans    # 고아 파일 확인
```

### 용어 정의 추가

1. **GLOSSARY.md에 정의**:
```markdown
## [[New Term]]

**Type**: concept
**Scope**: global

명확한 정의 한 문장...
```

2. **검증**:
```bash
edgedoc validate terms      # 정의 중복 확인
edgedoc terms find "New"    # 정의 확인
```

---

## 12. 예시

### 완전한 Feature 문서 예시

```markdown
---
type: feature
status: active
feature: "term-validation"
priority: high
entry_point: "src/tools/validate-terms.ts"
code_references:
  - "src/parsers/TermParser.ts"
  - "src/tools/term-registry.ts"
  - "src/types/terminology.ts"
related_features:
  - "01_Validate"
---

# Term Validation

## Purpose

[[Term Definition]]과 [[Term Reference]]의 일관성을 검증한다.

## Architecture

### Components

1. **TermParser**: 문서에서 `[[Term]]` 추출
2. **TermRegistry**: 용어 레지스트리 관리
3. **Validator**: 검증 규칙 실행

### Workflow

1. [[GLOSSARY]]에서 용어 정의 추출
2. 모든 문서에서 `[[Term]]` 참조 추출
3. 정의되지 않은 참조 감지
4. 순환 참조 감지

## Implementation

**위치**: `src/tools/validate-terms.ts:20`

\`\`\`typescript
export async function validateTerms(
  options: ValidationOptions
): Promise<ValidationResult>
\`\`\`

## Validation Rules

1. **Undefined Terms**: 참조되었지만 정의 없음
2. **Scope Violation**: Document-scoped 용어의 범위 위반
3. **Circular Reference**: 용어 정의 간 순환
4. **Unused Definition**: 정의되었지만 사용 안 됨

## CLI Usage

\`\`\`bash
edgedoc validate terms
edgedoc terms list
edgedoc terms find "Validation"
\`\`\`
```

---

## 변경 이력

- **2025-10-24**: 초기 버전 작성
  - Frontmatter 규칙
  - `[[Term]]` 문법
  - 검증 명령어
  - 네이밍 컨벤션

---

**이 문서 자체도 위 규칙을 따릅니다.**
