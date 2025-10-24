# Interface-Level Validation Integration Summary

**Date**: 2025-10-24
**Status**: Design Phase
**Version**: 1.0

## Executive Summary

This document synthesizes the findings from comprehensive reviews of 5 major integration points for the new interface-level validation system. The analysis reveals a clear path forward with backward compatibility as the core principle.

**Key Findings**:
- All 5 integration points support gradual migration
- Estimated implementation: 5-6 weeks (2680+ LOC)
- Hybrid mode recommended for transition period
- No breaking changes to existing workflows

---

## 1. ParserFactory Integration Analysis

### Current State
The ParserFactory is the foundational component for all code analysis:

```typescript
// Current Public API (5 interfaces)
export class ParserFactory {
  static getParser(filePath: string): ILanguageParser | null
  static register(ext: string, parser: ILanguageParser): void
  static getSupportedExtensions(): string[]
  static reset(): void  // ⚠️ Internal use only
}
```

### Integration Requirements

**New ExportAnalyzer Component** will use ParserFactory:

```typescript
class ExportAnalyzer {
  extractInterfaces(filePath: string): InterfaceDefinition[] {
    const parser = ParserFactory.getParser(filePath);
    if (!parser) return [];

    const parseResult = parser.parse(content, filePath);
    return this.buildInterfaceDefinitions(parseResult.exports);
  }
}
```

### Required Changes

1. **Add JSDoc Annotations**:
   ```typescript
   /**
    * @internal
    * Reset registry - for testing only
    */
   static reset(): void
   ```

2. **Method-Level Tracking**:
   - Extract method signatures for class exports
   - Track method JSDoc for documentation validation
   - Preserve existing ParseResult structure

3. **Documentation Updates**:
   ```yaml
   # tasks/features/09_MultiLanguageParser.md
   public_interfaces:
     - name: "ParserFactory"
       type: "class"
       methods: ["getParser", "register", "getSupportedExtensions"]
       isPrimary: true
       internal_methods: ["reset"]  # NEW
   ```

**Backward Compatibility**: ✅ No breaking changes, only additions

---

## 2. i18n System Integration Analysis

### Current State
i18n system has mixed public/internal API exposure:

```typescript
// Public API (should be documented)
export function setLanguage(lang: 'en' | 'ko'): void
export function getLanguage(): 'en' | 'ko'
export function t(key: MessageKey, ...args: any[]): string

// Internal constants (should NOT be documented)
export const EN_MESSAGES: LocalizedMessages
export const KO_MESSAGES: LocalizedMessages
export const DEFAULT_LANGUAGE = 'en' as const
```

### Integration Requirements

**Interface Classification** by new validation rules:

| Interface | Type | Classification | Reason |
|-----------|------|----------------|--------|
| `setLanguage` | function | Public | Used in config.ts, CLI |
| `getLanguage` | function | Public (unused) | ⚠️ 0 imports |
| `t` | function | Public | Used in 6 files |
| `EN_MESSAGES` | const | Internal | Implementation detail |
| `KO_MESSAGES` | const | Internal | Implementation detail |
| `DEFAULT_LANGUAGE` | const | Internal | Implementation detail |

### Required Changes

1. **Add Internal Markers**:
   ```typescript
   /** @internal */
   export const EN_MESSAGES: LocalizedMessages = { /* ... */ };

   /** @internal */
   export const KO_MESSAGES: LocalizedMessages = { /* ... */ };
   ```

2. **Document Public API Only**:
   ```yaml
   # tasks/features/10_Internationalization.md
   public_interfaces:
     - name: "setLanguage"
       type: "function"
       isPrimary: true
     - name: "t"
       type: "function"
       isPrimary: true
     - name: "getLanguage"
       type: "function"
       deprecated: false  # Consider removing if unused
   ```

3. **Validation Warnings**:
   - `getLanguage()`: 0 imports detected → recommend removal or @deprecated

**Backward Compatibility**: ✅ Internal markers are non-breaking annotations

---

## 3. Orphan Validation Integration Analysis

### Current State Comparison

| Aspect | File-Level (Current) | Interface-Level (New) |
|--------|---------------------|---------------------|
| **Validation Unit** | Entire file | Individual exports |
| **Granularity** | All or nothing | Per-interface |
| **Tools** | orphans.ts, spec-orphans.ts | InterfaceOrphanValidator |
| **Frontmatter** | code_references array | public_interfaces array |
| **False Positives** | If 1 export used → all documented | No false positives |

### Integration Strategy: **Parallel Coexistence**

```typescript
// NEW: Mode selection in validation
interface ValidationOptions {
  mode: 'file' | 'interface';  // Default: 'file'
  projectPath: string;
}

// Phase 1: Both modes available
edgedoc validate orphans --mode file       // Current behavior
edgedoc validate orphans --mode interface  // New behavior

// Phase 2: Hybrid mode (default)
edgedoc validate orphans                   // Runs both, shows comparison
```

### Required Changes

**1. New InterfaceOrphanValidator** (est. 800 LOC):
```typescript
export async function validateInterfaceOrphans(
  options: ValidationOptions
): Promise<ValidationResult> {
  // 1. Detect entry points
  const entryPoints = EntryPointDetector.detect(options.projectPath);

  // 2. Extract interfaces
  const analyzer = new ExportAnalyzer(entryPoints);
  const interfaces = analyzer.extractAll();

  // 3. Build usage graph
  const graph = new InterfaceGraph(interfaces);

  // 4. Validate coverage
  const orphans = graph.findOrphans();

  return {
    success: orphans.length === 0,
    orphanInterfaces: orphans,
    totalInterfaces: interfaces.length,
  };
}
```

**2. Update CLI** (src/cli.ts):
```typescript
validate
  .command('orphans')
  .option('--mode <type>', 'Validation mode: file | interface', 'file')
  .action(async (options) => {
    if (options.mode === 'interface') {
      return await validateInterfaceOrphans(options);
    }
    return await validateOrphans(options);  // Legacy
  });
```

**3. Frontmatter Evolution**:
```yaml
# OLD: File-level
code_references:
  - "src/parsers/ParserFactory.ts"

# NEW: Interface-level (additive)
code_references:
  - "src/parsers/ParserFactory.ts"
public_interfaces:
  - name: "ParserFactory"
    type: "class"
    methods: ["getParser", "register"]
```

### Migration Timeline

| Phase | Duration | Goal |
|-------|----------|------|
| Phase 1 | 2 weeks | Implement InterfaceOrphanValidator with --mode flag |
| Phase 2 | 1 week | Run both modes in parallel, compare results |
| Phase 3 | 1 week | Update all documentation with public_interfaces |
| Phase 4 | 1 week | Switch default to interface mode |
| Phase 5 | Future | Deprecate file mode |

**Estimated LOC**: 2680 (validator: 800, graph: 600, analyzer: 450, tests: 830)

**Backward Compatibility**: ✅ File mode remains default during transition

---

## 4. Config System Integration Analysis

### Current Config Schema

```typescript
// src/types/config.ts
export interface MDocConfig {
  projectRoot: string;
  docsDir: string;
  language: 'en' | 'ko';
  excludePatterns?: string[];
  sync?: SyncConfig;
}
```

### Proposed Config Extension

```typescript
export interface MDocConfig {
  // ... existing fields ...

  validation?: ValidationConfig;  // NEW
}

export interface ValidationConfig {
  // Interface-level validation settings
  interfaceLevel?: {
    enabled: boolean;           // Default: false (opt-in)
    mode: 'file' | 'interface'; // Default: 'file'

    // Entry point detection
    entryPoints?: {
      autoDetect: boolean;      // Default: true
      explicit?: string[];      // Manual overrides
    };

    // Validation rules
    rules?: {
      requireDocumentation: boolean;     // Default: true
      requireUsage: boolean;             // Default: true
      trackMethodUsage: boolean;         // Default: false
      allowDeprecated: boolean;          // Default: true
    };

    // Coverage thresholds
    coverage?: {
      minInterfaceCoverage: number;      // Default: 80 (%)
      minMethodCoverage: number;         // Default: 60 (%)
    };

    // Severity levels
    severity?: {
      orphanInterface: 'error' | 'warning';  // Default: 'error'
      unusedMethod: 'error' | 'warning';     // Default: 'warning'
      missingJSDoc: 'error' | 'warning';     // Default: 'warning'
    };
  };
}
```

### Example Configurations

**1. Conservative (Gradual Adoption)**:
```json
{
  "validation": {
    "interfaceLevel": {
      "enabled": true,
      "mode": "file",
      "rules": {
        "requireDocumentation": true,
        "requireUsage": false,
        "trackMethodUsage": false
      }
    }
  }
}
```

**2. Strict (Full Interface Validation)**:
```json
{
  "validation": {
    "interfaceLevel": {
      "enabled": true,
      "mode": "interface",
      "rules": {
        "requireDocumentation": true,
        "requireUsage": true,
        "trackMethodUsage": true
      },
      "coverage": {
        "minInterfaceCoverage": 100,
        "minMethodCoverage": 80
      },
      "severity": {
        "orphanInterface": "error",
        "unusedMethod": "error",
        "missingJSDoc": "error"
      }
    }
  }
}
```

**3. Recommended (Balanced)**:
```json
{
  "validation": {
    "interfaceLevel": {
      "enabled": true,
      "mode": "interface",
      "rules": {
        "requireDocumentation": true,
        "requireUsage": true,
        "trackMethodUsage": false
      },
      "coverage": {
        "minInterfaceCoverage": 90
      },
      "severity": {
        "orphanInterface": "error",
        "unusedMethod": "warning",
        "missingJSDoc": "warning"
      }
    }
  }
}
```

### Required Changes

**1. Update Config Types** (src/types/config.ts):
```typescript
// Add ValidationConfig interface (40 LOC)
// Extend MDocConfig interface (5 LOC)
// Add default values (20 LOC)
```

**2. Update Config Parser** (src/utils/config.ts):
```typescript
export function loadConfig(projectPath: string): MDocConfig {
  const config = JSON.parse(content);

  // Apply defaults
  return {
    ...config,
    validation: {
      interfaceLevel: {
        enabled: false,  // Opt-in by default
        mode: 'file',
        ...config.validation?.interfaceLevel,
      },
    },
  };
}
```

**3. Update mdoc.config.example.json**:
```json
{
  "projectRoot": ".",
  "docsDir": "tasks",
  "language": "en",
  "validation": {
    "interfaceLevel": {
      "enabled": false,
      "mode": "file"
    }
  }
}
```

**Backward Compatibility**: ✅ All new fields optional with safe defaults

---

## 5. Sync Command Integration Analysis

### Current Sync Behavior

```typescript
// src/tools/sync.ts
export async function syncCodeRefs(options: SyncOptions): Promise<SyncResult> {
  // 1. Parse all docs for code_references
  // 2. Build file-level dependency graph
  // 3. Update code_references in frontmatter
  // 4. Write updated docs
}
```

**Limitation**: Only syncs file-level code_references, no interface information.

### Proposed Sync Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **file** | Current behavior | Legacy projects |
| **interface** | Sync public_interfaces only | New projects |
| **hybrid** | Sync both code_references + public_interfaces | **Recommended** |

### Integration Design

**1. Auto-Generate public_interfaces** from entry points:

```typescript
// NEW: Interface sync algorithm
async function syncPublicInterfaces(
  entryPoint: string,
  docFile: string
): Promise<PublicInterface[]> {
  // 1. Extract interfaces from entry point
  const analyzer = new ExportAnalyzer([entryPoint]);
  const interfaces = analyzer.extractInterfaces(entryPoint);

  // 2. Build usage graph
  const graph = new InterfaceGraph(interfaces);

  // 3. Filter to public interfaces only
  const publicInterfaces = interfaces.filter(i => {
    return !i.isInternal && graph.isUsed(i.name);
  });

  // 4. Convert to frontmatter format
  return publicInterfaces.map(i => ({
    name: i.name,
    type: i.type,
    methods: i.type === 'class' ? i.methods?.map(m => m.name) : undefined,
    isPrimary: graph.getImportCount(i.name) > 5,  // Heuristic
  }));
}
```

**2. Updated Sync Command**:

```typescript
program
  .command('sync')
  .option('--mode <type>', 'Sync mode: file | interface | hybrid', 'hybrid')
  .action(async (options) => {
    if (options.mode === 'file') {
      // Legacy: sync code_references only
      return await syncCodeRefs(options);
    }

    if (options.mode === 'interface') {
      // New: sync public_interfaces only
      return await syncPublicInterfaces(options);
    }

    // Hybrid: sync both
    const fileResult = await syncCodeRefs(options);
    const interfaceResult = await syncPublicInterfaces(options);

    return mergeResults(fileResult, interfaceResult);
  });
```

**3. Frontmatter Output** (hybrid mode):

```yaml
---
type: feature
entry_point: "src/parsers/ParserFactory.ts"

# File-level references (auto-synced)
code_references:
  - "src/parsers/ILanguageParser.ts"
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/TypeScriptParser.ts"

# Interface-level references (auto-generated)
public_interfaces:
  - name: "ParserFactory"
    type: "class"
    methods: ["getParser", "register", "getSupportedExtensions"]
    isPrimary: true
    usageCount: 12
  - name: "ILanguageParser"
    type: "interface"
    isPrimary: true
    usageCount: 8
---
```

### Sync Algorithm Details

**Phase 1: Discovery**
```typescript
// For each doc file with entry_point frontmatter
const docs = findDocsWithEntryPoints(docsDir);

for (const doc of docs) {
  const entryPoint = doc.frontmatter.entry_point;

  // Extract all exports from entry point
  const exports = ExportAnalyzer.extract(entryPoint);

  // Build usage graph
  const graph = new InterfaceGraph(exports);

  // Generate public_interfaces
  doc.frontmatter.public_interfaces = generatePublicInterfaces(exports, graph);
}
```

**Phase 2: Validation**
```typescript
// Validate consistency
for (const doc of docs) {
  const declaredInterfaces = doc.frontmatter.public_interfaces;
  const actualExports = ExportAnalyzer.extract(doc.frontmatter.entry_point);

  // Warn if mismatch
  if (!isConsistent(declaredInterfaces, actualExports)) {
    console.warn(`⚠️ ${doc.file}: public_interfaces out of sync`);
  }
}
```

**Phase 3: Update**
```typescript
// Write updated frontmatter
for (const doc of docs) {
  if (options.dryRun) {
    console.log(`Would update: ${doc.file}`);
  } else {
    writeDoc(doc);
  }
}
```

### Required Changes

**1. New syncPublicInterfaces function** (est. 400 LOC):
- Entry point discovery
- Interface extraction
- Usage analysis
- Frontmatter generation

**2. Update CLI** (src/cli.ts):
```typescript
program
  .command('sync')
  .option('--mode <type>', 'file | interface | hybrid', 'hybrid')
  .option('--validate', 'Validate consistency after sync')
```

**3. Dual-Field Support**:
- Keep code_references for backward compatibility
- Add public_interfaces for interface-level tracking
- Both fields auto-synced in hybrid mode

### Migration Strategy

| Week | Activity |
|------|----------|
| Week 1 | Implement syncPublicInterfaces function |
| Week 2 | Test with existing docs (dry-run) |
| Week 3 | Run full sync in hybrid mode |
| Week 4 | Validate consistency, fix mismatches |

**Backward Compatibility**: ✅ Hybrid mode adds data without removing existing fields

---

## 6. Consolidated Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Core infrastructure for interface-level validation

**Tasks**:
1. ✅ EntryPointDetector (DONE)
2. Implement ExportAnalyzer (450 LOC)
   - Extract InterfaceDefinition with methods
   - Add JSDoc parsing
   - Support TypeScript + Python
3. Implement InterfaceGraph (600 LOC)
   - Build interface usage graph
   - Track method calls
   - Detect orphan interfaces
4. Add ValidationConfig types (65 LOC)
5. Update config parser with defaults (50 LOC)

**Deliverable**: Basic interface extraction working

---

### Phase 2: Validation Engine (Weeks 3-4)

**Goal**: Full interface-level orphan detection

**Tasks**:
1. Implement InterfaceOrphanValidator (800 LOC)
   - 5 validation rules
   - Severity levels
   - Coverage reporting
2. Add CLI --mode flag (30 LOC)
3. Write comprehensive tests (830 LOC)
4. Update documentation

**Deliverable**: `edgedoc validate orphans --mode interface` working

---

### Phase 3: Sync Integration (Week 5)

**Goal**: Auto-generate public_interfaces frontmatter

**Tasks**:
1. Implement syncPublicInterfaces (400 LOC)
2. Add hybrid sync mode (150 LOC)
3. Test with existing docs
4. Validate consistency

**Deliverable**: `edgedoc sync --mode hybrid` working

---

### Phase 4: Migration & Testing (Week 6)

**Goal**: Full system integration and documentation

**Tasks**:
1. Run full sync on project
2. Update all feature docs with public_interfaces
3. Compare file-level vs interface-level results
4. Write migration guide
5. Update README and examples

**Deliverable**: Production-ready interface-level validation

---

## 7. Risk Analysis & Mitigation

### Risk 1: Breaking Changes to Existing Workflows
**Probability**: Low
**Impact**: High
**Mitigation**:
- All new features opt-in (validation.interfaceLevel.enabled: false)
- Default mode remains 'file' during transition
- Parallel coexistence of both validation modes
- Gradual migration over 4 phases

---

### Risk 2: Performance Degradation
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Incremental parsing with tree-sitter
- Cache interface extraction results
- Lazy graph construction
- Performance benchmarks before release

---

### Risk 3: False Positives in Orphan Detection
**Probability**: Medium
**Impact**: High
**Mitigation**:
- @internal JSDoc support for internal APIs
- @deprecated JSDoc support for legacy APIs
- Type-only imports properly handled
- Configurable severity levels (error vs warning)

---

### Risk 4: Incomplete Parser Support
**Probability**: Low
**Impact**: Medium
**Mitigation**:
- Currently supports TypeScript + Python (95% coverage)
- Fallback to file-level for unsupported languages
- Clear error messages for unsupported files

---

### Risk 5: Complex Migration for Large Projects
**Probability**: High
**Impact**: Medium
**Mitigation**:
- Auto-sync generates most public_interfaces
- Dry-run mode for validation
- Gradual opt-in per feature
- Detailed migration guide with examples

---

## 8. Success Metrics

### Quantitative Metrics

| Metric | Current (File-Level) | Target (Interface-Level) |
|--------|---------------------|-------------------------|
| Validation Granularity | 100% (file) | 100% (interface) |
| False Positive Rate | ~30% (estimated) | <5% |
| Orphan Detection Accuracy | Low (all-or-nothing) | High (per-interface) |
| Documentation Coverage | 85% files | 90% interfaces |
| Validation Time | <1s | <3s |

### Qualitative Metrics

- ✅ No breaking changes to existing workflows
- ✅ Backward compatible frontmatter
- ✅ Clear migration path
- ✅ Comprehensive test coverage (>80%)
- ✅ Production-ready CLI

---

## 9. Key Recommendations

### Immediate Actions (Week 1)

1. **Start with ExportAnalyzer implementation**
   - Foundation for all other components
   - Can be tested independently
   - Already have ParserFactory working

2. **Add @internal markers to existing code**
   - Non-breaking JSDoc annotations
   - Improves code clarity immediately
   - Examples: ParserFactory.reset(), EN_MESSAGES, KO_MESSAGES

3. **Update config schema with validation settings**
   - Enables opt-in testing
   - No impact on current behavior
   - Clear path for gradual adoption

### Migration Strategy

**Recommended**: **Hybrid Mode** as default after Week 3

```json
{
  "validation": {
    "interfaceLevel": {
      "enabled": true,
      "mode": "interface",
      "rules": {
        "requireDocumentation": true,
        "requireUsage": true,
        "trackMethodUsage": false  // Phase 2
      },
      "severity": {
        "orphanInterface": "error",
        "unusedMethod": "warning",
        "missingJSDoc": "warning"
      }
    }
  }
}
```

### Testing Strategy

**3-Tier Testing Approach**:

1. **Unit Tests** (50% coverage minimum)
   - ExportAnalyzer: 150 LOC tests
   - InterfaceGraph: 200 LOC tests
   - InterfaceOrphanValidator: 250 LOC tests

2. **Integration Tests** (30% coverage minimum)
   - Full validation pipeline
   - Config loading and defaults
   - CLI command execution

3. **Real-World Tests** (20% coverage)
   - Run on mdoc-tools itself
   - Run on dependency-linker project
   - Compare file vs interface modes

---

## 10. Conclusion

The interface-level validation system represents a significant enhancement to edgedoc's capabilities while maintaining complete backward compatibility. The analysis of all 5 integration points confirms:

✅ **Feasible**: All integration points have clear implementation paths
✅ **Safe**: No breaking changes, opt-in adoption
✅ **Valuable**: Eliminates false positives, improves accuracy
✅ **Testable**: Comprehensive test strategy defined
✅ **Maintainable**: Clear separation of concerns, well-documented

**Estimated Effort**: 5-6 weeks (2680+ LOC)
**Risk Level**: Low (with mitigation strategies in place)
**Recommendation**: **Proceed with implementation** starting with Phase 1

---

## Appendices

### Appendix A: LOC Breakdown

| Component | Estimated LOC | Test LOC | Total |
|-----------|--------------|----------|-------|
| ExportAnalyzer | 450 | 150 | 600 |
| InterfaceGraph | 600 | 200 | 800 |
| InterfaceOrphanValidator | 800 | 250 | 1050 |
| syncPublicInterfaces | 400 | 120 | 520 |
| Config integration | 65 | 30 | 95 |
| CLI updates | 30 | 10 | 40 |
| Type definitions | 120 | 40 | 160 |
| Documentation | - | - | - |
| **Total** | **2465** | **800** | **3265** |

### Appendix B: File Changes Summary

**New Files** (8):
- src/analyzers/ExportAnalyzer.ts
- src/analyzers/InterfaceGraph.ts
- src/tools/interface-orphans.ts
- src/types/interface.ts
- tests/analyzers/ExportAnalyzer.test.ts
- tests/analyzers/InterfaceGraph.test.ts
- tests/tools/interface-orphans.test.ts
- docs/INTERFACE_VALIDATION_INTEGRATION.md (this document)

**Modified Files** (6):
- src/cli.ts (add --mode flag)
- src/types/config.ts (add ValidationConfig)
- src/utils/config.ts (add defaults)
- src/tools/sync.ts (add hybrid mode)
- mdoc.config.example.json (add validation section)
- tasks/features/09_MultiLanguageParser.md (add @internal notes)

**Total Changes**: 14 files (8 new, 6 modified)

### Appendix C: Configuration Examples

See Section 4 "Config System Integration Analysis" for detailed configuration examples.

### Appendix D: Related Documents

- [INTERFACE_LEVEL_VALIDATION_PLAN.md](./INTERFACE_LEVEL_VALIDATION_PLAN.md) - Original implementation plan
- [INTERFACE_VALIDATION_DESIGN.md](./INTERFACE_VALIDATION_DESIGN.md) - Detailed technical design

---

**Document Status**: ✅ Complete
**Last Updated**: 2025-10-24
**Next Review**: After Phase 1 implementation
