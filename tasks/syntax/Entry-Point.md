---
feature: "syntax:Entry-Point"
type: "syntax"
status: "documented"
parser: "src/tools/entry-point-detector.ts:detectEntryPoints"
validator: "src/validators/entry-point-validator.ts"
related_features:
  - "12_AnalyzeEntryPoints"
  - "18_ImplementationCoverage"
  - "04_ValidateStructure"
examples:
  valid:
    - "tasks/features/04_ValidateStructure.md:3"
    - "tasks/features/13_ValidateTerms.md:3"
    - "tasks/features/15_TasksManagement.md:3"
  invalid:
    - "docs/syntax/examples/entry-point-absolute-path.md"
    - "docs/syntax/examples/entry-point-invalid-line.md"
---

# [[Entry Point]]

**Type**: Feature Metadata Syntax
**Scope**: Frontmatter Field in Feature Documents
**Used By**: Analysis Tools (`edgedoc feature info`, `edgedoc analyze-entry-points`)
**Validated By**: `detectEntryPoints()` (src/tools/entry-point-detector.ts:45-120)

## 정의

Feature 문서의 Frontmatter에서 **코드의 진입점 위치**를 명시하는 메타데이터 필드입니다.

진입점은:
- Feature가 구현된 **주요 코드 파일** 위치
- CLI 명령어, 모듈 entry point, 또는 특정 라인 범위
- code_references와 달리 **단일 파일 또는 라인 범위만** 지정

## 문법 (Syntax)

Entry Point는 4가지 형식을 지원합니다:

### Pattern 1: File Path Only (권장)

```yaml
---
entry_point: "src/cli.ts"
---
```

**특징**:
- 파일 경로만 명시
- 진입점이 파일 전체인 경우 사용
- 가장 간단한 형식

**파싱 로직**:
```typescript
// Match simple file path
const pathMatch = line.match(/^entry_point:\s*"([^"]+)"$/);
if (pathMatch && !pathMatch[1].includes(':')) {
  entryPoint = { file: pathMatch[1] };
}
```

### Pattern 2: File with Line Number

```yaml
---
entry_point: "src/cli.ts:72"
---
```

**특징**:
- 파일 경로와 단일 라인 번호
- 특정 함수나 클래스가 시작하는 라인 지정
- 정확한 위치 추적에 유용

**파싱 로직**:
```typescript
// Match file:line format
const match = line.match(/^entry_point:\s*"([^:]+):(\d+)"$/);
if (match) {
  entryPoint = {
    file: match[1],
    line: parseInt(match[2])
  };
}
```

### Pattern 3: File with Line Range

```yaml
---
entry_point: "src/cli.ts:72-86"
---
```

**특징**:
- 파일 경로와 라인 범위 (시작-종료)
- CLI 핸들러 함수 전체 범위를 지정하는 데 유용
- 가장 정확한 위치 지정

**파싱 로직**:
```typescript
// Match file:line-line format
const match = line.match(/^entry_point:\s*"([^:]+):(\d+)-(\d+)"$/);
if (match) {
  entryPoint = {
    file: match[1],
    lineStart: parseInt(match[2]),
    lineEnd: parseInt(match[3])
  };
}
```

### Pattern 4: Module/Class File

```yaml
---
entry_point: "src/tools/entry-point-detector.ts"
---
```

**특징**:
- 모듈 파일의 메인 export 위치
- src/tools, src/validators 등 모듈 파일에 사용
- Pattern 1과 유사하지만 의미상 모듈 중심

**파싱 로직**:
```typescript
// Detect module pattern by directory
if (pathMatch[1].includes('src/tools/') ||
    pathMatch[1].includes('src/validators/')) {
  entryPoint = { file: pathMatch[1], isModule: true };
}
```

## Field Requirements

Entry Point 필드는 **선택사항**이지만, 정의될 경우 다음을 만족해야 합니다:

```yaml
entry_point: "path/to/file.ext" | "path/to/file.ext:line" | "path/to/file.ext:start-end"
```

**파싱 규칙**:
```typescript
const entryPointRegex = /^([^:]+)(?::(\d+)(?:-(\d+))?)?$/;
// Group 1: file path (required)
// Group 2: single line (optional)
// Group 3: end line (optional, requires Group 2)
```

## Validation Rules

### Rule 1: Path Format

경로는 상대 경로만 허용합니다:

```yaml
✅ Valid:
entry_point: "src/cli.ts"
entry_point: "src/tools/entry-point-detector.ts"
entry_point: "src/validators/syntax-validator.ts"
entry_point: "tests/unit/validation.test.ts"

❌ Invalid:
entry_point: "/Users/junwoobang/project/mdoc-tools/src/cli.ts"  # Absolute path
entry_point: "~/project/mdoc-tools/src/cli.ts"  # Home directory
entry_point: "../../src/cli.ts"  # Relative traversal
```

**파싱 로직**:
```typescript
if (path.startsWith('/') || path.startsWith('~') || path.includes('..')) {
  throw new ValidationError("Entry point must be relative path");
}
```

### Rule 2: File Must Exist

명시된 파일은 프로젝트에 실제로 존재해야 합니다:

```yaml
✅ Valid:
entry_point: "src/cli.ts"  # ✅ File exists

❌ Invalid:
entry_point: "src/missing.ts"  # ❌ File not found
entry_point: "src/removed-file.ts"  # ❌ File deleted
```

**검증 로직**:
```typescript
const filePath = resolve(projectRoot, entryPoint.file);
if (!existsSync(filePath)) {
  throw new ValidationError(`File not found: ${entryPoint.file}`);
}
```

### Rule 3: Line Numbers Valid (if specified)

라인 번호가 지정될 경우, 유효한 범위여야 합니다:

```yaml
✅ Valid:
entry_point: "src/cli.ts:72"      # Single line 72
entry_point: "src/cli.ts:72-86"   # Range 72 to 86

❌ Invalid:
entry_point: "src/cli.ts:0"       # Line 0 doesn't exist
entry_point: "src/cli.ts:100-90"  # Start > End
entry_point: "src/cli.ts:999"     # Line beyond file
```

**검증 로직**:
```typescript
const lines = readFileSync(filePath, 'utf-8').split('\n');
const totalLines = lines.length;

if (lineStart < 1 || lineStart > totalLines) {
  throw new ValidationError(
    `Line ${lineStart} out of range (file has ${totalLines} lines)`
  );
}

if (lineEnd && (lineEnd < lineStart || lineEnd > totalLines)) {
  throw new ValidationError(
    `Line range ${lineStart}-${lineEnd} invalid`
  );
}
```

### Rule 4: Semantic Consistency

Entry Point는 실제로 코드를 포함해야 합니다:

```yaml
✅ Valid:
entry_point: "src/cli.ts"           # CLI 진입점
entry_point: "src/index.ts"         # Module export
entry_point: "src/tools/sync.ts"    # Module file
entry_point: "src/cli.ts:72-86"     # Function handler

❌ Invalid:
entry_point: "README.md"            # 문서 파일
entry_point: "package.json"         # 설정 파일
entry_point: "docs/guide.md:1-50"   # 문서 파일
```

**검증 로직**:
```typescript
// Check file extension
const ext = extname(entryPoint.file);
if (!['ts', 'js', 'tsx', 'jsx'].includes(ext)) {
  throw new ValidationError(
    `Entry point must be code file, not ${ext}`
  );
}

// Check for code content (basic check)
const content = readFileSync(filePath, 'utf-8');
if (content.trim().length === 0) {
  throw new ValidationError(
    `Entry point file is empty`
  );
}
```

## Examples

### ✅ Valid Example 1: File Path Only

**Feature**: 04_ValidateStructure
**Location**: tasks/features/04_ValidateStructure.md:3

```yaml
---
feature: "04_ValidateStructure"
entry_point: "src/cli.ts"
---
```

**설명**: CLI의 모든 명령어를 통합 진입점으로 지정

### ✅ Valid Example 2: File with Line Number

**Feature**: 06_ValidateAll
**Location**: tasks/features/06_ValidateAll.md:10

```yaml
---
feature: "06_ValidateAll"
entry_point: "src/cli.ts:42"
---
```

**설명**: `edgedoc validate all` 명령어 핸들러가 라인 42에서 시작

### ✅ Valid Example 3: File with Line Range

**Feature**: 13_ValidateTerms
**Location**: tasks/features/13_ValidateTerms.md:6

```yaml
---
feature: "13_ValidateTerms"
entry_point: "src/cli.ts:156-180"
---
```

**설명**: `edgedoc validate terms` 명령어 핸들러 전체 범위 (라인 156-180)

### ✅ Valid Example 4: Module File

**Feature**: 12_AnalyzeEntryPoints
**Location**: tasks/features/12_AnalyzeEntryPoints.md:5

```yaml
---
feature: "12_AnalyzeEntryPoints"
entry_point: "src/tools/entry-point-detector.ts"
---
```

**설명**: 모듈의 메인 파일로 모든 진입점 분석 기능 포함

### ✅ Valid Example 5: Different File Extensions

**Feature**: 11_MCPServer
**Location**: tasks/features/11_MCPServer.md:4

```yaml
---
feature: "11_MCPServer"
entry_point: "src/index.ts"
---
```

**설명**: TypeScript 파일 (JavaScript로 컴파일됨)

### ❌ Invalid Example 1: Absolute Path

**Location**: docs/syntax/examples/entry-point-absolute-path.md

```yaml
---
entry_point: "/Users/junwoobang/project/mdoc-tools/src/cli.ts"
---
```

**Error**: Entry point must use relative path, not absolute path

**Fix**: `entry_point: "src/cli.ts"`

### ❌ Invalid Example 2: Invalid Line Range

**Location**: docs/syntax/examples/entry-point-invalid-line.md

```yaml
---
entry_point: "src/cli.ts:200-150"
---
```

**Error**: Line range start (200) is greater than end (150)

**Fix**: `entry_point: "src/cli.ts:150-200"`

### ❌ Invalid Example 3: File Not Found

**Location**: docs/syntax/examples/entry-point-missing-file.md

```yaml
---
entry_point: "src/missing-file.ts"
---
```

**Error**: File not found: src/missing-file.ts

**Fix**: 실제로 존재하는 파일 경로로 수정

### ❌ Invalid Example 4: Document File

**Location**: docs/syntax/examples/entry-point-wrong-type.md

```yaml
---
entry_point: "README.md"
---
```

**Error**: Entry point must be code file (.ts, .js, .tsx, .jsx), not .md

**Fix**: `entry_point: "src/cli.ts"`

## Relationship with Other Syntax Terms

Entry Point와 다른 문법 요소의 관계:

```
Frontmatter Field
├─ entry_point: "src/cli.ts:72-86"  ← [[Entry Point]]
├─ code_references: [...]           ← [[Frontmatter Field]]
└─ type: "feature"

       ↓

Content Structure
├─ ## Architecture                  ← [[Architecture Section]]
│  ├─ ### Components
│  │  ├─ 1. **ComponentName** (...) ← [[Component Definition]]
│  │  │  ├─ - methodName()
│  │  │  └─ - methodName()          ← [[Public Interface]]
│  │  └─ 2. **AnotherComponent** (...)
│  │
│  └─ 분석 결과: 문서화된 컴포넌트

## Implementation

### Parser Implementation

**File**: src/tools/entry-point-detector.ts:45-120

**Function**: `detectEntryPoints()`

**Interface**:
```typescript
export interface EntryPoint {
  file: string;           // Relative file path
  line?: number;          // Optional: single line number
  lineStart?: number;     // Optional: range start
  lineEnd?: number;       // Optional: range end
  isModule?: boolean;     // True if module file
  content?: string;       // Code content at location
  type?: string;          // 'cli' | 'module' | 'class'
}

export function detectEntryPoints(
  projectPath: string
): Map<string, EntryPoint>;
```

**Algorithm**:
1. Parse all Feature documents' frontmatter
2. Extract `entry_point` field
3. Parse format (file / file:line / file:line-line)
4. Verify file existence
5. Validate line numbers if specified
6. Extract code content at location
7. Classify type (CLI, module, class)

### Validator Implementation

**File**: src/validators/entry-point-validator.ts

**Validation Steps**:

1. **Syntax Validation**
   - Parse entry_point format
   - Check for valid separators (:)
   - Ensure proper line number format

2. **File Validation**
   - Check file existence
   - Verify file extension (.ts, .js, .tsx, .jsx)
   - Ensure file is not empty

3. **Line Validation**
   - Verify line numbers are positive
   - Check line range start <= end
   - Ensure lines are within file bounds

4. **Semantic Validation**
   - Confirm file is actual code (not docs)
   - Check if content is executable
   - Validate against package.json main/exports

### Integration with CLI

```bash
# Check entry points in all features
edgedoc analyze-entry-points

# Output example:
# 📊 Entry Points Analysis
#
# ✅ Valid (19/19)
#   - 04_ValidateStructure: src/cli.ts
#   - 06_ValidateAll: src/cli.ts:42
#   - 12_AnalyzeEntryPoints: src/tools/entry-point-detector.ts
#
# ⚠️ Warnings (0)
#
# ❌ Errors (0)

# Validate syntax usage
edgedoc validate syntax --term "Entry Point"

# Find all features using specific entry point
edgedoc feature find --entry-point "src/cli.ts"
```

## Implementation Status

- [x] Parser implementation (src/tools/entry-point-detector.ts)
- [x] Basic format support (file / file:line / file:line-line)
- [x] Module pattern detection
- [ ] Validator implementation (src/validators/entry-point-validator.ts)
- [ ] Semantic checks (package.json integration)
- [ ] Syntax usage checker (`edgedoc syntax usage`)
- [ ] Auto-fix suggestions

## Related Terms

- [[Frontmatter Field]] - Entry Point는 frontmatter의 선택 필드
- [[Architecture Section]] - 진입점 파일의 구조 정의
- [[Component Definition]] - 진입점에 포함된 컴포넌트들
- [[Implementation Coverage]] - Entry Point를 통한 커버리지 분석

## Usage Commands

Check and analyze entry points:

```bash
# Analyze all entry points
edgedoc analyze-entry-points

# Get feature information with entry point
edgedoc feature info 13_ValidateTerms

# Validate entry point syntax
edgedoc validate syntax --term "Entry Point"

# Find all features by entry point
edgedoc feature find --entry-point "src/cli.ts" --count
```

## See Also

- [Frontmatter Field](../syntax/Frontmatter-Field.md) - Metadata fields
- [Architecture Section](../syntax/Architecture-Section.md) - Code structure
- [Implementation Coverage](../features/18_ImplementationCoverage.md) - Coverage analysis
- [Analyze Entry Points](../features/12_AnalyzeEntryPoints.md) - Feature implementation
- [Syntax Index](../../docs/syntax/INDEX.md) - All syntax terms
