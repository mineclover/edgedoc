# Documentation Term Definition System

**Version**: 1.0
**Date**: 2025-10-24
**Status**: Proposal

## Core Concept

문서의 **용어(term)**를 코드의 **심볼(symbol)**처럼 취급하여, 문서 간 용어 정의 충돌을 방지하고 일관성을 보장한다.

### Problem: 문서 간 용어 충돌

**시나리오 1: 같은 용어, 다른 의미 (Homonym Conflict)**
```markdown
# docs/INTERFACE_DESIGN.md
"Interface"는 TypeScript interface를 의미한다.

# docs/UI_DESIGN.md
"Interface"는 사용자 인터페이스(UI 화면)를 의미한다.
```
→ ❌ **충돌**: "Interface"가 두 가지 의미로 사용됨

**시나리오 2: 다른 용어, 같은 의미 (Synonym Inconsistency)**
```markdown
# docs/ENTRY_POINTS.md
"Entry Point Module"을 사용한다.

# tasks/features/12_AnalyzeEntryPoints.md
"진입점 모듈"을 사용한다.

# README.md
"Entry Point"를 사용한다.
```
→ ⚠️ **불일관**: 같은 개념을 다르게 표현

**시나리오 3: 정의되지 않은 용어 사용 (Undefined Term)**
```markdown
# docs/DESIGN.md
"Top-Level Interface를 추출한다..."
```
→ ❌ **오류**: "Top-Level Interface"가 어디에도 정의되지 않음

**시나리오 4: 순환 정의 (Circular Definition)**
```markdown
# GLOSSARY.md
- Entry Point: Public API를 노출하는 모듈
- Public API: Entry Point에서 export되는 인터페이스
```
→ ❌ **순환**: A는 B로, B는 A로 정의됨

---

## Solution: Documentation Symbol System

### 코드 심볼과의 비교

| Aspect | Code Symbol | Documentation Symbol |
|--------|-------------|---------------------|
| **선언** | `export class Foo {}` | `:::define Entry Point Module` |
| **식별자** | `Foo` | `"Entry Point Module"` |
| **타입** | `class`, `interface` | `concept`, `entity`, `process` |
| **스코프** | `public`, `private` | `global`, `document` |
| **참조** | `import { Foo }` | `[[Entry Point Module]]` |
| **충돌 감지** | Compiler error | Validation error |
| **강제** | Compiler | Validation tool |

### 핵심 원칙

1. **명시적 정의 (Explicit Definition)**
   - 모든 핵심 용어는 명시적으로 정의되어야 함
   - 정의는 GLOSSARY.md에 집중

2. **고유성 (Uniqueness)**
   - 같은 용어는 하나의 의미만 가져야 함
   - 다른 의미면 다른 용어 사용 (예: "Code Interface" vs "User Interface")

3. **일관성 (Consistency)**
   - 정의된 canonical name 사용
   - 별칭(alias)은 명시적으로 선언

4. **추적 가능성 (Traceability)**
   - 용어 사용처 추적
   - 정의 위치 명확

5. **검증 가능성 (Verifiability)**
   - 자동화된 도구로 검증
   - CI/CD 통합

---

## Term Definition Format

### Recommended: Glossary-First Approach

**중앙 용어 사전**: `docs/GLOSSARY.md`

```yaml
---
type: glossary
language: bilingual

definitions:
  - term: "Entry Point Module"
    id: "entry-point-module"
    type: concept
    scope: global
    definition: "외부에 노출되는 최상위 public API 모듈"
    aliases:
      - "진입점 모듈"  # Korean
      - "entry point"  # Informal
    related:
      - "Top-Level Interface"
      - "Public API"
    examples:
      - "src/cli.ts"
      - "src/parsers/ParserFactory.ts"

  - term: "Code Interface"
    id: "code-interface"
    type: entity
    scope: global
    definition: "TypeScript interface, class, type 등 코드 수준의 인터페이스"
    aliases:
      - "코드 인터페이스"
    parent: "Interface"
    not_to_confuse: "User Interface"

  - term: "User Interface"
    id: "user-interface"
    type: entity
    scope: global
    definition: "사용자와 상호작용하는 UI 컴포넌트"
    aliases:
      - "UI"
      - "사용자 인터페이스"
    parent: "Interface"
    not_to_confuse: "Code Interface"

  - term: "Interface-level Validation"
    id: "interface-level-validation"
    type: process
    scope: global
    definition: "개별 코드 인터페이스 단위로 문서화 여부를 검증하는 프로세스"
    parent: "Validation"
    contrast: "File-level Validation"
    aliases:
      - "인터페이스 수준 검증"
---

# Project Glossary

이 문서는 프로젝트 전체에서 사용되는 핵심 용어를 정의합니다.

## Core Concepts

### Entry Point Module {#entry-point-module}

**Type**: concept
**Aliases**: 진입점 모듈, entry point

외부에 노출되는 최상위 public API 모듈을 의미한다. CLI entry point, library export,
또는 API endpoint의 진입점 역할을 한다.

**Characteristics**:
- Exposes public interfaces to external consumers
- Referenced in package.json (main, bin, exports)
- Marked in documentation with `entry_point` frontmatter

**Types**:
- `cli`: Command-line interface entry points
- `library`: Public library exports
- `api`: API modules

**Examples**:
- `src/cli.ts` - CLI entry point
- `src/parsers/ParserFactory.ts` - Parser system API
- `src/shared/i18n.ts` - Internationalization API

**Related Terms**:
- [[Top-Level Interface]]
- [[Public API]]
- [[Code Interface]]

**Not to Confuse With**: Entry point in the general programming sense (like `main()` function)

---

### Code Interface {#code-interface}

**Type**: entity
**Aliases**: 코드 인터페이스

TypeScript interface, class, type 등 코드 수준의 인터페이스를 의미한다.

**Examples**:
```typescript
export interface ILanguageParser { }  // ✅ Code Interface
export class ParserFactory { }        // ✅ Code Interface
export type ParseResult = { }         // ✅ Code Interface
```

**Not to Confuse With**: [[User Interface]] (UI component)

---

### User Interface {#user-interface}

**Type**: entity
**Aliases**: UI, 사용자 인터페이스

사용자와 상호작용하는 UI 컴포넌트를 의미한다.

**Examples**:
- Command-line interface (CLI)
- Web UI
- GUI components

**Not to Confuse With**: [[Code Interface]] (TypeScript interface)

---

## Validation Concepts

### Interface-level Validation {#interface-level-validation}

**Type**: process
**Aliases**: 인터페이스 수준 검증

개별 코드 인터페이스 단위로 문서화 여부를 검증하는 프로세스.

**Contrasts With**: [[File-level Validation]]

**How It Works**:
1. Extract all exported interfaces from entry points
2. Build interface usage graph
3. Check if each public interface is documented
4. Report orphan interfaces (exported but not documented)

**Benefits Over File-level**:
- Finer granularity (per interface vs per file)
- No false positives (if 1 interface documented, others not assumed documented)
- Method-level tracking possible

---

### File-level Validation {#file-level-validation}

**Type**: process
**Aliases**: 파일 수준 검증

파일 단위로 문서화 여부를 검증하는 프로세스 (현재 시스템).

**Contrasts With**: [[Interface-level Validation]]

**How It Works**:
1. Check if file is referenced in documentation
2. If yes, ALL exports in that file are considered documented

**Limitation**: If file is documented, all exports assumed documented (even if some aren't)
```

---

## Term Types

### concept

**정의**: 추상적 개념 또는 아이디어

**특징**:
- ❌ 실제 코드 심볼 없음
- ✅ 여러 구현체 존재 가능
- ✅ 설명이 필요한 개념

**예시**:
- Entry Point Module
- Interface-level Validation
- Top-Level Interface
- Orphan Detection

**검증 규칙**:
- Must have clear definition
- Should explain relationship to concrete entities

---

### entity

**정의**: 구체적 실체 (코드, 파일, 도구 등)

**특징**:
- ✅ 실제로 존재하는 것
- ✅ 참조 가능한 것
- ✅ 코드 심볼 또는 파일

**예시**:
- ParserFactory (class)
- Code Interface (TypeScript interface)
- User Interface (UI component)
- mdoc-tools (project)

**검증 규칙**:
- Should reference actual code/file if applicable
- Can be verified for existence

---

### process

**정의**: 프로세스, 절차, 동작

**특징**:
- ✅ 동사형 또는 -ing형
- ✅ 입력과 출력이 있음
- ✅ 수행되는 것

**예시**:
- Validation (검증)
- Synchronization (동기화)
- Migration (마이그레이션)
- Parsing (파싱)

**검증 규칙**:
- Should describe inputs and outputs
- Should describe steps or algorithm

---

### attribute

**정의**: 속성 또는 특성

**특징**:
- ✅ 다른 것의 속성
- ✅ 값을 가짐
- ✅ 분류 기준

**예시**:
- type (feature type)
- status (active, deprecated)
- priority (high, medium, low)

**검증 규칙**:
- Should define allowed values
- Should define what it applies to

---

### relationship

**정의**: 개체 간 관계

**특징**:
- ✅ 두 개체를 연결
- ✅ 방향성 있음
- ✅ 관계 타입 명시

**예시**:
- "uses" (A uses B)
- "extends" (A extends B)
- "implements" (A implements B)
- "parent-child"

**검증 규칙**:
- Both entities must be defined
- No circular relationships (except explicitly allowed)

---

## Term Usage in Documents

### Referencing Defined Terms

**Wiki-style Links** (Recommended):
```markdown
[[Entry Point Module]]은 [[Code Interface]]를 노출한다.
```

**Explicit Links**:
```markdown
[Entry Point Module](../GLOSSARY.md#entry-point-module)은
[Code Interface](../GLOSSARY.md#code-interface)를 노출한다.
```

**Inline Bold** (for defined terms):
```markdown
**Entry Point Module**은 외부에 노출되는 모듈이다.
```

### Using Aliases

**Canonical name first, then alias**:
```markdown
Entry Point Module(이하 "진입점 모듈")은...

이후 문서에서는 "진입점 모듈"로 표기한다.
```

**Consistent within document**:
```markdown
✅ Good: 문서 전체에서 "진입점 모듈" 일관되게 사용
❌ Bad: "진입점 모듈", "Entry Point", "엔트리 포인트" 혼용
```

---

## Validation Rules

### Rule 1: Term Uniqueness

**규칙**: 동일한 용어는 하나의 의미만 가져야 한다.

**검증**:
```typescript
// Collect all term definitions
const definitions = parseAllGlossaries();

// Check for conflicts
for (const [term, defs] of groupBy(definitions, 'term')) {
  if (defs.length > 1) {
    const meanings = defs.map(d => d.definition);
    if (!areEquivalent(meanings)) {
      error(`Term "${term}" has conflicting definitions:
        1. ${defs[0].definition} (in ${defs[0].file})
        2. ${defs[1].definition} (in ${defs[1].file})
      `);
    }
  }
}
```

**Example Error**:
```
❌ Error: Term "Interface" has conflicting definitions:
   1. "TypeScript interface" (in docs/CODE.md)
   2. "User interface component" (in docs/UI.md)

   Suggestion: Use "Code Interface" and "User Interface" instead.
```

---

### Rule 2: Term Completeness

**규칙**: 사용된 모든 용어는 정의되어야 한다.

**검증**:
```typescript
// Extract all term references from documents
const references = extractTermReferences(allDocs);

// Check if each reference has a definition
for (const ref of references) {
  if (!glossary.has(ref.term)) {
    error(`Term "${ref.term}" used but not defined
      Location: ${ref.file}:${ref.line}
    `);
  }
}
```

**Example Error**:
```
❌ Error: Term "Top-Level Interface" used but not defined
   Location: docs/DESIGN.md:45

   Suggestion: Add definition to docs/GLOSSARY.md
```

---

### Rule 3: No Circular Definitions

**규칙**: 용어 정의가 순환해서는 안 된다.

**검증**:
```typescript
// Build term dependency graph
const graph = buildTermDependencyGraph(glossary);

// Detect cycles
const cycles = detectCycles(graph);
if (cycles.length > 0) {
  for (const cycle of cycles) {
    error(`Circular definition detected: ${cycle.join(' → ')}`);
  }
}
```

**Example Error**:
```
❌ Error: Circular definition detected:
   Entry Point → Public API → Entry Point

   Suggestion: Break the cycle by rephrasing one definition.
```

---

### Rule 4: Consistent Alias Usage

**규칙**: 별칭은 정의된 것만 사용해야 한다.

**검증**:
```typescript
// For each term usage
for (const usage of allTermUsages) {
  const term = glossary.get(usage.canonical);

  if (usage.text !== term.name &&
      !term.aliases.includes(usage.text)) {
    warn(`Using non-canonical term "${usage.text}"
      Canonical: "${term.name}"
      Defined aliases: ${term.aliases.join(', ')}
      Location: ${usage.file}:${usage.line}
    `);
  }
}
```

**Example Warning**:
```
⚠️  Warning: Using non-canonical term "Entry Point"
   Canonical: "Entry Point Module"
   Defined aliases: "진입점 모듈", "entry point"
   Location: docs/DESIGN.md:23

   Suggestion: Use canonical name or add "Entry Point" to aliases
```

---

### Rule 5: Scope Adherence

**규칙**: Document-scoped 용어는 정의된 문서 내에서만 사용 가능.

**검증**:
```typescript
for (const usage of allTermUsages) {
  const term = glossary.get(usage.term);

  if (term.scope === 'document' &&
      usage.file !== term.definedIn) {
    error(`Term "${term.name}" is document-scoped
      Defined in: ${term.definedIn}
      Used in: ${usage.file}

      Suggestion: Change scope to "global" or don't use outside defining document
    `);
  }
}
```

**Example Error**:
```
❌ Error: Term "LocalHelper" is document-scoped
   Defined in: docs/INTERNAL.md
   Used in: docs/PUBLIC.md

   This term is only valid within docs/INTERNAL.md
```

---

### Rule 6: Type Consistency

**규칙**: 용어는 정의된 타입과 일관되게 사용되어야 함.

**검증**:
```typescript
// Simple heuristics
for (const usage of allTermUsages) {
  const term = glossary.get(usage.term);

  if (term.type === 'concept' && usage.context.includes('클래스')) {
    warn(`Term "${term.name}" is a concept, but used as entity
      Context: "${usage.context}"
      Location: ${usage.file}:${usage.line}
    `);
  }
}
```

**Example Warning**:
```
⚠️  Warning: Term "Validation" is a process, but used as entity
   Context: "Validation 클래스를 구현한다"
   Location: docs/IMPL.md:67

   Suggestion: Consider using "Validator" (entity) instead
```

---

## Schema Definition

```typescript
// Term definition in glossary frontmatter
interface TermDefinition {
  term: string;                    // Canonical name
  id: string;                      // URL-safe identifier
  type: TermType;                  // Classification
  scope: 'global' | 'document';    // Visibility scope
  definition: string;              // Clear definition

  // Optional fields
  aliases?: string[];              // Alternative names
  parent?: string;                 // Parent term (hierarchy)
  related?: string[];              // Related terms
  contrast?: string;               // Contrasting term
  not_to_confuse?: string;         // Commonly confused term
  examples?: string[];             // Usage examples
  deprecated?: boolean;            // Is term deprecated
  replaces?: string;               // What term it replaces
}

type TermType =
  | 'concept'      // Abstract concept
  | 'entity'       // Concrete entity
  | 'process'      // Process or action
  | 'attribute'    // Attribute or property
  | 'relationship';// Relationship between entities

// Parsed term from glossary
interface ParsedTerm extends TermDefinition {
  definedIn: string;               // File where defined
  location: {
    line: number;
    section: string;
  };
}

// Term usage in document
interface TermUsage {
  term: string;                    // Term used
  canonical: string;               // Canonical name (resolved)
  file: string;                    // File where used
  line: number;                    // Line number
  context: string;                 // Surrounding text
}

// Term registry (global)
interface TermRegistry {
  terms: Map<string, ParsedTerm>;
  aliases: Map<string, string>;    // alias -> canonical
  index: {
    byType: Map<TermType, ParsedTerm[]>;
    byScope: Map<string, ParsedTerm[]>;
    byFile: Map<string, ParsedTerm[]>;
  };

  // Methods
  find(term: string): ParsedTerm | undefined;
  resolve(alias: string): string;  // Resolve alias to canonical
  validate(): ValidationResult;
  detectConflicts(): Conflict[];
  buildDependencyGraph(): TermGraph;
}

// Validation result
interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];

  stats: {
    totalTerms: number;
    definedTerms: number;
    usedTerms: number;
    orphanTerms: number;          // Defined but never used
    undefinedTerms: number;       // Used but not defined
    conflicts: number;
  };
}

interface ValidationError {
  rule: string;                    // Rule violated
  severity: 'error' | 'warning';
  term: string;
  message: string;
  location?: { file: string; line: number };
  suggestion?: string;
}
```

---

## Implementation Roadmap

### Phase 1: Glossary Creation (Week 1)

**Goal**: Create central term dictionary

**Tasks**:
- ⬜ Create docs/GLOSSARY.md
- ⬜ Define 10-15 core terms
- ⬜ Add frontmatter definitions
- ⬜ Write detailed sections for each term

**Core Terms to Define**:
1. Entry Point Module
2. Code Interface
3. Top-Level Interface
4. Interface-level Validation
5. File-level Validation
6. Public API
7. Orphan Detection
8. Spec Orphan
9. Export Analyzer
10. Interface Graph

**Deliverable**: docs/GLOSSARY.md with 10+ terms

---

### Phase 2: Term Extraction (Week 2)

**Goal**: Extract terms from existing docs

**Tasks**:
- ⬜ Implement term extraction parser
- ⬜ Scan all markdown files
- ⬜ Extract potential terms (bold, capitalized phrases)
- ⬜ Generate term usage report

**Code**:
```typescript
// src/parsers/TermExtractor.ts
export class TermExtractor {
  extractPotentialTerms(markdown: string): PotentialTerm[] {
    // Extract **bold** phrases
    // Extract capitalized phrases
    // Extract `[[wiki-links]]`
    // Return with context
  }
}

// Generate report
const extractor = new TermExtractor();
const allTerms = docs.map(doc => extractor.extract(doc));
const report = generateTermReport(allTerms);
```

**Deliverable**: Term usage report

---

### Phase 3: Validation Tool (Week 3-4)

**Goal**: Implement automated validation

**Tasks**:
- ⬜ Implement TermRegistry
- ⬜ Implement 6 validation rules
- ⬜ Add CLI command: `edgedoc validate terms`
- ⬜ Generate validation report

**Code**:
```typescript
// src/tools/term-validator.ts
export async function validateTerms(
  options: ValidationOptions
): Promise<ValidationResult> {
  // 1. Parse glossary
  const glossary = parseGlossary(options.glossaryPath);

  // 2. Build term registry
  const registry = new TermRegistry(glossary);

  // 3. Extract term usages
  const usages = extractTermUsages(options.docsPath);

  // 4. Run validation rules
  const errors = [
    ...validateUniqueness(registry),
    ...validateCompleteness(registry, usages),
    ...validateCircular(registry),
    ...validateAliases(registry, usages),
    ...validateScope(registry, usages),
    ...validateType(registry, usages),
  ];

  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    stats: generateStats(registry, usages),
  };
}
```

**CLI Output**:
```bash
$ edgedoc validate terms

🔍 용어 검증 시작...

📖 Glossary 파싱 중...
   → 15개 용어 정의됨 (docs/GLOSSARY.md)

📄 문서에서 용어 사용 추출 중...
   → 48개 용어 사용 발견 (12개 문서)

✅ 1. 용어 고유성 검증
   → 15/15 통과

❌ 2. 용어 완전성 검증
   → 3개 용어 정의되지 않음:
      - "Top-Level Method" (docs/DESIGN.md:67)
      - "Export Graph" (docs/IMPL.md:23)

✅ 3. 순환 정의 검증
   → 순환 없음

⚠️  4. 별칭 일관성 검증
   → 5개 비정규 용어 사용:
      - "Entry Point" → "Entry Point Module" (docs/OVERVIEW.md:12)

✅ 5. 스코프 준수 검증
   → 48/48 통과

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 검증 결과

정의된 용어: 15
사용된 용어: 48 (unique: 18)
미정의 용어: 3
고아 용어: 0

에러: 3
경고: 5

❌ 검증 실패 - 에러를 수정하세요
```

**Deliverable**: `edgedoc validate terms` command

---

### Phase 4: Documentation Migration (Week 5-6)

**Goal**: Apply term system to all docs

**Tasks**:
- ⬜ Update all docs to reference GLOSSARY terms
- ⬜ Replace inconsistent terms
- ⬜ Add wiki-style links (`[[Term]]`) for term references
- ⬜ Run validation and fix errors

**Migration Strategy**:
1. Start with design docs (highest term density)
2. Update feature docs
3. Update README and guides
4. Final validation pass

**Deliverable**: All docs validated

---

## Example: Real Project Application

### Before (Current State)

```markdown
# docs/INTERFACE_VALIDATION_DESIGN.md

Interface-level validation은 각 interface를 검증한다.
Entry Point에서 export된 interface를 추출한다.
```

**Problems**:
- "Interface" - 코드? 개념?
- "Entry Point" vs "Entry Point Module" - 같은 것?
- 용어 정의가 어디 있는지 불명확

---

### After (With Term System)

```yaml
# docs/GLOSSARY.md
---
definitions:
  - term: "Entry Point Module"
    id: "entry-point-module"
    type: concept
    definition: "외부에 노출되는 최상위 public API 모듈"
    aliases: ["진입점 모듈"]

  - term: "Code Interface"
    id: "code-interface"
    type: entity
    definition: "TypeScript interface, class, type 등"

  - term: "Interface-level Validation"
    id: "interface-level-validation"
    type: process
    definition: "개별 코드 인터페이스 단위 검증"
---
```

```markdown
# docs/INTERFACE_VALIDATION_DESIGN.md

[[Interface-level Validation]]은 각 [[Code Interface]]를 검증한다.
[[Entry Point Module]]에서 export된 [[Code Interface]]를 추출한다.
```

**Benefits**:
- ✅ 모든 용어가 GLOSSARY에 정의됨
- ✅ 링크로 정의 참조 가능
- ✅ 자동 검증으로 일관성 보장
- ✅ 새로운 기여자도 용어 이해 쉬움

---

## Best Practices

### DO ✅

1. **Define terms in GLOSSARY.md**
   ```yaml
   definitions:
     - term: "Core Concept"
       definition: "Clear, concise definition"
   ```

2. **Use canonical names consistently**
   ```markdown
   ✅ "Entry Point Module" throughout document
   ```

3. **Link to definitions**
   ```markdown
   ✅ [[Entry Point Module]]은...
   ```

4. **Disambiguate similar terms**
   ```yaml
   - term: "Code Interface"
     not_to_confuse: "User Interface"
   ```

5. **Provide examples**
   ```yaml
   examples:
     - "src/cli.ts"
     - "src/parsers/ParserFactory.ts"
   ```

### DON'T ❌

1. **Don't use inconsistent terms**
   ```markdown
   ❌ Entry Point... later: 진입점... later: EntryPoint
   ```

2. **Don't define same term twice**
   ```markdown
   ❌ GLOSSARY.md: "Entry Point = X"
   ❌ DESIGN.md: "Entry Point = Y"
   ```

3. **Don't use terms without definition**
   ```markdown
   ❌ "Top-Level Method를 사용" (정의 없음)
   ```

4. **Don't create circular definitions**
   ```yaml
   ❌ A: "B를 사용하는 것"
   ❌ B: "A에서 사용되는 것"
   ```

5. **Don't mix languages in term names**
   ```markdown
   ❌ "Entry Point 모듈"
   ✅ "Entry Point Module" (Korean: 진입점 모듈)
   ```

---

## FAQ

### Q: 모든 용어를 정의해야 하나요?

**A**: 아니오. 정의가 필요한 용어만:
- ✅ 도메인 특화 용어 (Entry Point Module, Top-Level Interface)
- ✅ 중의적이거나 혼동 가능한 용어 (Interface)
- ✅ 프로젝트 전체에서 자주 사용되는 핵심 개념
- ❌ 일반적인 프로그래밍 용어 (function, variable)

---

### Q: 용어가 충돌하면 어떻게 하나요?

**A**: 더 구체적인 이름으로 구분:
```yaml
❌ "Interface" (충돌)
✅ "Code Interface" + "User Interface" (명확)
```

---

### Q: 다국어 용어는 어떻게 처리하나요?

**A**: Canonical name은 영어, 별칭으로 다국어:
```yaml
definitions:
  - term: "Entry Point Module"  # Canonical (English)
    aliases:
      - "진입점 모듈"            # Korean
      - "点入模块"              # Chinese (if needed)
```

문서 내에서는:
```markdown
Entry Point Module(이하 "진입점 모듈")은...
이후 "진입점 모듈"로 표기.
```

---

### Q: 기존 문서를 모두 바꿔야 하나요?

**A**: 점진적 마이그레이션:
1. GLOSSARY.md 먼저 생성
2. 새 문서는 용어 시스템 적용
3. 기존 문서는 업데이트 시 적용
4. CI에서 경고만 (에러 X)

---

### Q: 검증 도구는 언제 실행하나요?

**A**:
- 로컬: 문서 작성 후 `edgedoc validate terms`
- CI/CD: PR 시 자동 실행
- 초기에는 warning만, 안정화 후 error로

---

## Related Documents

- [Interface Validation Design](./INTERFACE_VALIDATION_DESIGN.md)
- [Interface Validation Integration](./INTERFACE_VALIDATION_INTEGRATION.md)

---

**Document Status**: ✅ Proposal Complete
**Last Updated**: 2025-10-24
**Next Steps**: Phase 1 - Create docs/GLOSSARY.md
