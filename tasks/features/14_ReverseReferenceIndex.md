---
type: feature
status: active
feature: reverse-reference-index
priority: high
entry_point: "src/tools/build-reference-index.ts"
related_features:
  - 13_ValidateTerms
  - 03_ValidateOrphans
code_references:
  - "src/tools/build-reference-index.ts"
  - "src/tools/graph-query.ts"
  - "src/types/reference-index.ts"
---

# Reverse Reference Index

**Command**: `edgedoc graph`, `edgedoc build-index`

## Purpose

문서 간 양방향 탐색을 위한 역방향 인덱스를 빌드 타임에 생성한다. 이를 통해 접기/펼치기 기능의 기반을 마련한다.

## Problem

현재 참조 시스템의 문제점:

1. **역방향 탐색 불가**
   - Feature → Code: `code_references`로 가능
   - Code → Feature: 전체 feature 문서 스캔 필요 ❌

2. **관계 방향 불명확**
   - `related_features`가 "의존" vs "사용됨" 구분 안 됨

3. **분산된 정보**
   - Interface의 `from`/`to`가 Feature에서 보이지 않음
   - Term 참조는 본문 파싱 필요

## Solution

빌드 타임에 모든 참조를 수집하여 역방향 인덱스를 생성한다.

### 생성 파일

```
.edgedoc/
  references.json         # 전체 참조 인덱스
  feature-to-code.json    # Feature → Code
  code-to-features.json   # Code → Features (역방향)
  feature-graph.json      # Feature 간 관계 그래프
  interface-map.json      # Interface 연결 맵
  term-usage.json         # Term 사용 통계
```

## Architecture

### Components

- [ ] **ReferenceIndexBuilder** (`src/tools/build-reference-index.ts`)
  - [ ] 모든 frontmatter 파싱
  - [ ] Term 참조 추출 (기존 TermParser 활용)
  - [ ] Import graph 구축 (기존 ParserFactory 활용)
  - [ ] 역방향 맵 생성

- [ ] **ReferenceIndex** (`src/types/reference-index.ts`)
  - [ ] 타입 정의
  - [ ] 인덱스 스키마

- [ ] **GraphCommand** (`src/cli.ts`)
  - [ ] `edgedoc graph` 명령어
  - [ ] 관계 시각화 (ASCII art)

### Data Schema

```typescript
// src/types/reference-index.ts
export interface ReferenceIndex {
  version: string;
  generated: string;
  features: FeatureIndex;
  code: CodeIndex;
  interfaces: InterfaceIndex;
  terms: TermIndex;
}

export interface FeatureIndex {
  [featureId: string]: {
    file: string;

    // 코드 참조
    code: {
      uses: string[];           // code_references
      used_by: string[];        // 역방향 (import graph)
    };

    // Feature 관계
    features: {
      related: string[];        // related_features (원본)
      depends_on: string[];     // 추론 또는 명시
      used_by: string[];        // 역방향
    };

    // Interface 연결
    interfaces: {
      provides: string[];       // 이 feature가 제공하는 interface
      uses: string[];           // 이 feature가 사용하는 interface
    };

    // Term 사용
    terms: {
      defines: string[];        // document-scoped 정의
      uses: string[];           // 본문에서 [[Term]] 참조
    };

    // Test 관계
    tests: {
      tested_by: string[];      // test files
    };
  };
}

export interface CodeIndex {
  [filePath: string]: {
    type: 'source' | 'test' | 'config';

    // 문서화
    documented_in: string[];    // 이 코드를 참조하는 features

    // 코드 의존성
    imports: string[];          // 이 파일이 import하는 것
    imported_by: string[];      // 이 파일을 import하는 것

    // 심볼 정보 (optional, 나중에 추가)
    exports?: {
      name: string;
      type: 'function' | 'class' | 'interface' | 'type';
      line: number;
    }[];
  };
}

export interface InterfaceIndex {
  [interfaceId: string]: {
    file: string;
    from: string;               // 호출하는 feature
    to: string;                 // 호출되는 feature
    type: string;               // command, data, etc.
    shared_types: string[];     // 사용하는 공용 타입
  };
}

export interface TermIndex {
  [term: string]: {
    definition: {
      file: string;
      line: number;
      scope: 'global' | 'document';
    };
    references: Array<{
      file: string;
      line: number;
      context: string;
    }>;
    usage_count: number;
  };
}
```

## Implementation Tasks

### Task 1: Type Definitions ✅
- [x] `src/types/reference-index.ts` 작성
- [x] `ReferenceIndex`, `FeatureIndex`, `CodeIndex` 타입
- [x] `InterfaceIndex`, `TermIndex` 타입

### Task 2: Index Builder Core ✅
- [x] `src/tools/build-reference-index.ts` 작성
- [x] `buildReferenceIndex()` 함수
- [x] Frontmatter 파싱 로직
- [x] 역방향 맵 생성 로직

### Task 3: Feature Indexing ✅
- [x] `extractFeatureReferences()` 함수
- [x] `code_references` 추출
- [x] `related_features` 추출
- [x] `interfaces` 필드 추출 (있으면)

### Task 4: Code Indexing ✅
- [x] `extractCodeDependencies()` 함수
- [x] Import graph 구축 (simplified)
- [x] `documented_in` 역방향 맵 생성

### Task 5: Interface Indexing ✅
- [x] `extractInterfaceConnections()` 함수
- [x] Interface 문서 파싱
- [x] `from`/`to` 추출
- [x] Feature ↔ Interface 연결

### Task 6: Term Indexing ✅
- [x] `extractTermUsage()` 함수
- [x] 기존 TermParser 활용
- [x] Term 정의 + 참조 수집
- [x] 사용 통계 계산

### Task 7: CLI Integration ✅
- [x] `edgedoc graph build` 명령어
- [x] `edgedoc graph query` 명령어
- [x] `.edgedoc/` 디렉토리 생성
- [x] JSON 파일 저장

### Task 8: Graph Visualization ✅
- [x] Query functions (feature, code, term)
- [x] Pretty print output with emojis
- [x] Overview statistics
- [x] Reverse lookup support

### Task 9: Testing
- [ ] Unit tests for index builder
- [ ] Integration tests for CLI
- [ ] Test with actual project docs
- [ ] Validate generated JSON schema

### Task 10: Documentation
- [ ] README에 `edgedoc graph` 사용법 추가
- [ ] SYNTAX_GUIDE에 인덱스 설명 추가
- [ ] JSON schema 문서화

## Usage Examples

### Build Index

```bash
# 인덱스 생성
edgedoc build-index -p /path/to/project

# 출력:
# 🔨 Building reference index...
# 📄 Found 14 features
# 💾 Found 29 code files
# 🔗 Found 8 interfaces
# 📚 Found 24 terms
#
# ✅ Index generated: .edgedoc/references.json
```

### View Graph

```bash
# Feature 관계 그래프
edgedoc graph -p /path/to/project

# 출력:
# 📊 Feature Dependency Graph
#
# 00_Init
# ├─► 01_ValidateMigration (via interface 00--01)
# ├─► 02_ValidateNaming (via interface 00--02)
# └─► 03_ValidateOrphans (via interface 00--03)
#
# 06_ValidateAll
# ├─► 01_ValidateMigration
# ├─► 02_ValidateNaming
# ├─► 03_ValidateOrphans
# ├─► 04_ValidateStructure
# ├─► 05_ValidateSpecOrphans
# └─► 13_ValidateTerms
```

### Query Specific Feature

```bash
# 특정 feature 상세 정보
edgedoc graph validate-terms

# 출력:
# 📦 Feature: validate-terms
#
# Uses Code:
#   - src/tools/validate-terms.ts
#   - src/parsers/TermParser.ts
#   - src/tools/term-registry.ts
#   - src/tools/term-commands.ts
#   - src/types/terminology.ts
#
# Used By Code:
#   - src/cli.ts (imports validateTerms)
#
# Related Features:
#   - 10_Internationalization (depends on)
#   - 06_ValidateAll (used by)
#
# Uses Terms:
#   - Term Definition
#   - Documentation Symbol
#   - Validation
#   - TermParser
```

### Reverse Lookup (Code → Features)

```bash
# 코드 파일이 어디서 사용되는지 확인
edgedoc graph --code src/parsers/TermParser.ts

# 출력:
# 📄 Code: src/parsers/TermParser.ts
#
# Documented In:
#   - 13_ValidateTerms
#
# Imported By:
#   - src/tools/validate-terms.ts
#   - src/tools/term-commands.ts
#   - src/cli.ts
#
# Imports:
#   - src/types/terminology.ts
```

## Integration with Existing Tools

### Validation Commands

- [ ] `edgedoc validate structure`에 인덱스 검증 추가
  - [ ] Interface `from`/`to`가 실제 feature 존재하는지
  - [ ] `related_features`가 실제 feature 존재하는지

- [ ] `edgedoc validate orphans`에 인덱스 활용
  - [ ] 인덱스 있으면 빠른 조회
  - [ ] 없으면 기존 로직 사용

### Sync Command

- [ ] `edgedoc sync` 실행 시 인덱스 자동 갱신
- [ ] `code_references` 업데이트 후 인덱스 재구축

### Term Commands

- [ ] `edgedoc terms find` 결과에 "Referenced In" 추가
- [ ] 인덱스에서 빠른 조회

## Performance

### Build Time
- **Small project** (~10 features, ~30 files): < 1s
- **Medium project** (~50 features, ~200 files): < 5s
- **Large project** (~200 features, ~1000 files): < 30s

### Index Size
- **Small project**: ~50 KB
- **Medium project**: ~500 KB
- **Large project**: ~2 MB

### Incremental Updates
- [ ] Watch mode: 파일 변경 시 증분 업데이트
- [ ] Dirty flag: 변경된 부분만 재계산

## Future Enhancements

### Phase 2: UI Integration
- [ ] VSCode extension: hover로 참조 정보 표시
- [ ] Web viewer: 인터랙티브 그래프
- [ ] Jump to definition

### Phase 3: Symbol-level Tracking
- [ ] Tree-sitter로 함수/클래스 추출
- [ ] `code_references`에 심볼 정보 포함
- [ ] Method 레벨 추적

### Phase 4: Smart Suggestions
- [ ] "이 코드를 사용하는 feature가 없습니다" 경고
- [ ] "관련 feature 추천" (유사 코드 사용 패턴)
- [ ] "Missing documentation" 제안

## Related

- [[Validation]]: 구조 검증과 통합
- [[Code References]]: Frontmatter 필드
- docs/REFERENCE_SYSTEM_ANALYSIS.md: 상세 분석
- docs/SYNTAX_GUIDE.md: 참조 시스템 설명

## Test Cases

### Test 1: Basic Index Generation
```bash
# Given: project with 3 features, 5 code files
# When: edgedoc build-index
# Then: .edgedoc/references.json created
#       Contains all features, code, and reverse mappings
```

### Test 2: Reverse Lookup
```bash
# Given: feature A uses code X
# When: build index
# Then: code X has "documented_in: [A]"
#       feature A has "code.uses: [X]"
```

### Test 3: Feature Graph
```bash
# Given: A related_features: [B], B related_features: [C]
# When: edgedoc graph
# Then: Shows A → B → C tree
```

### Test 4: Interface Connections
```bash
# Given: interface 00--01 from: "A", to: "B"
# When: build index
# Then: feature A has "interfaces.provides: [00--01]"
#       feature B has "interfaces.uses: [00--01]"
```

### Test 5: Term Usage
```bash
# Given: feature A uses [[Term X]], [[Term Y]]
# When: build index
# Then: feature A has "terms.uses: [Term X, Term Y]"
#       term X has "references: [{file: A, ...}]"
```

### Test 6: Circular Dependencies
```bash
# Given: A related_features: [B], B related_features: [A]
# When: edgedoc graph
# Then: Shows circular dependency warning
#       Graph visualization marks cycle
```

## Schema Validation

- [ ] JSON Schema for `references.json`
- [ ] Validation on load
- [ ] Version compatibility check
