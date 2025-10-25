---
feature: "19_SyntaxTermSystem"
entry_point: "src/tools/syntax-manager.ts"
type: "documentation"
status: "active"
code_references:
  - "src/tools/syntax-manager.ts"
  - "src/validators/syntax-validator.ts"
related_features:
  - "13_ValidateTerms"
  - "18_ImplementationCoverage"
  - "04_ValidateStructure"
---

# 19_SyntaxTermSystem - Syntax Term Management

## 개요

문서 작성 문법을 [[Syntax Term]] 형태로 정의하고, Feature처럼 관리하며, 코드 구현과 1:1 매핑하는 시스템입니다.

**핵심 개념**: "문법도 Feature처럼 추적 가능하게"

## Problem

현재 문제점:

1. **문법 문서화 부족**
   - 어떤 문법이 있는지 한눈에 파악 불가
   - Parser가 인식하는 패턴을 문서로만 설명
   - 사용 예시와 검증 규칙이 흩어져 있음

2. **코드-문서 불일치**
   - Parser 구현이 변경되어도 문서는 outdated
   - 문법 정의와 구현 로직 위치를 찾기 어려움
   - "이 문법을 어디서 파싱하는지" 알기 어려움

3. **검증 불가**
   - 문법이 올바르게 사용되는지 자동 검증 불가
   - Invalid 사용을 찾으려면 수동 확인 필요
   - 에러 메시지가 일관성 없음

4. **확장성 부족**
   - 새 문법 추가 시 어디를 수정해야 하는지 모호
   - 문법 간 관계 추적 불가
   - 문법 사용처 찾기 어려움

## Solution

[[Syntax Term]]을 Feature처럼 `tasks/syntax/`에서 관리하고, 시스템이 자동으로 추적/검증하도록 합니다.

### 핵심 기능

1. **Syntax as Feature**: 문법 용어를 tasks/syntax/에 Feature처럼 정의
2. **Code-Doc Mapping**: Parser 구현 위치와 문법 정의를 1:1 매핑
3. **Validation**: 문법 사용을 자동 검증
4. **Usage Tracking**: 프로젝트에서 문법 사용처 자동 추적

## Architecture

### Directory Structure

```
tasks/
  syntax/                              # Syntax term definitions
    Component-Definition.md            # [[Component Definition]]
    Frontmatter-Field.md               # [[Frontmatter Field]]
    Term-Definition.md                 # [[Term Definition]]
    Test-Reference.md                  # [[Test Reference]]
    Public-Interface.md                # [[Public Interface]]

  features/                            # Feature implementations
    18_ImplementationCoverage.md
    19_SyntaxTermSystem.md             # This file
    ...

docs/
  syntax/
    INDEX.md                           # Auto-generated index
    examples/                          # Valid and invalid examples
      component-missing-path.md
      component-wrong-section.md
      ...
```

### Components

1. **SyntaxTermManager** (`src/tools/syntax-manager.ts`)
   - collectSyntaxTerms()
   - findSyntaxTerm()
   - validateSyntaxUsage()
   - generateSyntaxIndex()

2. **SyntaxValidator** (`src/validators/syntax-validator.ts`)
   - validateComponentDefinition()
   - validateFrontmatterField()
   - validateTermDefinition()
   - reportSyntaxErrors()

3. **SyntaxUsageTracker** (`src/tools/syntax-usage-tracker.ts`)
   - findUsagesInProject()
   - trackSyntaxReferences()
   - generateUsageReport()

## Data Schema

### Syntax Term Frontmatter

```yaml
---
feature: "syntax:Component-Definition"
type: "syntax"
status: "documented"
parser: "src/tools/implementation-coverage.ts:extractDocumentedComponents"
validator: "src/validators/component-validator.ts"
related_features:
  - "18_ImplementationCoverage"
examples:
  valid:
    - "tasks/features/13_ValidateTerms.md:56-75"
  invalid:
    - "docs/syntax/examples/component-missing-path.md"
---
```

### Syntax Term Interface

```typescript
export interface SyntaxTerm {
  id: string;                    // "syntax:Component-Definition"
  name: string;                  // "Component Definition"
  type: 'syntax';
  status: 'documented' | 'planned' | 'deprecated';

  // Implementation
  parser: string;                // File:function or file:line
  validator?: string;            // Validator implementation

  // Documentation
  description: string;
  patterns: SyntaxPattern[];
  rules: ValidationRule[];

  // Examples
  examples: {
    valid: string[];             // File paths with line numbers
    invalid: string[];           // Example files
  };

  // Relations
  relatedFeatures: string[];     // Features that use this syntax
  relatedTerms: string[];        // Related syntax terms

  // Usage
  usages: SyntaxUsage[];         // Where this syntax is used
}

export interface SyntaxPattern {
  name: string;                  // "Pattern 1: Numbered List"
  format: string;                // Markdown format
  regex: string;                 // Parser regex
  description: string;
}

export interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning';
  errorMessage: string;
}

export interface SyntaxUsage {
  file: string;                  // tasks/features/13_ValidateTerms.md
  line: number;                  // 56
  context: string;               // Surrounding lines
  pattern: string;               // Which pattern was used
}
```

## CLI Commands

### 1. List Syntax Terms

```bash
edgedoc syntax list

# Output:
# 📝 Syntax Terms (5)
#
# Documentation Structure:
#   - [[Component Definition]] (documented)
#   - [[Architecture Section]] (planned)
#
# Term System:
#   - [[Term Definition]] (documented)
#   - [[Term Reference]] (documented)
#
# Test References:
#   - [[Test Reference]] (documented)
```

### 2. Show Syntax Term

```bash
edgedoc syntax show "Component Definition"

# Output:
# 📝 [[Component Definition]]
#
# Type: Documentation Structure Syntax
# Status: documented
# Parser: src/tools/implementation-coverage.ts:extractDocumentedComponents
#
# Patterns (3):
#   1. Numbered List: "1. **Name** (`path`)"
#   2. Heading with File: "### Name" + "**File**: `path`"
#   3. Heading with Location: "### Name" + "**Location**: `path`"
#
# Used By:
#   - 13_ValidateTerms (4 usages)
#   - 09_MultiLanguageParser (2 usages)
#   - 10_Internationalization (1 usage)
#   - 16_FeatureInfo (1 usage)
#
# Examples:
#   Valid: tasks/features/13_ValidateTerms.md:56
#   Invalid: docs/syntax/examples/component-missing-path.md
```

### 3. Find Syntax Usage

```bash
edgedoc syntax usage "Component Definition"

# Output:
# 🔍 Usage of [[Component Definition]]
#
# Found in 4 features:
#
# ✅ tasks/features/13_ValidateTerms.md:56
#    Pattern: Numbered List
#    1. **TermParser** (`src/parsers/TermParser.ts`)
#
# ✅ tasks/features/09_MultiLanguageParser.md:45
#    Pattern: Heading with Location
#    ### ParserFactory
#    **Location**: `src/parsers/ParserFactory.ts`
#
# ✅ tasks/features/10_Internationalization.md:40
#    Pattern: Heading with File
#    ### TranslationManager
#    **File**: `src/shared/i18n.ts`
#
# ✅ tasks/features/16_FeatureInfo.md:50
#    Pattern: Numbered List
#    1. **FeatureInfoCollector** (`src/tools/feature-info.ts`)
```

### 4. Validate Syntax Usage

```bash
edgedoc validate syntax

# Output:
# 📊 Syntax Validation Report
#
# ✅ Valid Usage (8/10)
#   - [[Component Definition]]: 4 usages, all valid
#   - [[Test Reference]]: 4 usages, all valid
#
# ❌ Invalid Usage (2/10)
#   - [[Component Definition]]: 2 errors
#     tasks/features/12_AnalyzeEntryPoints.md:92
#     Error: Component missing file path
#
#     tasks/features/14_ReverseReferenceIndex.md:60
#     Error: Component in wrong section (Solution)
```

### 5. Generate Syntax Index

```bash
edgedoc syntax index

# Output:
# ✅ Generated docs/syntax/INDEX.md
#
# Included:
#   - 5 syntax terms
#   - 12 examples
#   - 8 usage references
```

## Implementation Plan

### Phase 1: Core Infrastructure ✅

- [x] Design syntax term structure
- [x] Create tasks/syntax/ directory
- [x] Implement [[Component Definition]] as first term
- [x] Create example files (valid/invalid)
- [x] Update SYNTAX_GUIDE.md

### Phase 2: Syntax Manager (Current)

- [ ] **SyntaxTermManager** (`src/tools/syntax-manager.ts`)
  - [ ] collectSyntaxTerms() - Parse tasks/syntax/*.md
  - [ ] findSyntaxTerm() - Find term by ID or name
  - [ ] parseSyntaxTerm() - Parse frontmatter + content
  - [ ] getSyntaxTerms() - Get all terms

- [ ] **CLI Integration** (`src/cli.ts`)
  - [ ] `edgedoc syntax list` - List all syntax terms
  - [ ] `edgedoc syntax show <term>` - Show term details
  - [ ] `edgedoc syntax usage <term>` - Find usages
  - [ ] `edgedoc syntax index` - Generate INDEX.md

### Phase 3: Validation

- [ ] **SyntaxValidator** (`src/validators/syntax-validator.ts`)
  - [ ] validateComponentDefinition()
  - [ ] validateFrontmatterField()
  - [ ] validateTermDefinition()
  - [ ] reportSyntaxErrors()

- [ ] **CLI Integration**
  - [ ] `edgedoc validate syntax` - Validate all syntax usage
  - [ ] `edgedoc validate syntax --term <term>` - Validate specific term

### Phase 4: Usage Tracking

- [ ] **SyntaxUsageTracker** (`src/tools/syntax-usage-tracker.ts`)
  - [ ] findUsagesInProject()
  - [ ] trackSyntaxReferences()
  - [ ] generateUsageReport()
  - [ ] detectUnusedSyntax()

- [ ] **Auto-generated INDEX.md**
  - [ ] Scan tasks/syntax/
  - [ ] Extract metadata
  - [ ] Generate usage statistics
  - [ ] Update docs/syntax/INDEX.md

### Phase 5: Additional Syntax Terms

- [ ] [[Frontmatter Field]]
- [ ] [[Term Definition]]
- [ ] [[Test Reference]]
- [ ] [[Public Interface]]
- [ ] [[Entry Point]]
- [ ] [[Architecture Section]]

## Benefits

### 1. Systematic Management

문법이 Feature처럼 관리되므로:
- `edgedoc feature list` 명령어로 syntax도 표시
- Related features 자동 추적
- Status 관리 (documented/planned/deprecated)

### 2. Code-Doc Synchronization

Parser 위치가 명시되므로:
- 코드 변경 시 영향받는 문법 즉시 확인
- Parser 구현과 문법 정의 항상 동기화
- Implementation coverage가 syntax도 추적

### 3. Automatic Validation

검증 자동화:
- 문법 사용이 올바른지 자동 검증
- Invalid 패턴 자동 탐지
- 일관된 에러 메시지

### 4. Discoverability

문법 발견 용이:
- 전체 문법 목록 한눈에 확인
- 사용 예시 즉시 조회
- Related terms 탐색 가능

## Examples

### Example 1: Add New Syntax Term

```bash
# 1. Create syntax term file
cat > tasks/syntax/Frontmatter-Field.md << 'EOF'
---
feature: "syntax:Frontmatter-Field"
type: "syntax"
status: "documented"
parser: "src/tools/structure-validator.ts:parseFrontmatter"
related_features:
  - "04_ValidateStructure"
---

# [[Frontmatter Field]]

YAML frontmatter field definition...
EOF

# 2. Add examples
cat > docs/syntax/examples/frontmatter-invalid-type.md << 'EOF'
Invalid example: type field with wrong value
EOF

# 3. Generate index
edgedoc syntax index

# ✅ New syntax term added and indexed
```

### Example 2: Find and Fix Invalid Usage

```bash
# 1. Validate syntax
edgedoc validate syntax --term "Component Definition"

# ❌ Found 2 errors:
#   tasks/features/14_ReverseReferenceIndex.md:60
#   Error: Component in wrong section

# 2. Show details
edgedoc syntax show "Component Definition"

# 📝 Valid sections: Architecture, Components, Implementation

# 3. Fix the document
# Move component from "Solution" to "Architecture" section

# 4. Re-validate
edgedoc validate syntax --term "Component Definition"

# ✅ All syntax usage valid
```

## Related Features

- [Feature 13: ValidateTerms](13_ValidateTerms.md) - Term reference system
- [Feature 18: ImplementationCoverage](18_ImplementationCoverage.md) - Component detection
- [Feature 04: ValidateStructure](04_ValidateStructure.md) - Frontmatter validation

## See Also

- [Syntax Index](../../docs/syntax/INDEX.md) - Syntax terms catalog
- [SYNTAX_GUIDE.md](../../docs/SYNTAX_GUIDE.md) - User syntax guide
- [Component Definition](../syntax/Component-Definition.md) - First syntax term
