# Term Definition Syntax Guide

**Version**: 1.0
**Date**: 2025-10-24

## Overview

용어 정의를 위한 **`[[Term]]` 문법**을 사용하여 문서 내 용어를 명시적으로 정의하고 참조합니다.

---

## Syntax Rules

### Rule 1: 정의는 헤딩에 `[[Term]]`

**Pattern**:
```markdown
## [[Term Name]]

정의 내용...
```

**Example**:
```markdown
## [[Entry Point Module]]

외부에 노출되는 최상위 public API 모듈을 의미한다.
```

**Rendering** (GitHub):
```
# [[Entry Point Module]]

외부에 노출되는 최상위 public API 모듈을 의미한다.
```

**Parsing**:
```typescript
// 정규표현식
const defPattern = /^##+ \[\[([^\]]+)\]\]/gm;

// Match
{
  type: 'definition',
  term: 'Entry Point Module',
  level: 2,
  line: 10
}
```

---

### Rule 2: 참조는 본문에 `[[Term]]`

**Pattern**:
```markdown
[[Term Name]]을 사용한다.
```

**Example**:
```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**Rendering** (GitHub):
```
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**Parsing**:
```typescript
// 정규표현식
const refPattern = /\[\[([^\]]+)\]\]/g;

// Match
[
  { type: 'reference', term: 'Entry Point Module', line: 45 },
  { type: 'reference', term: 'Code Interface', line: 45 }
]
```

---

### Rule 3: 정의와 참조 구분

| Context | Syntax | Meaning |
|---------|--------|---------|
| **헤딩** | `## [[Term]]` | 정의 (Definition) |
| **본문** | `[[Term]]` | 참조 (Reference) |

**Example**:
```markdown
# Glossary

## [[Entry Point Module]]
정의: 외부에 노출되는 모듈

---

# Design Document

[[Entry Point Module]]을 사용한다. (참조)
```

---

## Complete Example

### docs/GLOSSARY.md

```yaml
---
type: glossary
language: bilingual

definitions:
  - term: "Entry Point Module"
    id: "entry-point-module"
    type: concept
    scope: global

  - term: "Code Interface"
    id: "code-interface"
    type: entity
    scope: global

  - term: "Top-Level Interface"
    id: "top-level-interface"
    type: concept
    scope: global
---

# Project Glossary

프로젝트 전체에서 사용되는 핵심 용어를 정의합니다.

---

## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부에 노출되는 최상위 public API 모듈을 의미한다.

**Characteristics**:
- Exposes public interfaces to external consumers
- Referenced in package.json (main, bin, exports)
- Marked in documentation with `entry_point` frontmatter

**Examples**:
- `src/cli.ts` - CLI entry point
- `src/parsers/ParserFactory.ts` - Parser system API

---

## [[Code Interface]]

**Type**: entity
**Scope**: global
**Aliases**: 코드 인터페이스
**Not to Confuse**: [[User Interface]]

TypeScript interface, class, type 등 코드 수준의 인터페이스를 의미한다.

**Examples**:
```typescript
export interface ILanguageParser { }  // Code Interface
export class ParserFactory { }        // Code Interface
export type ParseResult = { }         // Code Interface
```

---

## [[Top-Level Interface]]

**Type**: concept
**Scope**: global
**Aliases**: 최상위 인터페이스
**Parent**: [[Code Interface]]
**Related**: [[Entry Point Module]]

[[Entry Point Module]]에서 export되는 개별 [[Code Interface]]를 의미한다.

**Definition**:
Entry point module에서 직접 export되어 외부 사용자가 접근 가능한 interface, class, function, type을 지칭한다.

**Examples**:
```typescript
// src/parsers/ParserFactory.ts (Entry Point Module)
export class ParserFactory { }        // ✅ Top-Level Interface
export interface ILanguageParser { }  // ✅ Top-Level Interface

class InternalParser { }              // ❌ Not exported
```
```

---

### docs/INTERFACE_VALIDATION_DESIGN.md

```markdown
# Interface-level Validation Design

## Overview

[[Interface-level Validation]]은 개별 [[Code Interface]] 단위로 문서화 여부를 검증하는 시스템이다.

## Concept

[[Entry Point Module]]에서 export되는 모든 [[Top-Level Interface]]는 문서화되어야 한다는 원칙에 기반한다.

### Comparison with File-level

| Aspect | File-level | [[Interface-level Validation]] |
|--------|------------|--------------------------------|
| Unit | File | [[Code Interface]] |
| Granularity | Coarse | Fine |
| False Positives | High | Low |

## Architecture

### Components

1. **Entry Point Detector**: [[Entry Point Module]] 탐지
2. **Export Analyzer**: [[Top-Level Interface]] 추출
3. **Interface Graph**: [[Code Interface]] 간 관계 추적
4. **Validator**: 문서화 여부 검증

### Data Flow

```
[[Entry Point Module]]
  → [[Top-Level Interface]] 추출
  → Interface Graph 구축
  → 검증
```

## Implementation

[[Entry Point Module]]을 탐지하고, 각 모듈에서 [[Top-Level Interface]]를 추출한 후,
문서에 정의된 용어와 매칭하여 검증한다.
```

---

## Scope: Global vs Document

### Global Definition (GLOSSARY.md)

**전체 프로젝트에서 사용 가능**:

```markdown
# docs/GLOSSARY.md

## [[Entry Point Module]]
(scope: global)
```

→ 모든 문서에서 `[[Entry Point Module]]` 참조 가능

---

### Document-scoped Definition

**해당 문서 내에서만 사용 가능**:

```yaml
# docs/INTERNAL_DESIGN.md
---
definitions:
  - term: "Internal Helper"
    scope: document  # 이 문서에서만 유효
---

## [[Internal Helper]]

이 문서에서만 사용되는 보조 개념
```

→ 다른 문서에서 `[[Internal Helper]]` 참조 시 오류

---

## Definition Metadata

### Frontmatter + Heading

**Recommended Pattern**:

```yaml
---
definitions:
  - term: "Entry Point Module"
    id: "entry-point-module"
    type: concept
    scope: global
    aliases: ["진입점 모듈", "entry point"]
    related: ["Top-Level Interface"]
---

## [[Entry Point Module]]

상세 정의 내용...

**Type**: concept (개념)
**Scope**: global (전역)
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]
```

**Benefits**:
- Frontmatter: 기계 판독 (파싱 쉬움)
- Heading: 사람 판독 (읽기 쉬움)
- Both: 완전한 정의

---

## Inline Definition (First Use)

**Pattern**: 첫 사용 시 볼드 + 설명

```markdown
# Design Document

**[[Top-Level Interface]]** (최상위 인터페이스)는 entry point에서 export되는
개별 interface를 의미한다.

이후 [[Top-Level Interface]]를 사용할 때...
```

**Parsing**:
- 첫 번째 `**[[Term]]**`: 인라인 정의
- 이후 `[[Term]]`: 참조

**Note**: 인라인 정의는 document-scoped로 처리

---

## Validation Examples

### Valid Usage

```markdown
# docs/GLOSSARY.md
## [[Entry Point Module]]
정의...

# docs/DESIGN.md
[[Entry Point Module]]을 사용한다.
```
✅ 정의됨, 참조 가능

---

### Error: Undefined Term

```markdown
# docs/DESIGN.md
[[Unknown Term]]을 사용한다.
```

```bash
❌ Error: Term "Unknown Term" referenced but not defined
   Location: docs/DESIGN.md:45

   Suggestion: Add definition to docs/GLOSSARY.md:

   ## [[Unknown Term]]

   정의 내용...
```

---

### Error: Conflicting Definitions

```markdown
# docs/GLOSSARY.md
## [[Interface]]
TypeScript interface를 의미한다.

# docs/UI_GUIDE.md
## [[Interface]]
사용자 인터페이스를 의미한다.
```

```bash
❌ Error: Term "Interface" has conflicting definitions
   1. TypeScript interface (docs/GLOSSARY.md:10)
   2. 사용자 인터페이스 (docs/UI_GUIDE.md:15)

   Suggestion: Use distinct terms:
   - "Code Interface" for TypeScript interface
   - "User Interface" for UI component
```

---

### Warning: Scope Violation

```markdown
# docs/INTERNAL.md
---
definitions:
  - term: "Local Helper"
    scope: document
---

## [[Local Helper]]
로컬 헬퍼...

# docs/PUBLIC.md
[[Local Helper]]를 사용...
```

```bash
⚠️  Warning: Term "Local Helper" is document-scoped
   Defined in: docs/INTERNAL.md
   Used in: docs/PUBLIC.md:23

   Suggestion: Change scope to "global" or use only in defining document
```

---

## Parsing Algorithm

### Step 1: Extract Definitions

```typescript
interface TermDefinition {
  term: string;
  file: string;
  line: number;
  heading: string;
  scope: 'global' | 'document';
}

function extractDefinitions(markdown: string, file: string): TermDefinition[] {
  const definitions: TermDefinition[] = [];

  // Pattern: ## [[Term]]
  const pattern = /^(#{2,})\s+\[\[([^\]]+)\]\]/gm;

  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const level = match[1].length;
    const term = match[2];
    const line = markdown.substring(0, match.index).split('\n').length;

    definitions.push({
      term,
      file,
      line,
      heading: match[0],
      scope: file.includes('GLOSSARY') ? 'global' : 'document',
    });
  }

  return definitions;
}
```

---

### Step 2: Extract References

```typescript
interface TermReference {
  term: string;
  file: string;
  line: number;
  context: string;
}

function extractReferences(markdown: string, file: string): TermReference[] {
  const references: TermReference[] = [];

  // Pattern: [[Term]] (not in heading)
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headings
    if (line.match(/^#+\s+\[\[/)) continue;

    // Extract references
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      references.push({
        term: match[1],
        file,
        line: i + 1,
        context: line,
      });
    }
  }

  return references;
}
```

---

### Step 3: Build Term Registry

```typescript
class TermRegistry {
  private definitions = new Map<string, TermDefinition>();
  private references: TermReference[] = [];

  addDefinition(def: TermDefinition): void {
    if (this.definitions.has(def.term)) {
      const existing = this.definitions.get(def.term)!;

      // Check for conflict
      if (existing.file !== def.file) {
        throw new ConflictError(
          `Term "${def.term}" defined in multiple files`,
          [existing, def]
        );
      }
    }

    this.definitions.set(def.term, def);
  }

  addReference(ref: TermReference): void {
    this.references.push(ref);
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // Check all references are defined
    for (const ref of this.references) {
      const def = this.definitions.get(ref.term);

      if (!def) {
        errors.push({
          type: 'undefined_term',
          term: ref.term,
          location: { file: ref.file, line: ref.line },
        });
      } else if (def.scope === 'document' && def.file !== ref.file) {
        errors.push({
          type: 'scope_violation',
          term: ref.term,
          location: { file: ref.file, line: ref.line },
          suggestion: `Term is document-scoped (defined in ${def.file})`,
        });
      }
    }

    return { success: errors.length === 0, errors };
  }
}
```

---

### Step 4: Validate

```typescript
async function validateTerms(projectPath: string): Promise<ValidationResult> {
  const registry = new TermRegistry();

  // 1. Parse all markdown files
  const mdFiles = await glob('**/*.md', { cwd: projectPath });

  // 2. Extract definitions and references
  for (const file of mdFiles) {
    const content = await fs.readFile(join(projectPath, file), 'utf-8');

    const definitions = extractDefinitions(content, file);
    const references = extractReferences(content, file);

    definitions.forEach(def => registry.addDefinition(def));
    references.forEach(ref => registry.addReference(ref));
  }

  // 3. Validate
  return registry.validate();
}
```

---

## CLI Usage

```bash
# Validate all terms
edgedoc validate terms

# List all defined terms
edgedoc terms list

# Find term definition
edgedoc terms find "Entry Point Module"

# Generate glossary from all definitions
edgedoc terms glossary
```

### Example Output

```bash
$ edgedoc validate terms

🔍 용어 검증 시작...

📖 정의 추출 중...
   → 15개 정의 발견
     - GLOSSARY.md: 12개
     - DESIGN.md: 2개 (document-scoped)
     - IMPL.md: 1개 (document-scoped)

📄 참조 추출 중...
   → 67개 참조 발견

✅ 1. 정의 고유성
   → 15/15 통과

❌ 2. 참조 완전성
   → 3개 미정의 용어:
      - "Export Graph" (IMPL.md:45)
      - "Method Tracker" (DESIGN.md:89)

⚠️  3. 스코프 준수
   → 2개 스코프 위반:
      - "Local Helper" (PUBLIC.md:23) - document-scoped

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 검증 결과

정의: 15개 (global: 12, document: 3)
참조: 67개
미정의: 3개
에러: 3
경고: 2

❌ 검증 실패
```

---

## Style Guidelines

### DO ✅

1. **정의는 GLOSSARY.md에 집중**
   ```markdown
   # docs/GLOSSARY.md

   ## [[Entry Point Module]]
   ## [[Code Interface]]
   ## [[Top-Level Interface]]
   ```

2. **명확한 용어 사용**
   ```markdown
   ✅ [[Code Interface]] (명확)
   ✅ [[User Interface]] (명확)
   ❌ [[Interface]] (모호)
   ```

3. **Canonical name으로 참조**
   ```markdown
   정의: ## [[Entry Point Module]]
   참조: [[Entry Point Module]] (일관성)
   ```

4. **Aliases 명시**
   ```markdown
   ## [[Entry Point Module]]

   **Aliases**: 진입점 모듈, entry point
   ```

5. **Related terms 연결**
   ```markdown
   **Related**: [[Top-Level Interface]], [[Public API]]
   ```

### DON'T ❌

1. **정의 중복 금지**
   ```markdown
   ❌ GLOSSARY.md: ## [[Interface]]
   ❌ DESIGN.md: ## [[Interface]]
   ```

2. **정의 없이 참조 금지**
   ```markdown
   ❌ [[Unknown Term]]을 사용... (정의 없음)
   ```

3. **불일치한 용어 사용**
   ```markdown
   정의: ## [[Entry Point Module]]
   ❌ [[Entry Point]]를 사용... (축약형)
   ✅ [[Entry Point Module]]을 사용...
   ```

4. **헤딩 없이 정의 금지**
   ```markdown
   ❌ [[Term]]은 ... (본문에 정의)
   ✅ ## [[Term]]
      정의 내용...
   ```

---

## Advanced: Multilingual Support

### English Definition with Korean Alias

```markdown
## [[Entry Point Module]]

**Aliases**: 진입점 모듈, entry point

An entry point module is a file that exposes public interfaces to external consumers.

외부 사용자에게 public interface를 노출하는 파일을 의미한다.
```

### Usage

```markdown
# English docs
[[Entry Point Module]] exposes public interfaces.

# Korean docs
[[Entry Point Module]](진입점 모듈)은 public interface를 노출한다.

이후 문서에서는 "진입점 모듈"로 표기한다.
```

---

## FAQ

### Q: 모든 헤딩에 `[[]]`를 써야 하나요?

**A**: 아니오. 용어 정의할 때만:
```markdown
✅ ## [[Entry Point Module]]  (용어 정의)
✅ ## Implementation Details    (일반 섹션)
❌ ## [[Implementation Details]] (불필요)
```

### Q: 대괄호가 렌더링에서 보이는데요?

**A**: 의도된 동작입니다. 대괄호는 "이것이 정의"임을 시각적으로 표시합니다.
- Obsidian, Notion 등에서도 `[[]]` 사용
- 문서화 도구에서는 충분히 수용 가능한 표기법

### Q: 참조할 때도 항상 `[[]]`를 써야 하나요?

**A**: 권장하지만 필수는 아닙니다:
```markdown
✅ [[Entry Point Module]]을 사용 (추적 가능)
⚠️  Entry Point Module을 사용 (추적 불가)
```

### Q: Document-scoped 정의는 언제 사용하나요?

**A**: 해당 문서에서만 사용되는 임시 용어:
```markdown
# docs/EXPERIMENTAL.md
---
definitions:
  - term: "Temp Solution"
    scope: document
---

## [[Temp Solution]]
실험적 해결책 (이 문서에서만)
```

---

## Related Documents

- [Documentation Term System](./DOCUMENTATION_TERM_SYSTEM.md) - 전체 시스템 개요
- [Interface Validation Design](./INTERFACE_VALIDATION_DESIGN.md) - 적용 예시

---

**Document Status**: ✅ Complete
**Syntax Version**: 1.0
**Last Updated**: 2025-10-24
