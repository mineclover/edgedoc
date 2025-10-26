# TIER 2 구현 가이드: 아키텍처 개선 및 기능 확장

**목표:** 확장성, 유지보수성 강화 (1주일)
**영향도:** 높음
**총 소요시간:** 8시간
**상태:** 🚧 **진행 중** (2025-10-27)

---

## 📋 작업 목록

- [ ] 1단계: CLI 아키텍처 재설계 (2.5시간)
- [ ] 2단계: 로깅 인프라 구축 (1.5시간)
- [ ] 3단계: YAML 파서 추가 (1.5시간)
- [ ] 4단계: 성능 최적화 (1.5시간)
- [ ] 5단계: 테스트 커버리지 확대 (1시간)

---

## 1단계: CLI 아키텍처 재설계 (2.5시간)

### 목표
현재 `src/cli.ts`가 모든 명령어를 직접 처리하고 있어 유지보수가 어려움. 명령어별로 모듈을 분리하여 확장성과 테스트 가능성을 향상시킵니다.

### 1.1 새 디렉토리 구조: `src/commands/`

```
src/
├── commands/
│   ├── index.ts                 # Command registry
│   ├── validate/
│   │   ├── index.ts            # validate 명령어 메인
│   │   ├── migration.ts        # validate migration
│   │   ├── naming.ts           # validate naming
│   │   ├── interfaces.ts       # validate interfaces
│   │   ├── orphans.ts          # validate orphans
│   │   ├── structure.ts        # validate structure
│   │   └── all.ts              # validate all
│   ├── graph/
│   │   ├── index.ts            # graph 명령어 메인
│   │   ├── build.ts            # graph build
│   │   └── query.ts            # graph query
│   ├── terms/
│   │   ├── index.ts            # terms 명령어 메인
│   │   ├── validate.ts         # terms validate
│   │   ├── list.ts             # terms list
│   │   └── find.ts             # terms find
│   ├── tasks/
│   │   ├── index.ts            # tasks 명령어 메인
│   │   ├── list.ts             # tasks list
│   │   ├── get.ts              # tasks get
│   │   └── progress.ts         # tasks progress
│   └── docs/
│       ├── index.ts            # docs 명령어 메인
│       ├── list.ts             # docs list
│       ├── open.ts             # docs open
│       └── close.ts            # docs close
└── cli.ts                       # CLI 진입점 (단순화됨)
```

### 1.2 새 파일 생성: `src/commands/base.ts`

```typescript
import { Command } from 'commander';
import { MdocConfig } from '../types/config.js';
import { loadConfig, getDefaultConfig } from '../utils/config.js';
import { EdgeDocError, ErrorCode, ErrorSeverity } from '../errors/index.js';

/**
 * 기본 명령어 옵션
 */
export interface BaseCommandOptions {
  project?: string;
  verbose?: boolean;
  config?: string;
}

/**
 * 명령어 컨텍스트
 */
export interface CommandContext {
  projectPath: string;
  config: MdocConfig;
  verbose: boolean;
}

/**
 * 명령어 핸들러 타입
 */
export type CommandHandler<T = any> = (
  context: CommandContext,
  options: T
) => Promise<void>;

/**
 * 기본 명령어 클래스
 */
export abstract class BaseCommand {
  protected command: Command;

  constructor(name: string, description: string) {
    this.command = new Command(name).description(description);
    this.setupOptions();
    this.setupAction();
  }

  /**
   * 공통 옵션 설정
   */
  protected setupOptions(): void {
    this.command
      .option('-p, --project <path>', 'Project directory path', process.cwd())
      .option('-v, --verbose', 'Verbose output', false)
      .option('-c, --config <path>', 'Config file path');
  }

  /**
   * 커스텀 옵션 추가 (서브클래스에서 오버라이드)
   */
  protected addCustomOptions(): void {
    // Override in subclasses
  }

  /**
   * 액션 설정
   */
  protected setupAction(): void {
    this.addCustomOptions();
    this.command.action(async (options: BaseCommandOptions) => {
      try {
        const context = await this.createContext(options);
        await this.execute(context, options);
      } catch (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * 컨텍스트 생성
   */
  protected async createContext(
    options: BaseCommandOptions
  ): Promise<CommandContext> {
    const projectPath = options.project || process.cwd();

    let config: MdocConfig;
    try {
      config = loadConfig(projectPath);
    } catch (error) {
      if (error instanceof EdgeDocError && error.code === ErrorCode.CONFIG_NOT_FOUND) {
        // 설정 파일이 없으면 기본값 사용
        config = getDefaultConfig();
      } else {
        throw error;
      }
    }

    return {
      projectPath,
      config,
      verbose: options.verbose || false,
    };
  }

  /**
   * 명령어 실행 (서브클래스에서 구현)
   */
  protected abstract execute(
    context: CommandContext,
    options: any
  ): Promise<void>;

  /**
   * 에러 처리
   */
  protected handleError(error: unknown): void {
    if (error instanceof EdgeDocError) {
      console.error(error.formatMessage());
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    } else {
      console.error(`❌ Unknown error: ${String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Commander 명령어 반환
   */
  getCommand(): Command {
    return this.command;
  }
}
```

### 1.3 예시: `src/commands/validate/migration.ts`

```typescript
import { BaseCommand, CommandContext } from '../base.js';
import { validateMigration } from '../../tools/validate-migration.js';

interface MigrationOptions {
  markdown?: boolean;
}

export class MigrationCommand extends BaseCommand {
  constructor() {
    super('migration', 'Validate migration progress (tasks → tasks-v2)');
  }

  protected addCustomOptions(): void {
    this.command.option('-m, --markdown', 'Generate markdown report', false);
  }

  protected async execute(
    context: CommandContext,
    options: MigrationOptions
  ): Promise<void> {
    const { projectPath, config, verbose } = context;

    if (verbose) {
      console.log(`🔍 Validating migration in: ${projectPath}`);
    }

    const result = await validateMigration(projectPath, {
      generateMarkdown: options.markdown,
      config,
      logger: verbose ? console : undefined,
    });

    // 결과 출력
    console.log(result.summary);

    if (result.errors.length > 0) {
      console.error('\n❌ Validation failed');
      process.exit(1);
    }

    console.log('\n✅ Validation passed');
  }
}
```

### 1.4 파일 수정: `src/commands/validate/index.ts`

```typescript
import { Command } from 'commander';
import { MigrationCommand } from './migration.js';
import { NamingCommand } from './naming.js';
import { InterfacesCommand } from './interfaces.js';
import { OrphansCommand } from './orphans.js';
import { StructureCommand } from './structure.js';
import { AllCommand } from './all.js';

export function createValidateCommand(): Command {
  const validate = new Command('validate')
    .description('Validation commands');

  // 서브 명령어 추가
  validate.addCommand(new MigrationCommand().getCommand());
  validate.addCommand(new NamingCommand().getCommand());
  validate.addCommand(new InterfacesCommand().getCommand());
  validate.addCommand(new OrphansCommand().getCommand());
  validate.addCommand(new StructureCommand().getCommand());
  validate.addCommand(new AllCommand().getCommand());

  return validate;
}
```

### 1.5 파일 수정: `src/cli.ts` (단순화)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { createValidateCommand } from './commands/validate/index.js';
import { createGraphCommand } from './commands/graph/index.js';
import { createTermsCommand } from './commands/terms/index.js';
import { createTasksCommand } from './commands/tasks/index.js';
import { createDocsCommand } from './commands/docs/index.js';

const program = new Command();

program
  .name('edgedoc')
  .description('Edge-based Documentation Validation & Sync Tool')
  .version('1.4.0');

// 명령어 등록
program.addCommand(createValidateCommand());
program.addCommand(createGraphCommand());
program.addCommand(createTermsCommand());
program.addCommand(createTasksCommand());
program.addCommand(createDocsCommand());

program.parse();
```

---

## 2단계: 로깅 인프라 구축 (1.5시간)

### 목표
구조화된 로깅 시스템을 추가하여 디버깅과 모니터링을 개선합니다.

### 2.1 새 파일 생성: `src/logger/index.ts`

```typescript
/**
 * 로깅 레벨
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * 로그 엔트리
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * 로거 인터페이스
 */
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}

/**
 * 콘솔 로거 구현
 */
export class ConsoleLogger implements ILogger {
  constructor(private minLevel: LogLevel = LogLevel.INFO) {}

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const levelIcon = this.getLevelIcon(entry.level);
    const time = entry.timestamp.toISOString();
    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : '';

    const logMessage = `${levelIcon} [${time}] ${entry.message}${contextStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '  ';
    }
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * 글로벌 로거 인스턴스
 */
let globalLogger: ILogger = new ConsoleLogger();

export function getLogger(): ILogger {
  return globalLogger;
}

export function setLogger(logger: ILogger): void {
  globalLogger = logger;
}

export function createLogger(minLevel: LogLevel = LogLevel.INFO): ILogger {
  return new ConsoleLogger(minLevel);
}
```

### 2.2 파일 수정: `src/commands/base.ts` (로거 통합)

```typescript
import { getLogger, ILogger, LogLevel, createLogger } from '../logger/index.js';

export interface CommandContext {
  projectPath: string;
  config: MdocConfig;
  verbose: boolean;
  logger: ILogger;  // 추가
}

export abstract class BaseCommand {
  // ...

  protected async createContext(
    options: BaseCommandOptions
  ): Promise<CommandContext> {
    const projectPath = options.project || process.cwd();

    // 로거 생성
    const logger = createLogger(
      options.verbose ? LogLevel.DEBUG : LogLevel.INFO
    );

    let config: MdocConfig;
    try {
      config = loadConfig(projectPath);
      logger.debug('Config loaded successfully', { projectPath });
    } catch (error) {
      if (error instanceof EdgeDocError && error.code === ErrorCode.CONFIG_NOT_FOUND) {
        logger.warn('Config file not found, using defaults');
        config = getDefaultConfig();
      } else {
        throw error;
      }
    }

    return {
      projectPath,
      config,
      verbose: options.verbose || false,
      logger,
    };
  }
}
```

### 2.3 테스트 파일: `tests/unit/logger.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleLogger, LogLevel } from '../../src/logger/index';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    logger = new ConsoleLogger(LogLevel.DEBUG);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
  });

  it('should log debug messages', () => {
    logger.debug('Debug message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should respect log level', () => {
    logger.setLevel(LogLevel.WARN);
    logger.info('Info message');
    expect(consoleLogSpy).not.toHaveBeenCalled();

    logger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should include context', () => {
    logger.info('Message', { key: 'value' });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('{"key":"value"}')
    );
  });
});
```

---

## 3단계: YAML 파서 추가 (1.5시간)

### 목표
JSON 외에 YAML 설정 파일도 지원하여 사용자 편의성을 높입니다.

### 3.1 의존성 추가

```bash
npm install js-yaml
npm install --save-dev @types/js-yaml
```

### 3.2 파일 수정: `src/utils/config.ts`

```typescript
import { readFileSync } from 'fs';
import { resolve, extname } from 'path';
import * as yaml from 'js-yaml';
import { MdocConfig, validateConfig, validateConfigSafe } from '../types/config.js';
import { EdgeDocError, ErrorCode, ErrorSeverity } from '../errors/index.js';

const CONFIG_NAMES = [
  'mdoc.config.json',
  'mdoc.config.yaml',
  'mdoc.config.yml',
  '.mdocrc.json',
  '.mdocrc.yaml',
  '.mdocrc.yml',
];

/**
 * 설정 파일 찾기
 */
function findConfigFile(projectPath: string): string | null {
  for (const name of CONFIG_NAMES) {
    const configPath = resolve(projectPath, name);
    try {
      readFileSync(configPath);
      return configPath;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 파일 내용 파싱 (JSON 또는 YAML)
 */
function parseConfigFile(filePath: string, content: string): unknown {
  const ext = extname(filePath);

  if (ext === '.json') {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new EdgeDocError(
        ErrorCode.CONFIG_INVALID,
        'Invalid JSON in configuration file',
        ErrorSeverity.ERROR,
        {
          file: filePath,
          suggestion: 'Check JSON syntax (use jsonlint or JSON formatter)',
        }
      );
    }
  }

  if (ext === '.yaml' || ext === '.yml') {
    try {
      return yaml.load(content);
    } catch (error) {
      throw new EdgeDocError(
        ErrorCode.CONFIG_INVALID,
        'Invalid YAML in configuration file',
        ErrorSeverity.ERROR,
        {
          file: filePath,
          suggestion: 'Check YAML syntax (use yamllint or YAML formatter)',
        }
      );
    }
  }

  throw new EdgeDocError(
    ErrorCode.CONFIG_INVALID,
    `Unsupported config file extension: ${ext}`,
    ErrorSeverity.ERROR,
    {
      file: filePath,
      suggestion: 'Use .json, .yaml, or .yml extension',
    }
  );
}

/**
 * 설정 파일 로드 및 검증
 */
export function loadConfig(projectPath: string): MdocConfig {
  const configPath = findConfigFile(projectPath);

  if (!configPath) {
    throw new EdgeDocError(
      ErrorCode.CONFIG_NOT_FOUND,
      `Configuration file not found in: ${projectPath}`,
      ErrorSeverity.ERROR,
      {
        suggestion: `Create one of: ${CONFIG_NAMES.join(', ')} or run: edgedoc init`,
      }
    );
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new EdgeDocError(
      ErrorCode.FILE_READ_ERROR,
      `Failed to read configuration file: ${configPath}`,
      ErrorSeverity.ERROR,
      { file: configPath }
    );
  }

  const parsedConfig = parseConfigFile(configPath, rawContent);

  // Zod 검증
  const validationResult = validateConfigSafe(parsedConfig);
  if (!validationResult.success) {
    const errorDetails = validationResult.errors
      ?.map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n') || 'Unknown validation error';

    throw new EdgeDocError(
      ErrorCode.CONFIG_SCHEMA_VIOLATION,
      `Configuration validation failed:\n${errorDetails}`,
      ErrorSeverity.ERROR,
      {
        file: configPath,
        suggestion: 'Run: edgedoc init --help for valid configuration options',
      }
    );
  }

  return validationResult.data!;
}

// getDefaultConfig()는 기존과 동일
```

### 3.3 테스트 파일: `tests/unit/yaml-config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../../src/utils/config';

const TEST_DIR = join(__dirname, '../../test-fixtures');

describe('YAML Config Support', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      unlinkSync(join(TEST_DIR, 'mdoc.config.yaml'));
    } catch (e) {
      // ignore
    }
  });

  it('should load YAML config', () => {
    const yamlConfig = `
language: ko
docs:
  baseDir: docs
code:
  baseDir: src
`;
    writeFileSync(join(TEST_DIR, 'mdoc.config.yaml'), yamlConfig);

    const loaded = loadConfig(TEST_DIR);
    expect(loaded.language).toBe('ko');
    expect(loaded.docs.baseDir).toBe('docs');
  });

  it('should throw on invalid YAML', () => {
    writeFileSync(join(TEST_DIR, 'mdoc.config.yaml'), '{ invalid: yaml:');
    expect(() => loadConfig(TEST_DIR)).toThrow();
  });
});
```

---

## 4단계: 성능 최적화 (1.5시간)

### 목표
대규모 프로젝트에서의 성능을 개선합니다.

### 4.1 파일 읽기 병렬화: `src/utils/file-reader.ts`

```typescript
import { readFile } from 'fs/promises';
import { EdgeDocError, ErrorCode, ErrorSeverity } from '../errors/index.js';

/**
 * 파일 병렬 읽기
 */
export async function readFilesParallel(
  filePaths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const errors: EdgeDocError[] = [];

  await Promise.allSettled(
    filePaths.map(async (filePath) => {
      try {
        const content = await readFile(filePath, 'utf-8');
        results.set(filePath, content);
      } catch (error) {
        errors.push(
          new EdgeDocError(
            ErrorCode.FILE_READ_ERROR,
            `Failed to read file: ${filePath}`,
            ErrorSeverity.WARNING,
            { file: filePath }
          )
        );
      }
    })
  );

  if (errors.length > 0) {
    // 경고로 기록하되 진행은 계속
    for (const error of errors) {
      console.warn(error.formatMessage());
    }
  }

  return results;
}

/**
 * 배치 단위로 파일 읽기 (메모리 절약)
 */
export async function readFilesBatched(
  filePaths: string[],
  batchSize: number = 50
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const batchResults = await readFilesParallel(batch);

    for (const [path, content] of batchResults) {
      results.set(path, content);
    }
  }

  return results;
}
```

### 4.2 캐시 전략 개선: `src/cache/index.ts`

```typescript
/**
 * LRU 캐시 구현
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // LRU: 접근한 항목을 맨 뒤로 이동
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key: K, value: V): void {
    // 이미 있으면 삭제 후 재추가
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 크기 제한 체크
    if (this.cache.size >= this.maxSize) {
      // 맨 앞(가장 오래된) 항목 삭제
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * 파일 내용 캐시 (전역)
 */
const fileContentCache = new LRUCache<string, string>(200);

export function getFileContentCache(): LRUCache<string, string> {
  return fileContentCache;
}
```

### 4.3 성능 벤치마크: `scripts/benchmark.ts`

```typescript
#!/usr/bin/env node
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { buildReferenceIndex } from '../src/tools/graph-build.js';

interface BenchmarkResult {
  name: string;
  duration: number;
  timestamp: string;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<void>
): Promise<BenchmarkResult> {
  const start = performance.now();
  await fn();
  const end = performance.now();

  return {
    name,
    duration: end - start,
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  console.log('🚀 Running benchmarks...\n');

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Reference index build
  results.push(
    await runBenchmark('graph-build', async () => {
      await buildReferenceIndex(process.cwd(), { verbose: false });
    })
  );

  // 결과 출력
  console.log('\n📊 Benchmark Results:\n');
  for (const result of results) {
    console.log(`  ${result.name}: ${result.duration.toFixed(2)}ms`);
  }

  // JSON 저장
  const outputPath = '.edgedoc/benchmark-tier2.json';
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${outputPath}`);
}

main();
```

---

## 5단계: 테스트 커버리지 확대 (1시간)

### 목표
기존 기능에 대한 테스트 커버리지를 30% 이상으로 높입니다.

### 5.1 테스트 유틸리티: `tests/utils/test-helpers.ts`

```typescript
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * 임시 테스트 프로젝트 생성
 */
export class TestProject {
  public readonly path: string;

  constructor(name: string = 'test-project') {
    this.path = join(__dirname, `../../test-fixtures/${name}`);
    mkdirSync(this.path, { recursive: true });
  }

  /**
   * 파일 작성
   */
  writeFile(relativePath: string, content: string): void {
    const fullPath = join(this.path, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
  }

  /**
   * 설정 파일 작성
   */
  writeConfig(config: any): void {
    this.writeFile('mdoc.config.json', JSON.stringify(config, null, 2));
  }

  /**
   * 정리
   */
  cleanup(): void {
    try {
      rmSync(this.path, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  }
}
```

### 5.2 추가 테스트 케이스

```typescript
// tests/unit/cli-commands.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestProject } from '../utils/test-helpers';
import { createValidateCommand } from '../../src/commands/validate/index';

describe('CLI Commands', () => {
  let project: TestProject;

  beforeEach(() => {
    project = new TestProject('cli-test');
  });

  afterEach(() => {
    project.cleanup();
  });

  it('should create validate command', () => {
    const cmd = createValidateCommand();
    expect(cmd.name()).toBe('validate');
  });

  // 더 많은 테스트...
});
```

### 5.3 커버리지 설정: `vitest.config.ts` 업데이트

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
});
```

### 5.4 커버리지 실행

```bash
# 커버리지 측정
npm run test:coverage

# HTML 리포트 열기
open coverage/index.html
```

---

## ✅ 테스트 및 검증

### 통합 테스트

```bash
# 1. 모든 TIER 2 테스트 실행
npm test

# 2. 커버리지 확인 (목표: 30%+)
npm run test:coverage

# 3. 성능 벤치마크
npm run benchmark

# 4. 빌드 확인
npm run build

# 5. CLI 기능 테스트
npm run dev validate migration
npm run dev graph build
npm run dev tasks list
```

### 매뉴얼 테스트

```bash
# YAML 설정 테스트
cat > mdoc.config.yaml << EOF
language: ko
docs:
  baseDir: edgedoc
code:
  baseDir: src
EOF

edgedoc validate structure

# 로깅 레벨 테스트
edgedoc validate migration --verbose

# 성능 테스트 (대규모 프로젝트)
time edgedoc graph build
```

---

## 📋 체크리스트

### 구현
- [ ] CLI 아키텍처 재설계
  - [ ] `src/commands/base.ts` 생성
  - [ ] `src/commands/validate/` 모듈 분리
  - [ ] `src/commands/graph/` 모듈 분리
  - [ ] `src/commands/terms/` 모듈 분리
  - [ ] `src/commands/tasks/` 모듈 분리
  - [ ] `src/commands/docs/` 모듈 분리
  - [ ] `src/cli.ts` 단순화
- [ ] 로깅 인프라
  - [ ] `src/logger/index.ts` 생성
  - [ ] BaseCommand에 로거 통합
  - [ ] 로거 테스트 작성
- [ ] YAML 파서
  - [ ] js-yaml 의존성 추가
  - [ ] config.ts 업데이트 (다중 포맷 지원)
  - [ ] YAML 테스트 작성
- [ ] 성능 최적화
  - [ ] 파일 병렬 읽기 구현
  - [ ] LRU 캐시 구현
  - [ ] 벤치마크 스크립트 작성
- [ ] 테스트 커버리지
  - [ ] 테스트 헬퍼 작성
  - [ ] CLI 명령어 테스트 추가
  - [ ] 커버리지 30% 이상 달성

### 문서화
- [ ] TIER2_CHANGES.md 작성
- [ ] API 문서 업데이트
- [ ] README.md 업데이트 (새 기능)

### 배포
- [ ] 모든 테스트 통과
- [ ] 커버리지 목표 달성
- [ ] 성능 기준선 설정
- [ ] 변경사항 커밋
- [ ] 버전 업데이트 (1.5.0)

---

## 🎯 성공 기준

### 코드 품질
- ✅ CLI 명령어가 모듈별로 분리됨
- ✅ 각 명령어가 독립적으로 테스트 가능
- ✅ 구조화된 로깅 시스템
- ✅ YAML 설정 지원

### 성능
- ✅ 그래프 빌드 시간: 기존 대비 30% 개선
- ✅ 파일 읽기: 병렬 처리로 50% 개선

### 테스트
- ✅ 테스트 커버리지 30% 이상
- ✅ 주요 명령어 100% 커버
- ✅ 에지 케이스 테스트 추가

---

## 🚀 TIER 3 준비

TIER 2 완료 후:

1. **문서 자동화**
   - 코드 → 문서 동기화
   - Frontmatter 자동 생성
   - 참조 자동 업데이트

2. **CI/CD 통합**
   - GitHub Actions 워크플로우
   - 자동 검증 및 리포트
   - PR 코멘트 봇

3. **웹 UI**
   - 대시보드
   - 실시간 검증
   - 그래프 시각화

---

**상태:** TIER 2 🚧 진행 중
**시작:** 2025-10-27
**예상 완료:** 2025-11-03
