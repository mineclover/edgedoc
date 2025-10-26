# EdgeDoc 구현 개선 계획

**날짜:** 2025-10-26
**버전:** 1.0
**현재 상태:** 분석 완료, 구현 대기
**총 라인 수:** ~14,160 LOC (TypeScript)

---

## 📊 Executive Summary

EdgeDoc 구현은 **잘 설계된 아키텍처**를 가지고 있지만, 다음 영역에서 개선이 필요합니다:

1. **신뢰성 (Reliability)** - 에러 처리 미흡
2. **안전성 (Safety)** - 설정 검증 부재
3. **유지보수성 (Maintainability)** - 큰 파일, 낮은 테스트 커버리지
4. **성능 (Performance)** - 대규모 프로젝트에서 느림
5. **확장성 (Extensibility)** - 플러그인 시스템 부재

**개선 효과:**
- ✅ 사용자 오류 조기 감지
- ✅ 데이터 손실 방지
- ✅ 대규모 프로젝트 지원 (10,000+ 파일)
- ✅ 유지보수 용이성 증대
- ✅ 커뮤니티 기여 활성화

---

## 🏗️ 현재 아키텍처

### 레이어 구조

```
CLI Layer (cli.ts - 1,329 lines)
    ↓
Validation Layer (10+ validators)
    ↓
Parsing Layer (TypeScript, Python, Markdown parsers)
    ↓
Reference Index (Graph-based analysis)
    ↓
Utility Layer (Config, i18n, utils)
```

### 주요 컴포넌트

| 컴포넌트 | 책임 | 라인 수 |
|---------|------|--------|
| **cli.ts** | 명령어 라우팅 및 정의 | 1,329 |
| **validate.ts** | 마이그레이션 검증 | 342 |
| **naming.ts** | 네이밍 규칙 검증 | 528 |
| **structure.ts** | 구조 및 순환 의존성 검증 | 590 |
| **orphans.ts** | 고아 파일 검출 | 415 |
| **build-reference-index.ts** | 참조 그래프 구축 | 412 |
| **implementation-coverage.ts** | 테스트 커버리지 분석 | 818 |
| **TypeScriptParser.ts** | TS/JS 파싱 (Tree-sitter) | ~300 |
| **index.ts** | MCP 서버 | 956 |

---

## 🔴 TIER 1: CRITICAL (1-2주)

### 1. 구조화된 에러 시스템 구현

**현재 문제:**
```typescript
// 현재: 혼합된 에러 처리
throw new Error(`Failed to parse ${filePath}`);  // style 1
errors.push({ file, type: 'format' });          // style 2
console.warn(`Failed...`);                       // style 3
return { imports: [], exports: [] };             // style 4 (silent)
```

**목표:**
```typescript
// 제안: 통일된 에러 시스템
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export class EdgeDocError extends Error {
  constructor(
    public code: string,
    public message: string,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public context?: {
      file?: string;
      line?: number;
      suggestion?: string;
    }
  ) {
    super(message);
  }
}
```

**이점:**
- 일관된 에러 처리
- 심각도별 필터링 가능
- 사용자에게 해결책 제시 가능
- 에러 집계 및 리포팅 가능

**영향도:** 모든 검증 도구, MCP 서버
**예상 소요시간:** 2시간
**난이도:** ⭐⭐ (중간)

---

### 2. Zod로 설정 검증 추가

**현재 문제:**
```typescript
// 현재: 검증 없음
const userConfig = JSON.parse(content) as Partial<MdocConfig>;
// → 잘못된 설정도 그냥 통과, 기본값으로 폴백
```

**목표:**
```typescript
import { z } from 'zod';

export const MdocConfigSchema = z.object({
  language: z.enum(['en', 'ko']).default('en'),
  docs: z.object({
    baseDir: z.string().default('edgedoc'),
    excludeDirs: z.array(z.string()).optional(),
  }),
  code: z.object({
    baseDir: z.string().default('src'),
    languages: z.array(z.enum(['ts', 'py'])).optional(),
  }),
  references: z.object({
    indexPath: z.string().default('.edgedoc/references.json'),
    incremental: z.boolean().default(true),
  }),
});

// 사용처
export function loadConfig(projectPath: string): MdocConfig {
  const raw = loadRawConfig(projectPath);
  try {
    return MdocConfigSchema.parse(raw);
  } catch (error) {
    throw new EdgeDocError(
      'CONFIG_INVALID',
      `Invalid configuration: ${error.message}`,
      ErrorSeverity.ERROR,
      { suggestion: 'Run: edgedoc init' }
    );
  }
}
```

**이점:**
- 설정 오류 조기 감지
- 자명한 문서화 (스키마가 사양)
- 타입 안전성

**영향도:** config.ts, utils/config.ts
**예상 소요시간:** 1시간
**난이도:** ⭐ (쉬움)

---

### 3. Parser 에러 무음화 제거

**현재 문제:**
```typescript
// TypeScriptParser.ts
try {
  const tree = parser.parse(sourceCode);
  // ...
} catch (error) {
  console.warn(`Failed to parse...`);
  return { imports: [], exports: [] };  // ← 파싱 실패를 알 수 없음
}
```

**목표:**
```typescript
export interface ParseResult {
  imports: ImportInfo[];
  exports: ExportInfo[];
  errors: ParseError[];  // ← 새 필드
}

export interface ParseError {
  message: string;
  line?: number;
  code: 'SYNTAX_ERROR' | 'UNKNOWN_ERROR';
}

// 구현
try {
  const tree = parser.parse(sourceCode);
  // ... 정상 처리
  return { imports, exports, errors: [] };
} catch (error) {
  return {
    imports: [],
    exports: [],
    errors: [{
      message: `Parse error: ${error.message}`,
      code: 'SYNTAX_ERROR'
    }]
  };
}
```

**이점:**
- 파싱 실패를 구분 가능
- 참조 인덱스에 불완전성 기록
- 사용자에게 파싱 실패 보고

**영향도:** ParserFactory, TypeScriptParser, PythonParser
**예상 소요시간:** 1.5시간
**난이도:** ⭐ (쉬움)

---

### 4. Tree-sitter 쿼리 캐싱

**현재 문제:**
```typescript
// 매번 새로운 쿼리 생성
for (const file of files) {
  const query = new Parser.Query(language, IMPORT_QUERY);  // ← 반복
  const captures = query.captures(tree.rootNode);
}
```

**목표:**
```typescript
class QueryCache {
  private cache = new Map<string, Parser.Query>();

  getQuery(language: any, queryString: string): Parser.Query {
    const key = crypto
      .createHash('sha256')
      .update(`${language}:${queryString}`)
      .digest('hex');

    if (!this.cache.has(key)) {
      this.cache.set(key, new Parser.Query(language, queryString));
    }
    return this.cache.get(key)!;
  }

  clear(): void {
    this.cache.clear();
  }
}

// 사용
const queryCache = new QueryCache();
export class TypeScriptParser implements ILanguageParser {
  parse(sourceCode: string, filePath: string): ParseResult {
    const tree = this.parser.parse(sourceCode);
    const importQuery = queryCache.getQuery(this.language, IMPORT_QUERY);
    const exportQuery = queryCache.getQuery(this.language, EXPORT_QUERY);
    // ... 사용
  }
}
```

**이점:**
- CPU 오버헤드 감소 (쿼리 컴파일 제거)
- 대규모 프로젝트에서 눈에 띄는 성능 개선
- 측정 가능한 개선 (프로파일링으로 확인 가능)

**영향도:** parsers/TypeScriptParser.ts, PythonParser.ts
**예상 소요시간:** 1시간
**난이도:** ⭐ (쉬움)

---

### 5. MCP 서버를 Node.js로 수정

**현재 문제:**
```typescript
// index.ts: executeMdocCommand()
const child = spawn('bun', [mdocPath, ...args]);  // ← 구식 (Bun 마이그레이션 완료됨)
```

**목표:**
```typescript
// 수정
const child = spawn('node', [mdocPath, ...args], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
});
```

**이점:**
- Node.js 환경에서 MCP 서버 작동
- Bun 미설치 시스템에서도 작동
- 일관성 (프로젝트는 이미 Node.js로 마이그레이션됨)

**영향도:** index.ts (MCP 서버)
**예상 소요시간:** 30분
**난이도:** ⭐ (매우 쉬움)

---

**TIER 1 합계:**
- 예상 소요시간: **5.5시간**
- 총 파일 수: **5-7개**
- 난이도: 낮음 ~ 중간
- 영향: **매우 높음** (신뢰성, 안전성 향상)

---

## 🟠 TIER 2: HIGH PRIORITY (2-3주)

### 6. CLI 명령어를 별도 모듈로 분리

**현재 문제:**
```
src/cli.ts: 1,329 lines
├── validate 명령어 (600+ lines)
├── sync 명령어 (300+ lines)
├── docs 명령어 (200+ lines)
├── terms 명령어 (200+ lines)
└── ... 기타
```

**목표:**
```
src/
├── cli.ts                  (200 lines, 명령어 등록만)
├── commands/
│   ├── index.ts            (export all commands)
│   ├── validate/
│   │   ├── index.ts        (validate 명령어 등록)
│   │   ├── migration.ts
│   │   ├── naming.ts
│   │   ├── structure.ts
│   │   └── ...
│   ├── sync.ts
│   ├── docs.ts
│   ├── terms/
│   │   ├── index.ts
│   │   ├── list.ts
│   │   ├── find.ts
│   │   └── generate.ts
│   └── ...
├── tools/                  (현재 그대로)
└── ...
```

**구현 예시:**
```typescript
// commands/validate/index.ts
import { Command } from 'commander';
import validateMigration from './migration';
import validateNaming from './naming';
import validateStructure from './structure';

export function registerValidateCommand(parent: Command): Command {
  const validate = parent.command('validate');

  validateMigration(validate);
  validateNaming(validate);
  validateStructure(validate);
  // ...

  return validate;
}

// commands/validate/migration.ts
export default function registerMigrationCommand(parent: Command): void {
  parent
    .command('migration')
    .description('Validate migration from tasks to tasks-v2')
    .action(async (options) => {
      const result = await validateMigrationImpl(options);
      // ...
    });
}

// cli.ts (간소화됨)
import { Command } from 'commander';
import { registerValidateCommand } from './commands/validate';
import { registerSyncCommand } from './commands/sync';
// ...

const program = new Command();

registerValidateCommand(program);
registerSyncCommand(program);
// ...

program.parse(process.argv);
```

**이점:**
- cli.ts를 1,300줄 → 200줄로 축소
- 각 명령어 독립적으로 테스트 가능
- 새 명령어 추가 용이
- 산업 표준 (Next.js, Remix, Vite)

**영향도:** cli.ts (리팩토링), 새 commands/ 디렉토리
**예상 소요시간:** 6시간
**난이도:** ⭐⭐⭐ (중상)

---

### 7. YAML 기반 Frontmatter 파싱

**현재 문제:**
```typescript
// structure.ts: extractFrontmatterField()
const regex = new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm');
const match = content.match(regex);

// 문제: YAML 문법을 제대로 파싱하지 못함
// - 배열: code_references: [file1, file2]
// - 객체: metadata: { type: interface }
// - 특수 문자: "value with: colon"
```

**목표:**
```typescript
import * as YAML from 'js-yaml';

export function extractFrontmatter(
  content: string
): Record<string, any> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return YAML.load(match[1]) as Record<string, any>;
  } catch (error) {
    throw new EdgeDocError(
      'FRONTMATTER_INVALID',
      `Invalid YAML frontmatter: ${error.message}`,
      ErrorSeverity.ERROR,
      {
        file: filePath,
        suggestion: 'Check YAML syntax: https://yaml.org'
      }
    );
  }
}

export function validateFrontmatter(
  frontmatter: Record<string, any>,
  schema: z.ZodSchema
): void {
  schema.parse(frontmatter);
}

// 사용처
const frontmatterSchema = z.object({
  title: z.string(),
  feature: z.string().optional(),
  status: z.enum(['draft', 'review', 'published']),
  code_references: z.array(z.string()).optional(),
  entry_point: z.string().optional(),
});
```

**이점:**
- 표준 YAML 지원
- 복잡한 타입 처리 가능 (배열, 객체)
- 자동 검증
- 더 견고한 파싱

**영향도:** structure.ts, 모든 frontmatter 사용처
**예상 소요시간:** 2시간
**난이도:** ⭐⭐ (중간)

---

### 8. 로깅 인프라 구축

**현재 문제:**
```typescript
// 혼합된 로깅
console.log(`Found ${count} files`);
console.warn(`⚠️ Warning: ...`);
console.error(`❌ Error: ...`);
// → 추적 불가, 리다이렉션 불가, 테스트 시 방해

// CLI 플래그로 verbosity 제어 불가
```

**목표:**
```typescript
// shared/logger.ts
export interface Logger {
  debug(msg: string, context?: Record<string, any>): void;
  info(msg: string, context?: Record<string, any>): void;
  warn(msg: string, context?: Record<string, any>): void;
  error(msg: string, error?: Error, context?: Record<string, any>): void;
}

export class ConsoleLogger implements Logger {
  constructor(private verbose: boolean = false) {}

  debug(msg: string, context?: Record<string, any>): void {
    if (!this.verbose) return;
    console.debug(`[DEBUG] ${msg}`, context ? JSON.stringify(context) : '');
  }

  info(msg: string, context?: Record<string, any>): void {
    console.log(`[INFO] ${msg}`, context ? JSON.stringify(context) : '');
  }

  warn(msg: string, context?: Record<string, any>): void {
    console.warn(`[WARN] ${msg}`, context ? JSON.stringify(context) : '');
  }

  error(msg: string, error?: Error, context?: Record<string, any>): void {
    console.error(`[ERROR] ${msg}`);
    if (error) console.error(error);
    if (context) console.error(JSON.stringify(context));
  }
}

// 사용처
const logger = new ConsoleLogger(options.verbose);
logger.info('Starting validation');
logger.debug('Loading config', { path: configPath });

// CLI 옵션
program.option('-v, --verbose', 'Enable verbose logging');

// 테스트
class MockLogger implements Logger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

const logger = new MockLogger();
validateMigration({ logger });
expect(logger.info).toHaveBeenCalled();
```

**이점:**
- 중앙화된 로깅
- Verbosity 제어 가능
- 테스트 시 쉽게 목 처리
- 파일 로깅 확장 가능

**영향도:** 모든 모듈, cli.ts
**예상 소요시간:** 4시간
**난이도:** ⭐⭐ (중간)

---

### 9. 고아 파일 검출 알고리즘 개선

**현재 문제:**
```typescript
// orphans.ts
const FILE_PATH_PATTERNS = [
  /-\s*"([^"]+)"/g,
  /entry_point:\s*"([^"]+)"/g,
  /code_references:\s*\["?([^\]"]+)"?\]/g,
  // ...
];

// 문제:
// 1. 여러 패턴을 모든 파일에 반복 → O(n*m) 복잡도
// 2. YAML 배열/객체 미지원
// 3. 마크다운 링크 미지원
// 4. 유지보수 어려움
```

**목표:**
```typescript
// 단일 패스 추출
export function extractFileReferences(
  content: string,
  filePath: string
): string[] {
  const refs: Set<string> = new Set();

  // 1. Frontmatter에서 추출
  const frontmatter = extractFrontmatter(content);
  if (frontmatter) {
    // code_references 필드
    if (Array.isArray(frontmatter.code_references)) {
      frontmatter.code_references.forEach(ref => refs.add(ref));
    }
    // entry_point 필드
    if (typeof frontmatter.entry_point === 'string') {
      refs.add(frontmatter.entry_point);
    }
  }

  // 2. 마크다운 링크에서 추출 ([text](path/to/file))
  const linkMatches = content.matchAll(/\[.*?\]\((.*?)\)/g);
  for (const match of linkMatches) {
    const link = match[1];
    if (!link.startsWith('http') && isSourceFile(link)) {
      refs.add(link);
    }
  }

  // 3. 인라인 코드 참조 (`src/component.ts`)
  const codeMatches = content.matchAll(/`([^`]+\.(ts|js|tsx|jsx|py))`/g);
  for (const match of codeMatches) {
    refs.add(match[1]);
  }

  return Array.from(refs);
}

// 사용처
export async function detectOrphans(
  projectPath: string,
  logger: Logger
): Promise<OrphanResult> {
  logger.info('Detecting orphan files');

  const docs = getMarkdownFiles(projectPath);
  const referencedFiles = new Set<string>();

  // 단일 패스: 모든 문서 스캔
  for (const docFile of docs) {
    const content = readFileSync(docFile, 'utf-8');
    const refs = extractFileReferences(content, docFile);
    refs.forEach(ref => referencedFiles.add(ref));
  }

  // 프로젝트 파일과 비교
  const sourceFiles = getSourceFiles(projectPath);
  const orphans = sourceFiles.filter(
    file => !referencedFiles.has(normalizeFilePath(file))
  );

  return { orphans, referencedCount: referencedFiles.size };
}
```

**이점:**
- O(n*m) → O(n) 복잡도 개선
- YAML, 마크다운 링크 지원
- 유지보수 용이
- 성능 향상

**영향도:** orphans.ts
**예상 소요시간:** 3시간
**난이도:** ⭐⭐ (중간)

---

### 10. 증분 참조 인덱스 빌딩

**현재 문제:**
```typescript
// build-reference-index.ts
export async function buildReferenceIndex(
  projectPath: string,
  options?: BuildOptions
): Promise<ReferenceIndex> {
  // 항상 완전 재구축

  // 문제:
  // - 파일 1개만 변경해도 전체 인덱스 재구축
  // - 1000+ 파일 프로젝트: 10초+ 소요
  // - 사용자 경험 악화
}
```

**목표:**
```typescript
export interface ReferenceIndexMetadata {
  version: string;
  generated: string;
  fileChecksums: {
    [filePath: string]: string;  // SHA256 hash
  };
  categoryTimestamps: {
    features: string;
    code: string;
    interfaces: string;
    terms: string;
  };
}

export async function buildReferenceIndex(
  projectPath: string,
  options?: BuildOptions & { incremental?: boolean }
): Promise<ReferenceIndex> {
  const indexPath = getIndexPath(projectPath);

  // 증분 빌드 지원
  if (options?.incremental && existsSync(indexPath)) {
    const existing = JSON.parse(
      readFileSync(indexPath, 'utf-8')
    ) as ReferenceIndex;

    logger.info('Checking for changes...');

    // 변경된 파일만 재처리
    const changedFiles = detectChangedFiles(
      projectPath,
      existing.metadata.fileChecksums
    );

    if (changedFiles.length === 0) {
      logger.info('No changes detected, skipping rebuild');
      return existing;
    }

    logger.info(`Found ${changedFiles.length} changed files, rebuilding...`);

    // 해당 파일들만 다시 처리
    return rebuildIndexIncremental(existing, changedFiles, projectPath);
  }

  // 완전 재구축
  logger.info('Building full reference index...');
  return buildIndexFull(projectPath);
}

function detectChangedFiles(
  projectPath: string,
  existingChecksums: Record<string, string>
): string[] {
  const changed: string[] = [];
  const files = getMarkdownFiles(projectPath);

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');

    if (existingChecksums[file] !== hash) {
      changed.push(file);
    }
  }

  return changed;
}
```

**이점:**
- 파일 변경 감지
- 변경된 파일만 재처리
- 1개 파일 변경: 100ms
- 10개 파일 변경: 500ms
- 대규모 프로젝트에서 10-50배 빠름

**영향도:** build-reference-index.ts, ReferenceIndex type
**예상 소요시간:** 4시간
**난이도:** ⭐⭐⭐ (중상)

---

**TIER 2 합계:**
- 예상 소요시간: **19시간**
- 총 파일 수: **8-10개**
- 난이도: 중간
- 영향: **높음** (유지보수성, 성능 향상)

---

## 🟡 TIER 3: MEDIUM PRIORITY (4-8주)

### 11. Worker Threads를 이용한 병렬 처리

**목표:** 4-8개 Worker로 4-8배 성능 향상

**예상 소요시간:** 8시간
**난이도:** ⭐⭐⭐ (중상)

---

### 12. 검증 플러그인 시스템

**목표:** 커스텀 검증 규칙 추가 가능

**예상 소요시간:** 6시간
**난이도:** ⭐⭐⭐ (중상)

---

### 13. 대규모 인덱스를 위한 스트리밍 지원

**목표:** 10,000+ 파일 프로젝트 지원

**예상 소요시간:** 6시간
**난이도:** ⭐⭐⭐⭐ (높음)

---

### 14. 순환 의존성 검출 완성

**목표:** features, interfaces, shared types 모두 검사

**예상 소요시간:** 4시간
**난이도:** ⭐⭐⭐ (중상)

---

**TIER 3 합계:**
- 예상 소요시간: **24시간**
- 난이도: 중상 ~ 높음
- 영향: **중간** (확장성, 성능)

---

## 📈 전체 구현 로드맵

```
┌─ TIER 1 (5.5h) ──────────┐
│  Week 1                   │
│  ├─ Error system          │
│  ├─ Config validation     │
│  ├─ Parser error handling │
│  ├─ Query caching         │
│  └─ MCP Node.js fix       │
└───────────────────────────┘
         ↓
┌─ TIER 2 (19h) ──────────────────┐
│  Weeks 2-3                       │
│  ├─ CLI command modules (6h)     │
│  ├─ YAML frontmatter (2h)        │
│  ├─ Logging infrastructure (4h)  │
│  ├─ Orphan detection (3h)        │
│  └─ Incremental indexing (4h)    │
└──────────────────────────────────┘
         ↓
┌─ TIER 3 (24h) ────────────────────────┐
│  Weeks 4-8                             │
│  ├─ Worker Threads concurrency (8h)   │
│  ├─ Plugin system (6h)                │
│  ├─ Streaming support (6h)            │
│  └─ Complete circular deps (4h)       │
└────────────────────────────────────────┘

Total: ~48.5 hours (~2 weeks full-time)
```

---

## 🎯 추천 구현 순서

### Phase 1: 안정성 (TIER 1)
**목표:** 버그 방지, 사용자 오류 감지

1. ✅ Structured Error System
2. ✅ Config Validation with Zod
3. ✅ Parser Error Handling
4. ✅ Query Caching
5. ✅ MCP Node.js Fix

**테스트:**
```bash
npm test -- --coverage errors
npm run validate:all
npm run sync
```

**릴리스:** v1.3.1

---

### Phase 2: 유지보수성 (TIER 2.1-2.2)
**목표:** 코드 가독성, 성능 개선

6. ✅ CLI Command Modules
7. ✅ YAML Frontmatter Parsing
8. ✅ Logging Infrastructure

**테스트:**
```bash
npm test -- --coverage cli commands
npm run validate:all
```

**릴리스:** v1.4.0

---

### Phase 3: 성능 (TIER 2.3-2.4)
**목표:** 대규모 프로젝트 지원

9. ✅ Improved Orphan Detection
10. ✅ Incremental Indexing

**벤치마크:**
```bash
time npm run validate:all
# 기존: 10s → 개선: 3s (3배 개선)

time npm run graph build
# 기존: 15s → 개선: 5s (3배 개선)
```

**릴리스:** v1.4.1

---

### Phase 4: 확장성 (TIER 3)
**목표:** 플러그인, 병렬 처리, 스트리밍

11-14. TIER 3 작업

**릴리스:** v1.5.0

---

## 🧪 테스트 계획

### TIER 1 테스트 커버리지 목표

```typescript
// errors/EdgeDocError.test.ts
describe('EdgeDocError', () => {
  it('should format error with context', () => {
    const error = new EdgeDocError(
      'TEST_ERROR',
      'Test message',
      ErrorSeverity.ERROR,
      { file: 'test.ts', line: 10, suggestion: 'Fix this' }
    );
    expect(error.context?.file).toBe('test.ts');
  });
});

// utils/config.test.ts
describe('loadConfig', () => {
  it('should validate config with Zod', () => {
    const config = loadConfig('./test-project');
    expect(config.language).toBe('en');
  });

  it('should throw EdgeDocError on invalid config', () => {
    expect(() => loadConfig('./invalid-project')).toThrow(EdgeDocError);
  });
});

// parsers/QueryCache.test.ts
describe('QueryCache', () => {
  it('should cache queries', () => {
    const cache = new QueryCache();
    const query1 = cache.getQuery(language, QUERY_STRING);
    const query2 = cache.getQuery(language, QUERY_STRING);
    expect(query1).toBe(query2);  // Same reference
  });
});
```

### TIER 2 테스트 커버리지 목표

- 모든 command 모듈 단위 테스트
- 통합 테스트 (전체 validation pipeline)
- 성능 테스트 (벤치마크)

---

## 📊 성과 지표

### 개선 전

| 지표 | 값 |
|------|-----|
| Test Coverage | ~5% |
| Error Handling | 불일관 |
| Config Validation | 없음 |
| Largest File | 1,329 lines |
| Performance (1000 files) | 10s+ |
| Parse Error Detection | 없음 |
| Documentation | 미흡 |

### 개선 후 (목표)

| 지표 | 값 |
|------|-----|
| Test Coverage | 60%+ |
| Error Handling | 일관됨 ✅ |
| Config Validation | Zod ✅ |
| Largest File | <300 lines |
| Performance (1000 files) | 3s ✅ |
| Parse Error Detection | 완전 ✅ |
| Documentation | JSDoc ✅ |

---

## 🔄 구현 중 체크리스트

### TIER 1

- [ ] Create `src/errors/EdgeDocError.ts`
- [ ] Create `src/errors/index.ts`
- [ ] Update `types/config.ts` with Zod schema
- [ ] Update `utils/config.ts` with validation
- [ ] Update `parsers/ILanguageParser.ts` with ParseError
- [ ] Update `parsers/TypeScriptParser.ts` to return errors
- [ ] Update `parsers/PythonParser.ts` to return errors
- [ ] Create `parsers/QueryCache.ts`
- [ ] Update `parsers/TypeScriptParser.ts` to use cache
- [ ] Update `parsers/PythonParser.ts` to use cache
- [ ] Update `index.ts` (MCP) to use Node.js
- [ ] Add tests for TIER 1 components
- [ ] Update documentation
- [ ] Create release notes for v1.3.1

### TIER 2

- [ ] Create `src/commands/` directory structure
- [ ] Refactor `cli.ts` command registration
- [ ] Extract validate subcommands
- [ ] Extract sync command
- [ ] Extract docs command
- [ ] Extract terms command
- [ ] Extract analyze command
- [ ] Create `shared/logger.ts`
- [ ] Add logger to all modules
- [ ] Install `js-yaml` dependency
- [ ] Implement `extractFrontmatter()` with YAML
- [ ] Update structure validation
- [ ] Improve orphan detection
- [ ] Implement incremental indexing
- [ ] Add performance tests
- [ ] Update documentation
- [ ] Create release notes for v1.4.0

---

## 🚀 시작하기

### 1단계: 환경 설정

```bash
cd /Users/junwoobang/project/mdoc-tools

# 현재 상태 확인
npm test                    # 기존 테스트 실행
npm run build              # 빌드 확인
npm run validate:all       # EdgeDoc 검증

# 성능 벤치마크 (현재 상태)
time npm run graph build   # 참조 인덱스 빌드 시간 측정
```

### 2단계: TIER 1 구현

```bash
# Feature branch 생성
git checkout -b feature/tier1-improvements

# TIER 1 작업 시작
# 1. Error system
# 2. Config validation
# ...

# 커밋
git add .
git commit -m "feat: implement error system and config validation"

# 테스트 실행
npm test
npm run validate:all

# PR 생성
gh pr create --title "TIER 1: Stability improvements"
```

---

## 📝 각 팀원의 책임 분배 (다인 팀 기준)

| 팀원 | TIER 1 | TIER 2 | TIER 3 |
|------|---------|---------|---------|
| 개발자 A | Error system, Config validation | CLI modules | Worker Threads |
| 개발자 B | Parser errors, Query caching | YAML parsing, Logging | Plugins |
| 개발자 C | MCP fix, Tests | Orphan detection | Streaming |
| 팀 리드 | Code review | Refactoring guide | Architecture review |

---

## 💡 주요 교훈

### 현재 코드의 강점
✅ 깔끔한 아키텍처 (레이어 분리)
✅ 타입 안전성 (TypeScript)
✅ Tree-sitter 활용 (regex 대신)
✅ 포괄적인 기능 세트

### 개선이 필요한 부분
⚠️ 에러 처리 (일관성, 무음화)
⚠️ 설정 검증 (부재)
⚠️ 테스트 커버리지 (5%)
⚠️ 큰 파일 (cli.ts 1,300줄)
⚠️ 성능 (대규모 프로젝트 느림)

### 우선순위 결정 기준
1. **임팩트:** 사용자 영향도 높음 (에러 처리, 성능)
2. **난이도:** 구현 복잡도 (복잡한 것부터 X)
3. **의존성:** 다른 작업의 기초가 됨 (에러 시스템 먼저)

---

## 📚 참고 자료

- **Tree-sitter Query API:** https://tree-sitter.github.io/tree-sitter/queries
- **Zod Documentation:** https://zod.dev
- **Node.js Worker Threads:** https://nodejs.org/api/worker_threads.html
- **Commander.js Guide:** https://github.com/tj/commander.js

---

**다음 단계:** TIER 1 구현 시작
