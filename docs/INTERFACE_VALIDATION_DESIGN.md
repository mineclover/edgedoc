# Interface-Level Validation: Detailed Design Document

## 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [데이터 구조](#데이터-구조)
4. [핵심 컴포넌트](#핵심-컴포넌트)
5. [알고리즘](#알고리즘)
6. [Frontmatter 스키마](#frontmatter-스키마)
7. [검증 규칙](#검증-규칙)
8. [에러 메시지](#에러-메시지)
9. [성능 고려사항](#성능-고려사항)
10. [테스트 전략](#테스트-전략)

---

## 개요

### 목표

**파일 단위 검증을 인터페이스 단위로 고도화하여 공개 API의 정확한 문서화와 사용 추적**

### 범위

- Entry Point Module 자동 탐지
- Public Interface 추출 및 추적
- Interface-level 사용 그래프 구축
- 미사용 interface/method 탐지
- Frontmatter 확장 및 자동 생성

### 비범위

- Private method 의무 문서화 (선택사항)
- 타입 시스템 검증 (TypeScript compiler 담당)
- 런타임 사용 분석 (정적 분석만)

---

## 아키텍처

### 계층 구조

```
┌─────────────────────────────────────────────────────────┐
│                     CLI Layer                           │
│  - analyze entry-points                                 │
│  - analyze interfaces                                   │
│  - validate spec-orphans --mode interface               │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                  Validation Layer                       │
│  - InterfaceOrphanValidator                            │
│  - EntryPointValidator                                  │
│  - UsageValidator                                       │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                   Analysis Layer                        │
│  - EntryPointDetector      [✅ Implemented]            │
│  - ExportAnalyzer          [🔄 Phase 2]                │
│  - InterfaceGraph          [🔄 Phase 3]                │
│  - MethodTracker           [🔄 Phase 3]                │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                    Parser Layer                         │
│  - ParserFactory           [✅ Implemented]            │
│  - TypeScriptParser        [✅ Implemented]            │
│  - PythonParser            [✅ Implemented]            │
└─────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
1. Entry Point Detection
   └─> [Source Files] → EntryPointDetector → [EntryPointModule[]]

2. Interface Extraction
   └─> [EntryPointModule[]] → ExportAnalyzer → [InterfaceDefinition[]]

3. Usage Graph Construction
   └─> [Source Files] → InterfaceGraph → [UsageMap]

4. Documentation Parsing
   └─> [Markdown Files] → DocumentParser → [DocumentInfo[]]

5. Validation
   └─> [InterfaceDefinition[], UsageMap, DocumentInfo[]]
       → Validator
       → [ValidationResult]
```

---

## 데이터 구조

### 1. InterfaceDefinition

```typescript
/**
 * Represents a top-level public interface
 */
interface InterfaceDefinition {
  /** Interface name */
  name: string;

  /** Interface type */
  type: 'class' | 'interface' | 'type' | 'function' | 'const';

  /** Source file path (relative to project root) */
  file: string;

  /** Whether it's exported */
  isExported: boolean;

  /** Whether it's a default export */
  isDefault: boolean;

  /** Location in source file */
  location: SourceLocation;

  /** For classes: public methods */
  methods?: MethodDefinition[];

  /** For classes: public properties */
  properties?: PropertyDefinition[];

  /** For types/interfaces: member signatures */
  members?: MemberDefinition[];

  /** JSDoc comment (if exists) */
  documentation?: string;

  /** Whether this is marked as @internal */
  isInternal?: boolean;

  /** Whether this is marked as @deprecated */
  isDeprecated?: boolean;
}

interface SourceLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

interface MethodDefinition {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isAsync: boolean;
  parameters: ParameterDefinition[];
  returnType?: string;
  location: SourceLocation;
  documentation?: string;
}

interface PropertyDefinition {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  type?: string;
  location: SourceLocation;
}

interface MemberDefinition {
  name: string;
  type: 'property' | 'method';
  isOptional: boolean;
  signature: string;
}

interface ParameterDefinition {
  name: string;
  type?: string;
  isOptional: boolean;
  hasDefault: boolean;
}
```

### 2. InterfaceUsage

```typescript
/**
 * Tracks where and how an interface is used
 */
interface InterfaceUsage {
  /** Fully qualified name: "file::InterfaceName" */
  interfaceId: string;

  /** Interface definition */
  definition: InterfaceDefinition;

  /** Files that import this interface */
  importedBy: ImportInfo[];

  /** For classes: method-level usage */
  methodUsage?: Map<string, MethodUsageInfo>;

  /** Usage type */
  usageType: 'direct' | 'indirect' | 'type-only' | 'unused';

  /** Is this an entry point (externally exposed)? */
  isEntryPoint: boolean;
}

interface ImportInfo {
  /** File that imports this interface */
  importerFile: string;

  /** Import statement type */
  importType: 'named' | 'default' | 'namespace' | 'dynamic';

  /** Imported name (may differ from export name) */
  importedAs?: string;

  /** Is this a type-only import? */
  isTypeOnly: boolean;

  /** Location of import statement */
  location: SourceLocation;
}

interface MethodUsageInfo {
  /** Method name */
  methodName: string;

  /** Files where this method is called */
  calledIn: string[];

  /** Number of call sites */
  callCount: number;

  /** Is this method overridden in subclasses? */
  isOverridden: boolean;
}
```

### 3. EntryPointModule

```typescript
/**
 * Entry point module information (already implemented)
 */
interface EntryPointModule {
  file: string;
  type: 'cli' | 'api' | 'library';
  publicInterfaces: string[];
  reason: string;
  importCount?: number;
}
```

### 4. DocumentInterfaceInfo

```typescript
/**
 * Interface documentation from markdown frontmatter
 */
interface DocumentInterfaceInfo {
  /** Document file path */
  documentPath: string;

  /** Entry point file */
  entryPoint?: string;

  /** Entry point type */
  entryPointType?: 'module' | 'class' | 'function';

  /** Documented public interfaces */
  publicInterfaces?: PublicInterfaceDoc[];

  /** Code references (backward compatible) */
  codeReferences: string[];
}

interface PublicInterfaceDoc {
  /** Interface name */
  name: string;

  /** Interface type */
  type: 'class' | 'interface' | 'type' | 'function' | 'const';

  /** Source file (if different from entry_point) */
  file?: string;

  /** For classes: documented methods */
  methods?: string[];

  /** Description (optional) */
  description?: string;

  /** Is this the primary interface? */
  isPrimary?: boolean;
}
```

### 5. ValidationResult

```typescript
/**
 * Interface-level validation result
 */
interface InterfaceValidationResult {
  success: boolean;

  /** Total entry points found */
  totalEntryPoints: number;

  /** Total public interfaces */
  totalInterfaces: number;

  /** Documented interfaces */
  documentedInterfaces: number;

  /** Used interfaces */
  usedInterfaces: number;

  /** Orphan interfaces */
  orphans: InterfaceOrphan[];

  /** Unused methods (in documented classes) */
  unusedMethods: UnusedMethod[];

  /** Missing documentation */
  missingDocs: MissingDocumentation[];

  /** Statistics */
  statistics: ValidationStatistics;
}

interface InterfaceOrphan {
  file: string;
  interfaceName: string;
  interfaceType: string;
  reason: 'not_documented' | 'not_used' | 'not_exported';
  suggestion?: string;
}

interface UnusedMethod {
  file: string;
  className: string;
  methodName: string;
  visibility: string;
  isEntryPoint: boolean;
  callCount: number;
}

interface MissingDocumentation {
  file: string;
  interfaceName: string;
  reason: 'no_jsdoc' | 'incomplete_frontmatter' | 'missing_public_interfaces';
  severity: 'error' | 'warning' | 'info';
}

interface ValidationStatistics {
  entryPointsByType: Record<string, number>;
  interfacesByType: Record<string, number>;
  averageMethodsPerClass: number;
  documentationCoverage: number; // percentage
  usageRate: number; // percentage
}
```

---

## 핵심 컴포넌트

### Phase 2: ExportAnalyzer

```typescript
/**
 * Analyzes source files to extract interface definitions
 */
export class ExportAnalyzer {
  /**
   * Extract all public interfaces from an entry point
   */
  static extractInterfaces(
    entryPoint: EntryPointModule,
    projectPath: string
  ): InterfaceDefinition[] {
    const filePath = join(projectPath, entryPoint.file);
    const parser = ParserFactory.getParser(filePath);

    if (!parser) return [];

    const content = readFileSync(filePath, 'utf-8');
    const { exports } = parser.parse(content, filePath);

    return exports.map(exp => this.buildInterfaceDefinition(exp, filePath, content));
  }

  /**
   * Extract public methods from a class
   */
  static extractClassMethods(
    filePath: string,
    className: string
  ): MethodDefinition[] {
    // Use tree-sitter to find class definition
    // Parse method declarations
    // Filter by visibility (public only by default)
    // Extract parameters, return types, JSDoc
    return [];
  }

  /**
   * Build complete interface definition
   */
  private static buildInterfaceDefinition(
    exportInfo: ExportInfo,
    filePath: string,
    content: string
  ): InterfaceDefinition {
    const def: InterfaceDefinition = {
      name: exportInfo.name,
      type: exportInfo.type,
      file: filePath,
      isExported: true,
      isDefault: exportInfo.isDefault,
      location: exportInfo.location,
    };

    // Extract JSDoc
    def.documentation = this.extractJSDoc(content, exportInfo.location);

    // Check for @internal tag
    def.isInternal = def.documentation?.includes('@internal') || false;
    def.isDeprecated = def.documentation?.includes('@deprecated') || false;

    // For classes: extract methods and properties
    if (exportInfo.type === 'class') {
      def.methods = this.extractClassMethods(filePath, exportInfo.name);
      def.properties = this.extractClassProperties(filePath, exportInfo.name);
    }

    // For interfaces/types: extract members
    if (exportInfo.type === 'interface' || exportInfo.type === 'type') {
      def.members = this.extractTypeMembers(filePath, exportInfo.name);
    }

    return def;
  }

  /**
   * Extract JSDoc comment above a definition
   */
  private static extractJSDoc(
    content: string,
    location: SourceLocation
  ): string | undefined {
    const lines = content.split('\n');
    const targetLine = location.line - 1;

    // Look backwards for JSDoc comment
    let jsDoc = '';
    let inComment = false;

    for (let i = targetLine - 1; i >= 0; i--) {
      const line = lines[i].trim();

      if (line === '*/') {
        inComment = true;
        continue;
      }

      if (line.startsWith('/**')) {
        jsDoc = line + '\n' + jsDoc;
        break;
      }

      if (inComment) {
        jsDoc = line + '\n' + jsDoc;
      } else if (line !== '') {
        // Non-empty, non-comment line - stop
        break;
      }
    }

    return jsDoc || undefined;
  }
}
```

### Phase 3: InterfaceGraph

```typescript
/**
 * Builds and maintains interface-level usage graph
 */
export class InterfaceGraph {
  private usageMap: Map<string, InterfaceUsage> = new Map();
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Build complete interface usage graph
   */
  async build(
    entryPoints: EntryPointModule[],
    interfaces: InterfaceDefinition[]
  ): Promise<void> {
    // 1. Initialize usage map
    for (const iface of interfaces) {
      const id = this.getInterfaceId(iface);
      this.usageMap.set(id, {
        interfaceId: id,
        definition: iface,
        importedBy: [],
        usageType: 'unused',
        isEntryPoint: this.isEntryPoint(iface, entryPoints),
      });
    }

    // 2. Scan all source files for imports
    const sourceFiles = this.collectSourceFiles();

    for (const file of sourceFiles) {
      await this.analyzeImports(file);
    }

    // 3. Classify usage types
    this.classifyUsageTypes();

    // 4. For classes: analyze method usage
    await this.analyzeMethodUsage();
  }

  /**
   * Analyze imports in a file
   */
  private async analyzeImports(filePath: string): Promise<void> {
    const parser = ParserFactory.getParser(filePath);
    if (!parser) return;

    const content = readFileSync(filePath, 'utf-8');
    const { imports } = parser.parse(content, filePath);

    for (const imp of imports) {
      // Resolve import path to actual file
      const resolvedFile = this.resolveImportPath(imp.source, filePath);
      if (!resolvedFile) continue;

      // Find which interfaces are imported
      for (const name of imp.names) {
        const id = `${resolvedFile}::${name}`;
        const usage = this.usageMap.get(id);

        if (usage) {
          usage.importedBy.push({
            importerFile: filePath,
            importType: this.detectImportType(imp),
            importedAs: name,
            isTypeOnly: imp.isTypeOnly || false,
            location: imp.location,
          });
        }
      }
    }
  }

  /**
   * Classify usage types based on import patterns
   */
  private classifyUsageTypes(): void {
    for (const [id, usage] of this.usageMap) {
      if (usage.isEntryPoint) {
        usage.usageType = 'direct';
      } else if (usage.importedBy.length === 0) {
        usage.usageType = 'unused';
      } else if (usage.importedBy.every(imp => imp.isTypeOnly)) {
        usage.usageType = 'type-only';
      } else if (usage.importedBy.some(imp => !imp.isTypeOnly)) {
        usage.usageType = 'direct';
      } else {
        usage.usageType = 'indirect';
      }
    }
  }

  /**
   * Analyze method-level usage for classes
   */
  private async analyzeMethodUsage(): Promise<void> {
    for (const [id, usage] of this.usageMap) {
      if (usage.definition.type !== 'class') continue;
      if (!usage.definition.methods) continue;

      usage.methodUsage = new Map();

      for (const method of usage.definition.methods) {
        const methodUsage = await this.trackMethodCalls(
          usage.definition.file,
          usage.definition.name,
          method.name
        );

        usage.methodUsage.set(method.name, methodUsage);
      }
    }
  }

  /**
   * Track method calls across the codebase
   */
  private async trackMethodCalls(
    classFile: string,
    className: string,
    methodName: string
  ): Promise<MethodUsageInfo> {
    const calledIn: string[] = [];
    let callCount = 0;

    // Scan all files that import this class
    const usage = this.usageMap.get(`${classFile}::${className}`);
    if (!usage) {
      return { methodName, calledIn, callCount, isOverridden: false };
    }

    for (const importer of usage.importedBy) {
      const calls = await this.findMethodCalls(
        importer.importerFile,
        importer.importedAs || className,
        methodName
      );

      if (calls > 0) {
        calledIn.push(importer.importerFile);
        callCount += calls;
      }
    }

    return {
      methodName,
      calledIn,
      callCount,
      isOverridden: false, // TODO: detect subclass overrides
    };
  }

  /**
   * Find method calls in a file using regex (simple approach)
   */
  private async findMethodCalls(
    filePath: string,
    className: string,
    methodName: string
  ): Promise<number> {
    const content = readFileSync(filePath, 'utf-8');

    // Patterns: className.methodName(...) or obj.methodName(...)
    const patterns = [
      new RegExp(`${className}\\.${methodName}\\s*\\(`, 'g'),
      new RegExp(`\\.${methodName}\\s*\\(`, 'g'), // instance calls
    ];

    let count = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    }

    return count;
  }

  /**
   * Get interface usage information
   */
  getUsage(file: string, interfaceName: string): InterfaceUsage | undefined {
    const id = `${file}::${interfaceName}`;
    return this.usageMap.get(id);
  }

  /**
   * Get all unused interfaces
   */
  getUnusedInterfaces(): InterfaceUsage[] {
    return Array.from(this.usageMap.values())
      .filter(u => u.usageType === 'unused' && !u.isEntryPoint);
  }

  /**
   * Get unused methods in a class
   */
  getUnusedMethods(file: string, className: string): MethodDefinition[] {
    const usage = this.getUsage(file, className);
    if (!usage || !usage.methodUsage) return [];

    const unusedMethods: MethodDefinition[] = [];

    for (const [methodName, methodUsage] of usage.methodUsage) {
      if (methodUsage.callCount === 0) {
        const methodDef = usage.definition.methods?.find(m => m.name === methodName);
        if (methodDef && methodDef.visibility === 'public') {
          unusedMethods.push(methodDef);
        }
      }
    }

    return unusedMethods;
  }

  // Helper methods

  private getInterfaceId(iface: InterfaceDefinition): string {
    return `${iface.file}::${iface.name}`;
  }

  private isEntryPoint(
    iface: InterfaceDefinition,
    entryPoints: EntryPointModule[]
  ): boolean {
    return entryPoints.some(ep =>
      ep.file === iface.file && ep.publicInterfaces.includes(iface.name)
    );
  }

  private collectSourceFiles(): string[] {
    // Similar to existing collectSourceFiles in sync.ts
    return [];
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Similar to existing resolveImportPath
    return null;
  }

  private detectImportType(imp: any): 'named' | 'default' | 'namespace' | 'dynamic' {
    // Detect based on import pattern
    return 'named';
  }
}
```

### Phase 4: InterfaceOrphanValidator

```typescript
/**
 * Validates interface-level orphans
 */
export class InterfaceOrphanValidator {
  private projectPath: string;
  private graph: InterfaceGraph;
  private docs: DocumentInterfaceInfo[];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.graph = new InterfaceGraph(projectPath);
    this.docs = [];
  }

  /**
   * Run complete validation
   */
  async validate(): Promise<InterfaceValidationResult> {
    // 1. Detect entry points
    const entryPoints = EntryPointDetector.detect(this.projectPath);

    // 2. Extract interfaces
    const interfaces: InterfaceDefinition[] = [];
    for (const ep of entryPoints) {
      const ifaces = ExportAnalyzer.extractInterfaces(ep, this.projectPath);
      interfaces.push(...ifaces);
    }

    // 3. Build usage graph
    await this.graph.build(entryPoints, interfaces);

    // 4. Parse documentation
    this.docs = this.parseDocumentation();

    // 5. Find orphans
    const orphans = this.findOrphans(interfaces);

    // 6. Find unused methods
    const unusedMethods = this.findUnusedMethods(interfaces);

    // 7. Find missing documentation
    const missingDocs = this.findMissingDocumentation(interfaces);

    // 8. Calculate statistics
    const statistics = this.calculateStatistics(
      entryPoints,
      interfaces,
      orphans,
      unusedMethods
    );

    return {
      success: orphans.length === 0 && unusedMethods.length === 0,
      totalEntryPoints: entryPoints.length,
      totalInterfaces: interfaces.length,
      documentedInterfaces: interfaces.length - orphans.length,
      usedInterfaces: interfaces.filter(i =>
        this.graph.getUsage(i.file, i.name)?.usageType !== 'unused'
      ).length,
      orphans,
      unusedMethods,
      missingDocs,
      statistics,
    };
  }

  /**
   * Find interface orphans
   */
  private findOrphans(interfaces: InterfaceDefinition[]): InterfaceOrphan[] {
    const orphans: InterfaceOrphan[] = [];

    for (const iface of interfaces) {
      const usage = this.graph.getUsage(iface.file, iface.name);
      if (!usage) continue;

      // Skip @internal interfaces
      if (iface.isInternal) continue;

      // Check if documented
      const isDocumented = this.isInterfaceDocumented(iface);

      // Check if used
      const isUsed = usage.usageType !== 'unused' || usage.isEntryPoint;

      if (!isDocumented && !usage.isEntryPoint) {
        orphans.push({
          file: iface.file,
          interfaceName: iface.name,
          interfaceType: iface.type,
          reason: 'not_documented',
          suggestion: usage.isEntryPoint
            ? 'Add to public_interfaces in documentation'
            : 'This interface is not exposed as entry point',
        });
      }

      if (!isUsed && !iface.isDeprecated) {
        orphans.push({
          file: iface.file,
          interfaceName: iface.name,
          interfaceType: iface.type,
          reason: 'not_used',
          suggestion: 'Consider removing or marking as @deprecated',
        });
      }

      if (!iface.isExported) {
        orphans.push({
          file: iface.file,
          interfaceName: iface.name,
          interfaceType: iface.type,
          reason: 'not_exported',
          suggestion: 'Add export keyword or remove from entry point',
        });
      }
    }

    return orphans;
  }

  /**
   * Find unused methods in documented classes
   */
  private findUnusedMethods(interfaces: InterfaceDefinition[]): UnusedMethod[] {
    const unusedMethods: UnusedMethod[] = [];

    for (const iface of interfaces) {
      if (iface.type !== 'class') continue;

      const usage = this.graph.getUsage(iface.file, iface.name);
      if (!usage || !usage.methodUsage) continue;

      for (const [methodName, methodUsage] of usage.methodUsage) {
        if (methodUsage.callCount === 0) {
          const methodDef = iface.methods?.find(m => m.name === methodName);
          if (methodDef && methodDef.visibility === 'public') {
            unusedMethods.push({
              file: iface.file,
              className: iface.name,
              methodName,
              visibility: methodDef.visibility,
              isEntryPoint: usage.isEntryPoint,
              callCount: 0,
            });
          }
        }
      }
    }

    return unusedMethods;
  }

  /**
   * Check if interface is documented
   */
  private isInterfaceDocumented(iface: InterfaceDefinition): boolean {
    for (const doc of this.docs) {
      // Check public_interfaces field
      if (doc.publicInterfaces) {
        const found = doc.publicInterfaces.find(pi =>
          (pi.file === iface.file || doc.entryPoint === iface.file) &&
          pi.name === iface.name
        );
        if (found) return true;
      }

      // Backward compatibility: check code_references
      if (doc.codeReferences.includes(iface.file)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find missing documentation
   */
  private findMissingDocumentation(
    interfaces: InterfaceDefinition[]
  ): MissingDocumentation[] {
    const missing: MissingDocumentation[] = [];

    for (const iface of interfaces) {
      const usage = this.graph.getUsage(iface.file, iface.name);
      if (!usage || !usage.isEntryPoint) continue;

      // Check JSDoc
      if (!iface.documentation) {
        missing.push({
          file: iface.file,
          interfaceName: iface.name,
          reason: 'no_jsdoc',
          severity: 'warning',
        });
      }

      // Check frontmatter
      const isInFrontmatter = this.docs.some(doc =>
        doc.publicInterfaces?.some(pi => pi.name === iface.name)
      );

      if (!isInFrontmatter) {
        missing.push({
          file: iface.file,
          interfaceName: iface.name,
          reason: 'missing_public_interfaces',
          severity: 'error',
        });
      }
    }

    return missing;
  }

  /**
   * Parse documentation from markdown files
   */
  private parseDocumentation(): DocumentInterfaceInfo[] {
    const docs: DocumentInterfaceInfo[] = [];
    const tasksPath = join(this.projectPath, 'tasks', 'features');

    if (!existsSync(tasksPath)) return docs;

    const files = readdirSync(tasksPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const content = readFileSync(join(tasksPath, file), 'utf-8');
      const doc = this.parseFrontmatter(content, file);
      if (doc) docs.push(doc);
    }

    return docs;
  }

  /**
   * Parse frontmatter from markdown
   */
  private parseFrontmatter(
    content: string,
    filename: string
  ): DocumentInterfaceInfo | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    // Parse YAML-like frontmatter
    // This is simplified - real implementation should use proper YAML parser
    const frontmatter = match[1];

    return {
      documentPath: filename,
      entryPoint: this.extractField(frontmatter, 'entry_point'),
      entryPointType: this.extractField(frontmatter, 'entry_point_type') as any,
      publicInterfaces: this.extractPublicInterfaces(frontmatter),
      codeReferences: this.extractArray(frontmatter, 'code_references'),
    };
  }

  // Helper parsing methods
  private extractField(frontmatter: string, field: string): string | undefined {
    const match = frontmatter.match(new RegExp(`${field}:\\s*"([^"]+)"`));
    return match ? match[1] : undefined;
  }

  private extractArray(frontmatter: string, field: string): string[] {
    const match = frontmatter.match(new RegExp(`${field}:\\s*\\n((?:  - .+\\n?)*)`));
    if (!match) return [];

    return match[1]
      .split('\n')
      .map(line => line.trim().replace(/^- "?(.+?)"?$/, '$1'))
      .filter(line => line.length > 0);
  }

  private extractPublicInterfaces(frontmatter: string): PublicInterfaceDoc[] | undefined {
    // TODO: Parse public_interfaces YAML structure
    return undefined;
  }

  private calculateStatistics(
    entryPoints: EntryPointModule[],
    interfaces: InterfaceDefinition[],
    orphans: InterfaceOrphan[],
    unusedMethods: UnusedMethod[]
  ): ValidationStatistics {
    const entryPointsByType: Record<string, number> = {};
    for (const ep of entryPoints) {
      entryPointsByType[ep.type] = (entryPointsByType[ep.type] || 0) + 1;
    }

    const interfacesByType: Record<string, number> = {};
    for (const iface of interfaces) {
      interfacesByType[iface.type] = (interfacesByType[iface.type] || 0) + 1;
    }

    const totalMethods = interfaces
      .filter(i => i.type === 'class')
      .reduce((sum, i) => sum + (i.methods?.length || 0), 0);
    const classCount = interfaces.filter(i => i.type === 'class').length;

    return {
      entryPointsByType,
      interfacesByType,
      averageMethodsPerClass: classCount > 0 ? totalMethods / classCount : 0,
      documentationCoverage: ((interfaces.length - orphans.length) / interfaces.length) * 100,
      usageRate: ((interfaces.length - orphans.filter(o => o.reason === 'not_used').length) / interfaces.length) * 100,
    };
  }
}
```

---

## Frontmatter 스키마

### 확장된 Frontmatter (v2)

```yaml
---
type: feature
status: active
feature: multi-language-parser
priority: high

# Entry point definition
entry_point: "src/parsers/ParserFactory.ts"
entry_point_type: "module"  # module | class | function

# Public interfaces (NEW)
public_interfaces:
  - name: "ParserFactory"
    type: "class"
    description: "Factory for managing language parsers"
    methods:
      - getParser
      - register
      - getSupportedExtensions
    isPrimary: true

  - name: "ILanguageParser"
    file: "src/parsers/ILanguageParser.ts"
    type: "interface"
    description: "Common interface for all parsers"
    isPrimary: false

# Related features
related_interfaces:
  - 00--07

related_features:
  - 03_ValidateOrphans
  - 05_ValidateSpecOrphans
  - 07_Sync

# Code references (backward compatible)
code_references:
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/ILanguageParser.ts"
  - "src/parsers/TypeScriptParser.ts"
  - "src/parsers/PythonParser.ts"
---
```

### Frontmatter 생성 도구

```typescript
/**
 * Generate public_interfaces from source code
 */
export async function generatePublicInterfaces(
  entryPoint: string,
  projectPath: string
): Promise<PublicInterfaceDoc[]> {
  const interfaces = ExportAnalyzer.extractInterfaces(
    { file: entryPoint, type: 'api', publicInterfaces: [], reason: '' },
    projectPath
  );

  return interfaces.map(iface => ({
    name: iface.name,
    type: iface.type,
    description: iface.documentation?.split('\n')[0] || '',
    methods: iface.methods?.filter(m => m.visibility === 'public').map(m => m.name),
    isPrimary: iface.name === basename(entryPoint, extname(entryPoint)),
  }));
}

// CLI usage:
// $ edgedoc generate-interfaces --entry-point src/parsers/ParserFactory.ts
```

---

## 검증 규칙

### Rule 1: Entry Point 문서화

**규칙**: 모든 entry point module은 문서화되어야 함

**검증**:
```typescript
for (const ep of entryPoints) {
  const isDocumented = docs.some(d => d.entryPoint === ep.file);
  if (!isDocumented) {
    errors.push(`Entry point ${ep.file} is not documented`);
  }
}
```

**예외**: Test files (optional)

### Rule 2: Public Interface 명시

**규칙**: Entry point의 public interface는 `public_interfaces`에 명시

**검증**:
```typescript
for (const iface of publicInterfaces) {
  const usage = graph.getUsage(iface.file, iface.name);
  if (usage.isEntryPoint) {
    const isDocumented = docs.some(d =>
      d.publicInterfaces?.some(pi => pi.name === iface.name)
    );
    if (!isDocumented) {
      warnings.push(`Public interface ${iface.name} not in frontmatter`);
    }
  }
}
```

**예외**: Backward compatibility (code_references 사용 가능)

### Rule 3: 사용되지 않는 Public Interface

**규칙**: Public interface는 사용되어야 함 (또는 @deprecated)

**검증**:
```typescript
for (const iface of publicInterfaces) {
  const usage = graph.getUsage(iface.file, iface.name);
  if (usage.usageType === 'unused' && !iface.isDeprecated) {
    warnings.push(`Interface ${iface.name} is not used`);
  }
}
```

**예외**: Entry point interfaces (외부 사용자용)

### Rule 4: 사용되지 않는 Public Method

**규칙**: Public method는 호출되어야 함

**검증**:
```typescript
for (const method of unusedMethods) {
  if (method.callCount === 0 && method.visibility === 'public') {
    warnings.push(
      `Method ${method.className}.${method.methodName} is never called`
    );
  }
}
```

**예외**:
- Entry point class methods (외부 사용자용)
- @deprecated methods
- Event handlers, lifecycle methods

### Rule 5: JSDoc 존재

**규칙**: Public interface는 JSDoc을 가져야 함

**검증**:
```typescript
for (const iface of publicInterfaces) {
  const usage = graph.getUsage(iface.file, iface.name);
  if (usage.isEntryPoint && !iface.documentation) {
    warnings.push(`Interface ${iface.name} has no JSDoc`);
  }
}
```

**예외**: Simple constants, type aliases

---

## 에러 메시지

### 출력 형식

```
🔍 Interface-Level Validation Results

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary

Entry Points: 6 (3 CLI, 3 API)
Public Interfaces: 12
  - Documented: 10 (83.3%)
  - Used: 11 (91.7%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Orphan Interfaces: 2

1. src/parsers/TypeScriptParser.ts::extractStringValue
   Type: function
   Reason: not_used
   💡 Suggestion: Consider removing or marking as @internal

2. src/shared/i18n.ts::KO_MESSAGES
   Type: const
   Reason: not_documented
   💡 Suggestion: Mark as @internal (implementation detail)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Unused Methods: 1

1. ParserFactory.reset()
   File: src/parsers/ParserFactory.ts:74
   Visibility: public
   Calls: 0
   💡 Suggestion: Mark as @internal (testing only)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Missing Documentation: 3

1. src/parsers/PythonParser.ts::PythonParser
   Issue: no_jsdoc
   Severity: warning
   💡 Add JSDoc comment above class definition

2. src/shared/i18n.ts::setLanguage
   Issue: missing_public_interfaces
   Severity: error
   💡 Add to public_interfaces in 10_Internationalization.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Validation Result: PASS (with warnings)

Documentation Coverage: 83.3%
Usage Rate: 91.7%
Average Methods per Class: 4.2
```

---

## 성능 고려사항

### 최적화 전략

1. **Lazy Parsing**: 필요한 파일만 파싱
2. **Caching**: Parse 결과 캐싱 (파일 해시 기반)
3. **Parallel Processing**: 병렬로 파일 분석
4. **Incremental Analysis**: 변경된 파일만 재분석

### 예상 성능

| 프로젝트 크기 | 파일 수 | 예상 시간 |
|-------------|--------|---------|
| Small | < 100 | < 1s |
| Medium | 100-500 | 1-5s |
| Large | 500-2000 | 5-20s |
| Huge | > 2000 | 20-60s |

### 메모리 사용

- InterfaceDefinition: ~1KB per interface
- InterfaceUsage: ~2KB per interface
- Total for 100 interfaces: ~300KB

---

## 테스트 전략

### Unit Tests

```typescript
describe('ExportAnalyzer', () => {
  it('should extract class with methods', () => {
    const interfaces = ExportAnalyzer.extractInterfaces(...);
    expect(interfaces[0].methods).toHaveLength(3);
  });

  it('should detect JSDoc comments', () => {
    const interfaces = ExportAnalyzer.extractInterfaces(...);
    expect(interfaces[0].documentation).toContain('Factory');
  });

  it('should filter private methods', () => {
    const methods = ExportAnalyzer.extractClassMethods(...);
    expect(methods.every(m => m.visibility === 'public')).toBe(true);
  });
});

describe('InterfaceGraph', () => {
  it('should build usage graph', async () => {
    const graph = new InterfaceGraph(projectPath);
    await graph.build(entryPoints, interfaces);

    const usage = graph.getUsage('src/parser/Factory.ts', 'ParserFactory');
    expect(usage.importedBy.length).toBeGreaterThan(0);
  });

  it('should track method calls', async () => {
    const graph = new InterfaceGraph(projectPath);
    await graph.build(entryPoints, interfaces);

    const unusedMethods = graph.getUnusedMethods('src/parser/Factory.ts', 'ParserFactory');
    expect(unusedMethods).toContainEqual(
      expect.objectContaining({ name: 'reset' })
    );
  });
});

describe('InterfaceOrphanValidator', () => {
  it('should detect orphan interfaces', async () => {
    const validator = new InterfaceOrphanValidator(projectPath);
    const result = await validator.validate();

    expect(result.orphans.length).toBe(2);
  });

  it('should respect @internal tag', async () => {
    const validator = new InterfaceOrphanValidator(projectPath);
    const result = await validator.validate();

    expect(result.orphans.every(o => o.interfaceName !== 'InternalHelper')).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Interface Validation E2E', () => {
  it('should validate entire project', async () => {
    const validator = new InterfaceOrphanValidator('./test-project');
    const result = await validator.validate();

    expect(result.success).toBe(true);
    expect(result.totalInterfaces).toBeGreaterThan(0);
    expect(result.documentationCoverage).toBeGreaterThan(80);
  });

  it('should generate frontmatter', async () => {
    const interfaces = await generatePublicInterfaces(
      'src/parsers/ParserFactory.ts',
      './test-project'
    );

    expect(interfaces).toContainEqual(
      expect.objectContaining({
        name: 'ParserFactory',
        type: 'class',
        methods: expect.arrayContaining(['getParser', 'register']),
      })
    );
  });
});
```

### Manual Tests

```bash
# Test entry point detection
edgedoc analyze entry-points

# Test interface extraction
edgedoc analyze interfaces --entry-point src/parsers/ParserFactory.ts

# Test validation
edgedoc validate spec-orphans --mode interface

# Test frontmatter generation
edgedoc generate-interfaces --entry-point src/parsers/ParserFactory.ts

# Dry run
edgedoc validate spec-orphans --mode interface --dry-run
```

---

## 다음 단계

1. ✅ **Phase 1**: Entry Point Detection (완료)
2. 🔄 **Phase 2**: ExportAnalyzer 구현
3. 🔄 **Phase 3**: InterfaceGraph 구현
4. 🔄 **Phase 4**: InterfaceOrphanValidator 구현
5. 🔄 **Phase 5**: CLI 통합 및 테스트
6. 🔄 **Phase 6**: 문서 업데이트 및 마이그레이션

각 Phase는 독립적으로 테스트 가능하며, 기존 시스템과 병행 운영됩니다.
