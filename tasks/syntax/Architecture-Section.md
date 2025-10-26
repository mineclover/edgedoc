---
feature: "syntax:Architecture-Section"
type: "syntax"
status: "documented"
parser: "src/tools/structure-validator.ts:extractArchitectureSections"
validator: "src/validators/architecture-validator.ts"
related_features:
  - "18_ImplementationCoverage"
  - "04_ValidateStructure"
  - "13_ValidateTerms"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:28-75"
    - "tasks/features/09_MultiLanguageParser.md:30-65"
    - "tasks/features/18_ImplementationCoverage.md:35-120"
  invalid:
    - "docs/syntax/examples/architecture-missing-components.md"
    - "docs/syntax/examples/architecture-no-methods.md"
---

# [[Architecture Section]]

**Type**: Document Structure Syntax
**Scope**: Feature Documents
**Used By**: Implementation Coverage (`edgedoc test coverage --code`)
**Validated By**: `extractArchitectureSections()` (src/tools/structure-validator.ts:85-250)

## 정의

Feature 문서에서 **코드 구현의 아키텍처를 설명하는 섹션**을 정의하는 문법입니다.

Architecture Section은:
- Feature가 구현하는 **주요 컴포넌트(클래스, 모듈)** 를 나열
- 각 컴포넌트의 **public interface(메서드)** 를 정의
- 문서화된 구조와 **실제 코드 구현** 을 비교하는 기초
- [[Component Definition]]과 [[Public Interface]]를 포함하는 **상위 구조**

## 문법 (Syntax)

Architecture Section은 3가지 형식으로 구성됩니다:

### Pattern 1: Standard Layout (권장)

```markdown
## Architecture

### Components

1. **ComponentName1** (`path/to/file1.ts`)
   - publicMethod1()
   - publicMethod2()

2. **ComponentName2** (`path/to/file2.ts`)
   - method1()
   - method2()
   - method3()

### Data Schema

(Optional: Type definitions, interfaces)

### Algorithm

(Optional: Algorithm description)
```

**특징**:
- `## Architecture` 최상위 헤딩
- `### Components` 필수 서브섹션
- 각 컴포넌트는 [[Component Definition]] 형식
- 각 메서드는 [[Public Interface]] 형식
- 선택사항: Data Schema, Algorithm 서브섹션

**파싱 로직**:
```typescript
// Detect section header
if (line.match(/^##\s+Architecture/i)) {
  inArchitectureSection = true;
  architectureContent = [];
}

// Detect Components subsection
if (inArchitectureSection && line.match(/^###\s+Components/i)) {
  inComponentsSection = true;
}

// Parse components until next section
if (inComponentsSection && line.match(/^\d+\.\s+\*\*([^*]+)\*\*/)) {
  // Component definition found
}
```

### Pattern 2: Compact Layout (Components 직접)

```markdown
## Components

1. **ComponentName1** (`path/to/file1.ts`)
   - method1()

2. **ComponentName2** (`path/to/file2.ts`)
   - method1()
```

**특징**:
- `## Components` 직접 사용 (## Architecture 생략)
- Architecture Section으로 인정됨
- 간결한 문서에 적합

**파싱 로직**:
```typescript
// Accept ## Components as direct architecture section
if (line.match(/^##\s+Components/i)) {
  inArchitectureSection = true;
  inComponentsSection = true;
}
```

### Pattern 3: Implementation Section

```markdown
## Implementation

### Components

1. **ComponentName1** (`path/to/file1.ts`)
   - method1()
   - method2()

2. **ComponentName2** (`path/to/file2.ts`)
   - method1()
```

**특징**:
- `## Implementation` 헤딩도 아키텍처 역할 가능
- Components 서브섹션 필수
- Solution과는 다름 (Solution은 사용 방법, Implementation은 구현 구조)

**파싱 로직**:
```typescript
// Implementation section can also serve as architecture
if (line.match(/^##\s+Implementation/i)) {
  if (findNextSubsection(lines, i).match(/Components/i)) {
    inArchitectureSection = true;
  }
}
```

## Structure Requirements

Architecture Section의 내부 구조 요구사항:

### Required Elements

```markdown
## Architecture
├─ ### Components                    ✅ 필수
│  ├─ 1. **Component1** (`file.ts`) ✅ 최소 1개
│  │  ├─ - method1()
│  │  └─ - method2()
│  └─ 2. **Component2** (`file.ts`)
│
├─ ### Data Schema                   ⚠️ 선택사항
│  └─ Type definitions, interfaces
│
└─ ### Algorithm                     ⚠️ 선택사항
   └─ Algorithm description
```

### Components Subsection

**의무 사항**:
1. `### Components` 헤딩이 명시되어야 함
2. 최소 1개 이상의 컴포넌트 정의
3. 각 컴포넌트는 [[Component Definition]] 형식 준수

**선택사항**:
1. Data Schema subsection - 타입, 인터페이스 정의
2. Algorithm subsection - 동작 알고리즘 설명
3. Utilities subsection - 유틸리티 함수 나열

**파싱 규칙**:
```typescript
// Components subsection validation
if (!architectureContent.includes("### Components")) {
  throw new ValidationError(
    "Architecture Section must include '### Components' subsection"
  );
}

// Count components
const components = architectureContent.match(/^\d+\.\s+\*\*[^*]+\*\*/gm);
if (!components || components.length === 0) {
  throw new ValidationError(
    "Components subsection must define at least one component"
  );
}
```

### Component Definition Inside Architecture

각 컴포넌트는 [[Component Definition]] 문법을 따릅니다:

```markdown
### Components

1. **ComponentName** (`src/path/to/file.ts`)  ← [[Component Definition]]
   - publicMethod1()                          ← [[Public Interface]]
   - publicMethod2()                          ← [[Public Interface]]
   - publicMethod3()                          ← [[Public Interface]]
```

**요구사항**:
- 컴포넌트 이름: 대문자로 시작
- 파일 경로: 백틱으로 감싼 상대 경로
- 메서드: bullet point로 나열 (선택사항)

**파싱 로직** (Component Definition으로 위임):
```typescript
// Delegate to Component Definition parser
const components = extractDocumentedComponents(
  architectureContent,
  featureId
);
```

## Heading Level Rules

Architecture Section의 헤딩 레벨 규칙:

```markdown
# Feature Name

## Architecture ← L2 (Must be L2)

### Components  ← L3 (Must be L3)

1. **Comp1** (`file.ts`)

2. **Comp2** (`file.ts`)

### Data Schema ← L3 (Sibling to Components)

### Algorithm   ← L3 (Sibling to Components)

## Problem     ← L2 (Next section at L2)

Some text...
```

**규칙**:
1. Architecture 헤딩은 **정확히 L2 (`##`)** 이어야 함
2. Components는 **정확히 L3 (`###`)** 이어야 함
3. 선택사항 섹션(Data Schema, Algorithm)도 **L3** 이어야 함
4. 다음 주요 섹션은 **L2** 이어야 함

**파싱 로직**:
```typescript
// Validate heading levels
const archLevel = getHeadingLevel("## Architecture"); // 2
if (archLevel !== 2) {
  throw new ValidationError(
    `Architecture must be L2 heading, not L${archLevel}`
  );
}

const compLevel = getHeadingLevel("### Components"); // 3
if (compLevel !== 3) {
  throw new ValidationError(
    `Components must be L3 heading, not L${compLevel}`
  );
}
```

## Section Positioning Rules

Architecture Section의 위치 규칙:

```markdown
# Feature: 13_ValidateTerms

---
frontmatter
---

## Overview

Basic description...

## Architecture ← 여기 (Overview 다음)

### Components

## Problem (Alternative)

## Solution

## Implementation

## See Also
```

**권장 순서**:
1. Overview/Introduction
2. **Architecture** (코드 구조 설명)
3. Problem (만약 필요하면)
4. Solution (만약 필요하면)
5. Implementation Details (구현 세부사항)
6. Related Features

**규칙**:
- Architecture는 Problem이나 Solution **이전**에 위치해야 함
- Problem, Solution과 중복되지 않아야 함
- 가능하면 Overview 직후에 위치

**검증 로직**:
```typescript
const sections = {
  overview: 10,
  architecture: 20,
  problem: 30,
  solution: 40,
  implementation: 50,
  related: 100
};

const archPos = findSectionPosition("Architecture");
const probPos = findSectionPosition("Problem");
const solutionPos = findSectionPosition("Solution");

if (archPos > probPos && probPos !== -1) {
  throw new ValidationError(
    "Architecture should appear before Problem section"
  );
}
```

## Validation Rules

### Rule 1: Required Heading

Architecture Section 또는 Components 헤딩이 반드시 있어야 함:

```markdown
✅ Valid:
## Architecture
### Components

✅ Valid:
## Components

✅ Valid:
## Implementation
### Components

❌ Invalid:
## Code Structure    # 다른 이름
### Components
```

**파싱 로직**:
```typescript
const validHeaders = [
  "## Architecture",
  "## Components",
  "## Implementation"
];

if (!validHeaders.some(h => content.includes(h))) {
  throw new ValidationError(
    "Document must include Architecture, Components, or Implementation section"
  );
}
```

### Rule 2: Components Subsection Required

`## Architecture` 또는 `## Components` 섹션에는 반드시 컴포넌트가 정의되어야 함:

```markdown
✅ Valid:
## Architecture
### Components
1. **ComponentName** (`path.ts`)
   - method1()

❌ Invalid:
## Architecture
(컴포넌트 정의 없음)
```

**파싱 로직**:
```typescript
const inArchSection = content.includes("## Architecture") ||
                      content.includes("## Components");

const components = extractComponentDefinitions(content);

if (inArchSection && components.length === 0) {
  throw new ValidationError(
    "Architecture/Components section must define at least one component"
  );
}
```

### Rule 3: Component Definition Rules

각 컴포넌트는 [[Component Definition]] 문법을 따릅니다:

```markdown
✅ Valid:
1. **ComponentName** (`src/path/to/file.ts`)
   - method1()
   - method2()

❌ Invalid:
1. **componentName** (`src/path/to/file.ts`)  # 소문자 시작
1. **ComponentName**  # 파일 경로 없음
1. **ComponentName** (file.ts)  # 백틱 없음
```

**위임**: [[Component Definition]] validator 사용

### Rule 4: Heading Level Consistency

헤딩 레벨이 일관되어야 함:

```markdown
✅ Valid:
## Architecture
### Components
1. **Comp1** (`file.ts`)

### Data Schema

✅ Valid:
## Components
1. **Comp1** (`file.ts`)

❌ Invalid:
## Architecture
#### Components   # 레벨이 맞지 않음
1. **Comp1** (`file.ts`)

❌ Invalid:
## Architecture
### Components
1. **Comp1** (`file.ts`)
## Data Schema   # L2여야 L3
```

**파싱 로직**:
```typescript
// Validate consistent heading levels
const archLevel = getHeadingLevel(archHeading);
const compLevel = getHeadingLevel(componentHeading);

if (archLevel - compLevel !== -1) {  // Should be L3 under L2
  throw new ValidationError(
    `Inconsistent heading levels: ${archLevel} and ${compLevel}`
  );
}
```

### Rule 5: No Duplicate Sections

같은 레벨에서 동일한 섹션이 2번 이상 나오면 안 됨:

```markdown
✅ Valid:
## Architecture
### Components
...
### Data Schema
...
(다음 L2 섹션)

❌ Invalid:
## Architecture
### Components
...
## Architecture    # 중복
### Components
```

**파싱 로직**:
```typescript
const architectureSections = content.match(/^##\s+Architecture/gm);
if (architectureSections && architectureSections.length > 1) {
  throw new ValidationError(
    "Only one Architecture section allowed per document"
  );
}
```

## Examples

### ✅ Valid Example 1: Standard Layout

**Feature**: 13_ValidateTerms
**Location**: tasks/features/13_ValidateTerms.md:28-75

```markdown
## Architecture

### Components

1. **TermParser** (`src/parsers/TermParser.ts`)
   - extractDefinitions()
   - extractReferences()

2. **TermRegistry** (`src/tools/term-registry.ts`)
   - addDefinition()
   - find()
   - search()
   - validate()

3. **validateTerms** (`src/tools/validate-terms.ts`)
   - validateTerms()

### Data Schema

```typescript
export interface Term {
  id: string;
  name: string;
  type: string;
  definition: string;
}
```
```

**특징**:
- 표준 레이아웃 (Architecture → Components → Data Schema)
- 3개의 컴포넌트 정의
- 각 컴포넌트의 공개 메서드 나열
- 선택사항 섹션으로 Data Schema 포함

### ✅ Valid Example 2: Compact Layout

**Feature**: 04_ValidateStructure
**Location**: tasks/features/04_ValidateStructure.md:25-40

```markdown
## Components

1. **StructureValidator** (`src/validators/structure.ts`)
   - validateFrontmatter()
   - validateSections()

2. **SectionParser** (`src/tools/section-parser.ts`)
   - findSections()
   - validateOrder()
```

**특징**:
- 간결한 레이아웃 (## Components 직접)
- 2개의 컴포넌트
- 각 컴포넌트의 메서드 정의

### ✅ Valid Example 3: Implementation Section

**Feature**: 18_ImplementationCoverage
**Location**: tasks/features/18_ImplementationCoverage.md:35-120

```markdown
## Implementation

### Components

1. **ImplementationCoverageAnalyzer** (`src/tools/implementation-coverage.ts`)
   - extractDocumentedComponents()
   - extractPublicInterfaces()
   - compareWithActualCode()
   - calculateCoverage()

2. **CoverageReport** (`src/tools/coverage-report.ts`)
   - generateReport()
   - formatMarkdown()

### Algorithm

The coverage analysis follows these steps:

1. Parse all documented components from Architecture section
2. Extract actual code exports using Tree-sitter
3. Match documented vs actual components
4. Calculate coverage percentage

### Data Schema

```typescript
export interface CoverageMetrics {
  total: number;
  documented: number;
  coverage: number;
  missing: string[];
}
```
```

**특징**:
- Implementation 섹션으로 구조 정의
- 2개의 컴포넌트
- Algorithm 설명 포함
- Data Schema 정의

### ❌ Invalid Example 1: Missing Components Subsection

**Location**: docs/syntax/examples/architecture-missing-components.md

```markdown
## Architecture

This feature provides several components but they are not clearly defined.
```

**Error**: Architecture section must include `### Components` subsection with component definitions

**Fix**: Components 서브섹션 추가 및 컴포넌트 정의

```markdown
## Architecture

### Components

1. **MainComponent** (`src/main.ts`)
   - doSomething()
```

### ❌ Invalid Example 2: Wrong Heading Level

**Location**: docs/syntax/examples/architecture-wrong-level.md

```markdown
## Architecture
#### Components   # L4 instead of L3
1. **ComponentName** (`file.ts`)
```

**Error**: Components subsection must be L3 (###), not L4 (####)

**Fix**:
```markdown
## Architecture
### Components   # 정확히 ### 사용
1. **ComponentName** (`file.ts`)
```

### ❌ Invalid Example 3: Components Without File Path

**Location**: docs/syntax/examples/architecture-no-path.md

```markdown
## Architecture

### Components

1. **ComponentName**
   - method1()
```

**Error**: Component missing file path (violates [[Component Definition]])

**Fix**:
```markdown
## Architecture

### Components

1. **ComponentName** (`src/path/to/file.ts`)
   - method1()
```

### ❌ Invalid Example 4: Duplicate Architecture Sections

**Location**: docs/syntax/examples/architecture-duplicate.md

```markdown
## Architecture

### Components

1. **Component1** (`file1.ts`)

## Problem

Some problem...

## Architecture    # 중복!

### Components

1. **Component2** (`file2.ts`)
```

**Error**: Only one Architecture section allowed per document

**Fix**: 모든 컴포넌트를 첫 번째 Architecture 섹션에 통합

```markdown
## Architecture

### Components

1. **Component1** (`file1.ts`)

2. **Component2** (`file2.ts`)

## Problem

Some problem...
```

## Parser Implementation

**File**: src/tools/structure-validator.ts:85-250

**Function**: `extractArchitectureSections()`

**Interface**:
```typescript
export interface ArchitectureSection {
  type: 'architecture' | 'components' | 'implementation';
  startLine: number;
  endLine: number;

  components: DocumentedComponent[];
  dataSchema?: string;
  algorithm?: string;
  utilities?: string[];

  // Coverage analysis
  documentedCount: number;
  methodCount: number;
  coverage?: number;
}

export function extractArchitectureSections(
  docContent: string,
  featureId: string
): ArchitectureSection[];
```

**Algorithm**:
1. Find Architecture/Components/Implementation heading
2. Determine section boundaries (until next L2 heading)
3. Parse Components subsection
4. Extract components using [[Component Definition]] parser
5. Parse optional Data Schema and Algorithm sections
6. Return ArchitectureSection object

## Validator Implementation

**File**: src/validators/architecture-validator.ts

**Validation Steps**:

1. **Heading Presence Check**
   - Verify Architecture, Components, or Implementation exists
   - Check heading level is correct

2. **Components Subsection Check**
   - Verify Components subsection exists
   - Count components (must be >= 1)

3. **Component Definition Validation**
   - Delegate to [[Component Definition]] validator
   - Check each component format

4. **Heading Level Consistency**
   - Verify subsections are L3 under L2 main section
   - Check no heading level gaps

5. **Section Positioning Check**
   - Verify Architecture comes before Problem/Solution
   - Check no duplicate sections

6. **Coverage Calculation**
   - Count documented components
   - Count public methods
   - Generate coverage metrics

## Integration with Analysis Tools

```bash
# Analyze architecture coverage
edgedoc test coverage --code

# Output:
# 📊 Implementation Coverage Report
#
# Feature 13: ValidateTerms
# ├─ Architecture: ✅ Found
# │  ├─ Components: 3 documented
# │  ├─ Actual exports: 5
# │  └─ Coverage: 60% (3/5)
# │
# └─ Issues:
#    └─ ⚠️ 2 components not documented
#       - TermValidator
#       - TermFormatter

# Validate syntax usage
edgedoc validate syntax --term "Architecture Section"
```

## Implementation Status

- [x] Parser implementation (src/tools/structure-validator.ts)
- [x] Heading validation
- [x] Components subsection detection
- [x] Component delegation to [[Component Definition]]
- [ ] Validator implementation (src/validators/architecture-validator.ts)
- [ ] Heading level consistency checks
- [ ] Section positioning validation
- [ ] Duplicate section detection

## Related Terms

- [[Component Definition]] - Architecture 내부의 컴포넌트 정의
- [[Public Interface]] - 각 컴포넌트의 메서드 정의
- [[Entry Point]] - 아키텍처의 진입점
- [[Frontmatter Field]] - 메타데이터 (code_references와 연계)
- [[Implementation Coverage]] - 문서화 vs 실제 코드 비교

## Usage Commands

Check architecture sections:

```bash
# Find all architecture sections
edgedoc test coverage --code

# Check specific feature
edgedoc test coverage --code --feature 13_ValidateTerms

# Validate architecture syntax
edgedoc validate syntax --term "Architecture Section"

# Generate coverage report
edgedoc test coverage --code --report --markdown
```

## See Also

- [Component Definition](../syntax/Component-Definition.md) - Component syntax
- [Public Interface](../syntax/Public-Interface.md) - Method syntax
- [Entry Point](../syntax/Entry-Point.md) - Entry point location
- [Implementation Coverage](../features/18_ImplementationCoverage.md) - Coverage analysis
- [Syntax Index](../../docs/syntax/INDEX.md) - All syntax terms
