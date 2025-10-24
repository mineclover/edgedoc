# Interface-Level Validation Implementation Plan

## 목표

**파일 단위 → 인터페이스(최상위 export) 단위 고도화**

현재 시스템은 파일이 문서화되면 내부의 모든 export가 문서화된 것으로 간주합니다. 이를 개선하여 **최상위 public interface(export)를 개별적으로 추적**하고 검증합니다.

## 핵심 개념

### 1. Entry Point Module (진입점 모듈)

**정의**: 프로젝트에서 외부로 노출되는 최상위 public API를 제공하는 모듈

**특징**:
- 사용자가 직접 import하는 모듈
- 내부 구현 세부사항이 아닌 공개 API
- 프로젝트의 "얼굴"이 되는 인터페이스

**예시**:

```typescript
// ✅ Entry Point Module
src/parsers/ParserFactory.ts
  - export class ParserFactory  // 최상위 public interface

// ❌ Not Entry Point (Internal)
src/parsers/TypeScriptParser.ts
  - export class TypeScriptParser  // ParserFactory 내부에서만 사용
```

**현재 프로젝트의 Entry Point Modules**:
1. `src/cli.ts` - CLI 진입점
2. `src/index.ts` - MCP 서버 진입점
3. `src/parsers/ParserFactory.ts` - 파서 시스템 공개 API
4. `src/shared/i18n.ts` - i18n 시스템 공개 API
5. `src/utils/config.ts` - 설정 시스템 공개 API

### 2. Top-Level Interface (최상위 인터페이스)

**정의**: 파일에서 export된 최상위 심볼 (class, interface, type, function, const)

**분류**:

```typescript
// Public API (문서화 필요)
export class ParserFactory { ... }      // ✅ 최상위
export function t(): Messages { ... }   // ✅ 최상위
export interface ILanguageParser { ... } // ✅ 최상위

// Internal Implementation (문서화 선택)
class InternalHelper { ... }            // ❌ 비공개
function privateUtil() { ... }          // ❌ 비공개
```

## 현재 시스템 분석

### 검증 흐름

```
📄 File Level (현재)
  ├─ orphans.ts: 파일이 문서화되었는가?
  │   └─ YES → 파일 내 모든 export가 문서화됨
  └─ spec-orphans.ts: export 추출만 함 (파일 단위 판단)

🎯 Interface Level (목표)
  ├─ orphans.ts: 파일 + 최상위 export 추적
  │   └─ Entry Point Module의 public interface 검증
  └─ spec-orphans.ts: 개별 export 사용 여부 추적
      └─ Import 그래프에서 실제 사용되는 export 확인
```

### 문제점

1. **과도한 문서화**: 내부 구현도 문서화된 것으로 간주
2. **사용되지 않는 export 탐지 불가**: 파일만 문서화되면 OK
3. **Public API 불명확**: 어떤 것이 공개 API인지 구분 어려움

### 예시: ParserFactory

**현재**:
```yaml
# tasks/features/09_MultiLanguageParser.md
entry_point: "src/parsers/ParserFactory.ts"
code_references:
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/TypeScriptParser.ts"  # 내부 구현도 명시
  - "src/parsers/PythonParser.ts"      # 내부 구현도 명시
```

**목표**:
```yaml
# tasks/features/09_MultiLanguageParser.md
entry_point: "src/parsers/ParserFactory.ts"
public_interfaces:
  - "src/parsers/ParserFactory.ts::ParserFactory"
  - "src/parsers/ILanguageParser.ts::ILanguageParser"
code_references:
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/ILanguageParser.ts"
  # TypeScriptParser, PythonParser는 내부 구현 (자동 추적)
```

## 구현 계획

### Phase 1: Entry Point 정의

#### 1.1 Frontmatter 확장

```yaml
---
entry_point: "src/parsers/ParserFactory.ts"
entry_point_type: "module"  # NEW: module | class | function
public_interfaces:           # NEW: 최상위 public API 목록
  - name: "ParserFactory"
    type: "class"
    methods:
      - "getParser"
      - "getSupportedExtensions"
      - "register"
  - name: "ILanguageParser"
    file: "src/parsers/ILanguageParser.ts"
    type: "interface"
code_references:
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/ILanguageParser.ts"
---
```

#### 1.2 Entry Point 자동 감지

**규칙**:
1. CLI 진입점: `src/cli.ts`, `src/index.ts`
2. 다른 feature에서 직접 import하는 파일
3. `entry_point` frontmatter에 명시된 파일

### Phase 2: Interface-Level 추출

#### 2.1 Export 분석 강화

```typescript
// src/parsers/ExportAnalyzer.ts (NEW)

interface TopLevelExport {
  name: string;
  type: 'class' | 'interface' | 'type' | 'function' | 'const';
  file: string;
  isPublic: boolean;  // export 키워드 존재 여부
  methods?: string[]; // class인 경우 public 메서드 목록
  location: { line: number; column: number };
}

export class ExportAnalyzer {
  /**
   * Extract top-level public interfaces from a file
   */
  static extractPublicInterfaces(filePath: string): TopLevelExport[] {
    const parser = ParserFactory.getParser(filePath);
    if (!parser) return [];

    const content = readFileSync(filePath, 'utf-8');
    const { exports } = parser.parse(content, filePath);

    // Filter: Only top-level exports
    return exports.filter(exp => {
      // Exclude default exports of internal helpers
      // Exclude re-exports
      return exp.isPublic && !exp.isReExport;
    });
  }

  /**
   * Extract public methods from a class
   */
  static extractPublicMethods(
    filePath: string,
    className: string
  ): string[] {
    // Use tree-sitter to find class definition
    // Extract public methods (not private/protected)
    return [];
  }
}
```

#### 2.2 Import 그래프 확장

```typescript
// src/tools/interface-graph.ts (NEW)

interface InterfaceUsage {
  interface: string;  // "ParserFactory.getParser"
  usedBy: string[];   // ["src/tools/sync.ts", "src/tools/orphans.ts"]
  importType: 'direct' | 'indirect';
}

export class InterfaceGraph {
  /**
   * Build interface-level usage graph
   */
  static buildInterfaceGraph(
    codeReferences: Map<string, CodeReference>
  ): Map<string, InterfaceUsage> {
    const graph = new Map<string, InterfaceUsage>();

    for (const [file] of codeReferences) {
      const imports = this.extractImports(file);

      for (const imp of imports) {
        // Track which specific exports are imported
        // e.g., import { ParserFactory } from './ParserFactory'
        for (const name of imp.names) {
          const key = `${imp.source}::${name}`;
          if (!graph.has(key)) {
            graph.set(key, {
              interface: key,
              usedBy: [],
              importType: 'direct',
            });
          }
          graph.get(key)!.usedBy.push(file);
        }
      }
    }

    return graph;
  }

  /**
   * Check if an interface is used
   */
  static isInterfaceUsed(
    file: string,
    interfaceName: string,
    graph: Map<string, InterfaceUsage>
  ): boolean {
    const key = `${file}::${interfaceName}`;
    const usage = graph.get(key);
    return usage ? usage.usedBy.length > 0 : false;
  }
}
```

### Phase 3: Interface-Level 검증

#### 3.1 Orphan 검증 강화

```typescript
// src/tools/spec-orphans.ts (ENHANCED)

export interface InterfaceOrphan {
  file: string;
  interfaceName: string;
  interfaceType: 'class' | 'interface' | 'type' | 'function' | 'const';
  reason: 'not_documented' | 'not_used' | 'not_public';
  methods?: string[];  // class인 경우 사용되지 않는 메서드
}

export async function validateInterfaceOrphans(
  options: ValidationOptions = {}
): Promise<InterfaceOrphanResult> {
  const projectPath = options.projectPath || process.cwd();

  // 1. Extract entry point modules
  const entryPoints = extractEntryPoints(projectPath);

  // 2. Extract public interfaces from entry points
  const publicInterfaces = new Map<string, TopLevelExport[]>();
  for (const ep of entryPoints) {
    const interfaces = ExportAnalyzer.extractPublicInterfaces(ep);
    publicInterfaces.set(ep, interfaces);
  }

  // 3. Build interface-level usage graph
  const usageGraph = InterfaceGraph.buildInterfaceGraph(codeReferences);

  // 4. Check each interface
  const orphans: InterfaceOrphan[] = [];

  for (const [file, interfaces] of publicInterfaces) {
    for (const iface of interfaces) {
      const isDocumented = checkInterfaceDocumented(file, iface.name, docs);
      const isUsed = InterfaceGraph.isInterfaceUsed(file, iface.name, usageGraph);

      if (!isDocumented) {
        orphans.push({
          file,
          interfaceName: iface.name,
          interfaceType: iface.type,
          reason: 'not_documented',
        });
      } else if (!isUsed && !isEntryPoint(file, iface.name)) {
        // Entry point는 사용되지 않아도 OK (외부 사용자용)
        orphans.push({
          file,
          interfaceName: iface.name,
          interfaceType: iface.type,
          reason: 'not_used',
        });
      }

      // Class인 경우 메서드별 검증
      if (iface.type === 'class' && iface.methods) {
        const unusedMethods = checkUnusedMethods(
          file,
          iface.name,
          iface.methods,
          usageGraph
        );
        if (unusedMethods.length > 0) {
          orphans.push({
            file,
            interfaceName: iface.name,
            interfaceType: 'class',
            reason: 'not_used',
            methods: unusedMethods,
          });
        }
      }
    }
  }

  return {
    success: orphans.length === 0,
    totalInterfaces: countTotalInterfaces(publicInterfaces),
    documentedInterfaces: countDocumented(publicInterfaces, docs),
    orphans,
  };
}
```

#### 3.2 문서 검증

```typescript
// src/tools/validate-interface-docs.ts (NEW)

export function checkInterfaceDocumented(
  file: string,
  interfaceName: string,
  docs: Map<string, DocumentInfo>
): boolean {
  for (const [docPath, docInfo] of docs) {
    // Check if public_interfaces mentions this interface
    if (docInfo.publicInterfaces) {
      const found = docInfo.publicInterfaces.find(
        (pi) => pi.file === file && pi.name === interfaceName
      );
      if (found) return true;
    }

    // Fallback: Check if file is in code_references
    if (docInfo.codeReferences.includes(file)) {
      // Assume all exports from documented files are documented
      // (backward compatibility)
      return true;
    }
  }

  return false;
}
```

### Phase 4: 진입점 모듈 자동 감지

#### 4.1 Entry Point Detection

```typescript
// src/tools/entry-point-detector.ts (NEW)

export interface EntryPointModule {
  file: string;
  type: 'cli' | 'api' | 'library';
  publicInterfaces: string[];
  reason: string;  // Why this is considered an entry point
}

export class EntryPointDetector {
  /**
   * Detect entry point modules
   */
  static detect(projectPath: string): EntryPointModule[] {
    const entryPoints: EntryPointModule[] = [];

    // 1. CLI entry points
    const cliFiles = ['src/cli.ts', 'src/index.ts'];
    for (const file of cliFiles) {
      if (fileExists(join(projectPath, file))) {
        entryPoints.push({
          file,
          type: 'cli',
          publicInterfaces: this.extractExports(file),
          reason: 'CLI entry point',
        });
      }
    }

    // 2. Package.json exports
    const pkgPath = join(projectPath, 'package.json');
    if (fileExists(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      // Check "main", "exports", "types"
      if (pkg.main) {
        const mainFile = pkg.main.replace(/^\.\//, '');
        entryPoints.push({
          file: mainFile,
          type: 'library',
          publicInterfaces: this.extractExports(mainFile),
          reason: 'package.json main field',
        });
      }
    }

    // 3. Explicitly marked in docs
    const docs = parseDocuments(projectPath);
    for (const doc of docs) {
      if (doc.entryPoint && doc.entryPointType === 'module') {
        entryPoints.push({
          file: doc.entryPoint,
          type: 'api',
          publicInterfaces: this.extractExports(doc.entryPoint),
          reason: 'Marked in documentation',
        });
      }
    }

    // 4. Frequently imported modules (heuristic)
    const importGraph = buildImportGraph(projectPath);
    const importCounts = this.countImports(importGraph);

    for (const [file, count] of importCounts) {
      if (count >= 3) {  // Imported by 3+ different files
        entryPoints.push({
          file,
          type: 'library',
          publicInterfaces: this.extractExports(file),
          reason: `Imported by ${count} files`,
        });
      }
    }

    return this.deduplicate(entryPoints);
  }

  private static extractExports(file: string): string[] {
    const parser = ParserFactory.getParser(file);
    if (!parser) return [];

    const content = readFileSync(file, 'utf-8');
    const { exports } = parser.parse(content, file);
    return exports.map(e => e.name);
  }

  private static countImports(
    graph: Map<string, Set<string>>
  ): Map<string, number> {
    const counts = new Map<string, number>();

    for (const imports of graph.values()) {
      for (const imported of imports) {
        counts.set(imported, (counts.get(imported) || 0) + 1);
      }
    }

    return counts;
  }

  private static deduplicate(
    entryPoints: EntryPointModule[]
  ): EntryPointModule[] {
    const seen = new Map<string, EntryPointModule>();

    for (const ep of entryPoints) {
      if (!seen.has(ep.file)) {
        seen.set(ep.file, ep);
      } else {
        // Merge reasons
        const existing = seen.get(ep.file)!;
        existing.reason += `, ${ep.reason}`;
      }
    }

    return Array.from(seen.values());
  }
}
```

## 마이그레이션 계획

### Step 1: 기존 시스템 유지 (Backward Compatible)

```typescript
// config.ts
export interface ValidationConfig {
  mode: 'file' | 'interface';  // Default: 'file'
  entryPointDetection: 'auto' | 'manual';  // Default: 'manual'
}
```

### Step 2: 점진적 전환

1. **Phase 1**: `public_interfaces` 필드 추가 (선택사항)
2. **Phase 2**: Entry point 자동 감지 도구 제공
3. **Phase 3**: Interface-level 검증 활성화 (opt-in)
4. **Phase 4**: 기본값을 interface-level로 변경

### Step 3: 문서 업데이트

```bash
# 1. Entry point 자동 감지
edgedoc detect-entry-points

# 출력:
# 📍 Detected Entry Points:
#   1. src/cli.ts (CLI entry point)
#   2. src/parsers/ParserFactory.ts (Imported by 5 files)
#   3. src/shared/i18n.ts (Imported by 8 files)

# 2. Public interfaces 추출
edgedoc extract-interfaces --entry-point src/parsers/ParserFactory.ts

# 출력:
# 🎯 Public Interfaces in src/parsers/ParserFactory.ts:
#   - class ParserFactory
#     - getParser(filePath: string)
#     - getSupportedExtensions()
#     - register(parser: ILanguageParser)

# 3. Interface-level validation
edgedoc validate spec-orphans --mode interface

# 출력:
# ❌ Orphan Interfaces:
#   src/parsers/TypeScriptParser.ts::extractStringValue
#     Reason: not_used (private method, never called)
```

## 예상 효과

### Before (File-Level)
```
✅ 23 files documented
✅ 0 orphan files
✅ 48 exports (all considered documented)
```

### After (Interface-Level)
```
✅ 23 files documented
✅ 5 entry point modules
✅ 12 public interfaces
⚠️  3 unused interfaces:
   - TypeScriptParser::extractStringValue (private utility)
   - PythonParser::extractClassName (internal helper)
   - i18n::KO_MESSAGES (internal constant)
✅ 45 exports documented or used
```

## 구현 순서

1. ✅ **Phase 1**: 현재 시스템 분석 (완료)
2. 🔄 **Phase 2**: Entry Point Detector 구현
3. 🔄 **Phase 3**: ExportAnalyzer 구현 (public interface 추출)
4. 🔄 **Phase 4**: InterfaceGraph 구현 (사용 여부 추적)
5. 🔄 **Phase 5**: Interface-level validation 구현
6. 🔄 **Phase 6**: CLI 명령어 추가
7. 🔄 **Phase 7**: 문서 업데이트 및 마이그레이션

## 참고 자료

### 현재 코드베이스
- `src/tools/spec-orphans.ts` - 파일 단위 검증 (개선 대상)
- `src/parsers/ILanguageParser.ts` - Export 추출 인터페이스
- `src/parsers/ParserFactory.ts` - Entry point 예시

### 관련 문서
- `docs/VALIDATION.md` - 현재 검증 시스템
- `tasks/features/09_MultiLanguageParser.md` - Entry point 사용 예시

## Q&A

**Q: 모든 export를 문서화해야 하나요?**
A: Entry point module의 public interface만 문서화하면 됩니다. 내부 구현은 자동으로 추적됩니다.

**Q: Private method도 검증하나요?**
A: 기본적으로 public export만 검증합니다. Config로 private method 검증도 활성화 가능합니다.

**Q: 기존 문서는 어떻게 되나요?**
A: 기존 `code_references`는 그대로 동작합니다. `public_interfaces`는 선택사항입니다.

**Q: Entry point는 어떻게 결정하나요?**
A: CLI 진입점, package.json, 문서의 entry_point 필드, 그리고 3개 이상의 파일에서 import되는 모듈이 자동으로 entry point로 간주됩니다.
