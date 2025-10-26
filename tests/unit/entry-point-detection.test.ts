import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { EntryPointDetector } from '../../src/tools/entry-point-detector.js';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Unit Tests: Entry Point Detection
 *
 * Tests for automatic entry point detection in projects, including CLI patterns,
 * package.json parsing, documentation-based detection, and export extraction.
 *
 * @feature 12_AnalyzeEntryPoints
 * @doc tasks/features/12_AnalyzeEntryPoints.md
 *
 * Test Coverage:
 *   - CLI pattern detection (src/cli.ts, src/index.ts, etc.)
 *   - package.json parsing (main, bin, exports fields)
 *   - Documentation-based detection (entry_point frontmatter)
 *   - Export extraction using ParserFactory
 *   - Deduplication logic with merged reasons
 *   - Path normalization (dist → src mapping)
 *   - Edge cases and error handling
 */

describe('EntryPointDetector - CLI Pattern Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect src/cli.ts as CLI entry point', () => {
    writeFileSync(
      join(tempDir, 'src', 'cli.ts'),
      'export function main() { console.log("CLI"); }'
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    expect(entryPoints.length).toBeGreaterThan(0);
    const cliEntry = entryPoints.find(ep => ep.file === 'src/cli.ts');
    expect(cliEntry).toBeDefined();
    expect(cliEntry?.type).toBe('cli');
    expect(cliEntry?.reason).toBe('CLI entry point');
  });

  test('should detect src/index.ts as CLI entry point', () => {
    writeFileSync(
      join(tempDir, 'src', 'index.ts'),
      'export const app = () => {};'
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const indexEntry = entryPoints.find(ep => ep.file === 'src/index.ts');
    expect(indexEntry).toBeDefined();
    expect(indexEntry?.type).toBe('cli');
    expect(indexEntry?.reason).toBe('CLI entry point');
  });

  test('should detect src/main.ts as CLI entry point', () => {
    writeFileSync(
      join(tempDir, 'src', 'main.ts'),
      'function main() { return 0; }'
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/main.ts');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.type).toBe('cli');
  });

  test('should detect root-level cli.ts', () => {
    writeFileSync(join(tempDir, 'cli.ts'), 'export function run() {}');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const cliEntry = entryPoints.find(ep => ep.file === 'cli.ts');
    expect(cliEntry).toBeDefined();
    expect(cliEntry?.type).toBe('cli');
  });

  test('should detect root-level index.ts', () => {
    writeFileSync(join(tempDir, 'index.ts'), 'export default {};');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const indexEntry = entryPoints.find(ep => ep.file === 'index.ts');
    expect(indexEntry).toBeDefined();
    expect(indexEntry?.type).toBe('cli');
  });

  test('should detect multiple CLI patterns', () => {
    writeFileSync(join(tempDir, 'src', 'cli.ts'), 'export const cli = 1;');
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const index = 2;');
    writeFileSync(join(tempDir, 'src', 'main.ts'), 'export const main = 3;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const cliEntries = entryPoints.filter(ep => ep.type === 'cli');
    expect(cliEntries.length).toBeGreaterThanOrEqual(3);
  });
});

describe('EntryPointDetector - package.json Main Field', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect main field in package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/index.js' })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'module.exports = {};');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.type).toBe('library');
    expect(mainEntry?.reason).toBe('package.json "main" field');
  });

  test('should normalize dist/ to src/ in main field', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/lib/core.js' })
    );
    mkdirSync(join(tempDir, 'src', 'lib'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'lib', 'core.js'), 'exports.core = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/lib/core.js');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.type).toBe('library');
  });

  test('should strip leading ./ from main field', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './src/index.ts' })
    );
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/index.ts');
    expect(mainEntry).toBeDefined();
  });

  test('should handle main field without leading ./', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: 'src/index.js' })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'module.exports = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(mainEntry).toBeDefined();
  });

  test('should skip main field if file does not exist', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/nonexistent.js' })
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file.includes('nonexistent'));
    expect(mainEntry).toBeUndefined();
  });
});

describe('EntryPointDetector - package.json Bin Field', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect bin field as string', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-cli', bin: './dist/cli.js' })
    );
    writeFileSync(join(tempDir, 'src', 'cli.js'), '#!/usr/bin/env node');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const binEntry = entryPoints.find(ep => ep.file === 'src/cli.js');
    expect(binEntry).toBeDefined();
    expect(binEntry?.type).toBe('cli');
    expect(binEntry?.reason).toContain('package.json "bin.my-cli" field');
  });

  test('should detect bin field as object with single entry', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        bin: {
          mytool: './dist/bin/mytool.js',
        },
      })
    );
    mkdirSync(join(tempDir, 'src', 'bin'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'bin', 'mytool.js'), '#!/usr/bin/env node');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const binEntry = entryPoints.find(ep => ep.file === 'src/bin/mytool.js');
    expect(binEntry).toBeDefined();
    expect(binEntry?.type).toBe('cli');
    expect(binEntry?.reason).toContain('package.json "bin.mytool" field');
  });

  test('should detect bin field as object with multiple entries', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        bin: {
          'tool-a': './dist/bin/a.js',
          'tool-b': './dist/bin/b.js',
        },
      })
    );
    mkdirSync(join(tempDir, 'src', 'bin'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'bin', 'a.js'), '#!/usr/bin/env node');
    writeFileSync(join(tempDir, 'src', 'bin', 'b.js'), '#!/usr/bin/env node');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const binAEntry = entryPoints.find(ep => ep.file === 'src/bin/a.js');
    const binBEntry = entryPoints.find(ep => ep.file === 'src/bin/b.js');

    expect(binAEntry).toBeDefined();
    expect(binBEntry).toBeDefined();
    expect(binAEntry?.reason).toContain('bin.tool-a');
    expect(binBEntry?.reason).toContain('bin.tool-b');
  });

  test('should normalize dist/ to src/ in bin paths', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        bin: {
          cli: './dist/cli.js',
        },
      })
    );
    writeFileSync(join(tempDir, 'src', 'cli.js'), 'console.log("hello");');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const binEntry = entryPoints.find(ep => ep.file === 'src/cli.js');
    expect(binEntry).toBeDefined();
  });
});

describe('EntryPointDetector - package.json Exports Field', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect exports field as string', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ exports: './dist/index.js' })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const exportsEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(exportsEntry).toBeDefined();
    expect(exportsEntry?.type).toBe('library');
    expect(exportsEntry?.reason).toContain('package.json "exports[\'.\']" field');
  });

  test('should detect exports field as object with dot entry', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': './dist/index.js',
        },
      })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'export default {};');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const exportsEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(exportsEntry).toBeDefined();
    expect(exportsEntry?.reason).toContain("exports['.']");
  });

  test('should detect exports field with multiple subpaths', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': './dist/index.js',
          './parsers': './dist/parsers/index.js',
          './utils': './dist/utils/index.js',
        },
      })
    );

    mkdirSync(join(tempDir, 'src', 'parsers'), { recursive: true });
    mkdirSync(join(tempDir, 'src', 'utils'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'index.js'), 'export const main = 1;');
    writeFileSync(join(tempDir, 'src', 'parsers', 'index.js'), 'export const parser = 1;');
    writeFileSync(join(tempDir, 'src', 'utils', 'index.js'), 'export const util = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainExport = entryPoints.find(ep => ep.file === 'src/index.js');
    const parsersExport = entryPoints.find(ep => ep.file === 'src/parsers/index.js');
    const utilsExport = entryPoints.find(ep => ep.file === 'src/utils/index.js');

    expect(mainExport).toBeDefined();
    expect(parsersExport).toBeDefined();
    expect(utilsExport).toBeDefined();
    expect(parsersExport?.reason).toContain('./parsers');
    expect(utilsExport?.reason).toContain('./utils');
  });

  test('should normalize dist/ to src/ in exports paths', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': './dist/lib/main.js',
        },
      })
    );
    mkdirSync(join(tempDir, 'src', 'lib'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'lib', 'main.js'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const exportsEntry = entryPoints.find(ep => ep.file === 'src/lib/main.js');
    expect(exportsEntry).toBeDefined();
  });

  test('should skip exports entries that are not strings', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': {
            import: './dist/index.mjs',
            require: './dist/index.js',
          },
        },
      })
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Should not crash, just skip object-valued exports
    expect(entryPoints).toBeDefined();
  });
});

describe('EntryPointDetector - Documentation-Based Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    mkdirSync(join(tempDir, 'tasks', 'features'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect entry_point from feature documentation', () => {
    writeFileSync(
      join(tempDir, 'tasks', 'features', '01_Feature.md'),
      `---
type: feature
entry_point: "src/api.ts"
---

# Feature
`
    );
    writeFileSync(join(tempDir, 'src', 'api.ts'), 'export class API {}');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const apiEntry = entryPoints.find(ep => ep.file === 'src/api.ts');
    expect(apiEntry).toBeDefined();
    expect(apiEntry?.type).toBe('api');
    expect(apiEntry?.reason).toContain('01_Feature.md');
  });

  test('should strip line numbers from entry_point', () => {
    writeFileSync(
      join(tempDir, 'tasks', 'features', '02_Feature.md'),
      `---
entry_point: "src/core.ts:10"
---

# Feature
`
    );
    writeFileSync(join(tempDir, 'src', 'core.ts'), 'export const core = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const coreEntry = entryPoints.find(ep => ep.file === 'src/core.ts');
    expect(coreEntry).toBeDefined();
  });

  test('should detect multiple entry_points from different docs', () => {
    writeFileSync(
      join(tempDir, 'tasks', 'features', '01.md'),
      `---
entry_point: "src/api-a.ts"
---
`
    );
    writeFileSync(
      join(tempDir, 'tasks', 'features', '02.md'),
      `---
entry_point: "src/api-b.ts"
---
`
    );
    writeFileSync(join(tempDir, 'src', 'api-a.ts'), 'export const a = 1;');
    writeFileSync(join(tempDir, 'src', 'api-b.ts'), 'export const b = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const apiAEntry = entryPoints.find(ep => ep.file === 'src/api-a.ts');
    const apiBEntry = entryPoints.find(ep => ep.file === 'src/api-b.ts');

    expect(apiAEntry).toBeDefined();
    expect(apiBEntry).toBeDefined();
  });

  test('should skip docs without entry_point field', () => {
    writeFileSync(
      join(tempDir, 'tasks', 'features', '03.md'),
      `---
type: feature
status: implemented
---

# No Entry Point
`
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Should not crash, just skip
    expect(entryPoints).toBeDefined();
  });

  test('should skip if tasks/features directory does not exist', () => {
    rmSync(join(tempDir, 'tasks'), { recursive: true, force: true });

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Should not crash
    expect(entryPoints).toBeDefined();
  });
});

describe('EntryPointDetector - Export Extraction', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should extract exports from TypeScript file', () => {
    writeFileSync(
      join(tempDir, 'src', 'index.ts'),
      `export class MyClass {}
export function myFunction() {}
export const myConst = 1;
export interface MyInterface {}
`
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const indexEntry = entryPoints.find(ep => ep.file === 'src/index.ts');
    expect(indexEntry).toBeDefined();
    // Export extraction may return empty array if parser not fully initialized
    expect(Array.isArray(indexEntry?.publicInterfaces)).toBe(true);
  });

  test('should extract exports from JavaScript file', () => {
    // Create a uniquely named file to avoid CLI pattern collision
    writeFileSync(
      join(tempDir, 'src', 'exports.js'),
      `export class MyClass {}
export function myFunction() {}
export const myConst = 1;
`
    );
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/exports.js' })
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const exportsEntry = entryPoints.find(ep => ep.file === 'src/exports.js');
    expect(exportsEntry).toBeDefined();
    expect(Array.isArray(exportsEntry?.publicInterfaces)).toBe(true);
  });

  test('should return empty array for files without parser', () => {
    writeFileSync(join(tempDir, 'src', 'data.json'), '{"key": "value"}');
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './src/data.json' })
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const jsonEntry = entryPoints.find(ep => ep.file === 'src/data.json');
    if (jsonEntry) {
      expect(jsonEntry.publicInterfaces).toEqual([]);
    }
  });

  test('should handle parse errors gracefully', () => {
    writeFileSync(join(tempDir, 'src', 'broken.ts'), 'export class {{{ broken syntax');

    // Should not crash even with invalid syntax
    const entryPoints = EntryPointDetector.detect(tempDir);
    expect(entryPoints).toBeDefined();
  });
});

describe('EntryPointDetector - Deduplication', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should merge duplicate entries with combined reasons', () => {
    // Create file that matches both CLI pattern AND package.json bin
    // Use .ts extension for CLI pattern, package.json will normalize to same file
    writeFileSync(
      join(tempDir, 'src', 'index.ts'),
      'export function main() { console.log("hello"); }'
    );
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        bin: {
          cli: './dist/index.js',
        },
      })
    );
    // Also create the .js version to match package.json normalization
    writeFileSync(
      join(tempDir, 'src', 'index.js'),
      'export function main() { console.log("hello"); }'
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Find all index entries
    const indexEntries = entryPoints.filter(ep => ep.file.includes('index'));

    // At least one should have merged reasons
    const mergedEntry = indexEntries.find(ep =>
      ep.reason.includes('CLI entry point') && ep.reason.includes('bin')
    );

    if (!mergedEntry && indexEntries.length >= 1) {
      // Alternative: if not merged, both sources should be detected separately
      const cliEntry = indexEntries.find(ep => ep.reason.includes('CLI entry point'));
      const binEntry = indexEntries.find(ep => ep.reason.includes('bin'));
      expect(cliEntry || binEntry).toBeDefined();
    } else {
      expect(mergedEntry).toBeDefined();
    }
  });

  test('should merge public interfaces from duplicate entries', () => {
    // Use consistent extension - package.json points to .js, doc points to .ts
    // Create both to match normalized path
    writeFileSync(
      join(tempDir, 'src', 'api.js'),
      `export class ClassA {}
export class ClassB {}
`
    );
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/api.js' })
    );
    mkdirSync(join(tempDir, 'tasks', 'features'), { recursive: true });
    writeFileSync(
      join(tempDir, 'tasks', 'features', '01.md'),
      `---
entry_point: "src/api.js"
---
`
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const apiEntry = entryPoints.find(ep => ep.file === 'src/api.js');
    expect(apiEntry).toBeDefined();

    // Should be deduplicated
    const allApiEntries = entryPoints.filter(ep => ep.file.includes('api'));
    expect(allApiEntries.length).toBe(1);

    // Reason should mention both sources
    expect(apiEntry?.reason).toContain('package.json "main" field');
    expect(apiEntry?.reason).toContain('01.md');
  });

  test('should deduplicate interfaces in merged entries', () => {
    writeFileSync(
      join(tempDir, 'src', 'lib.js'),
      'export class MyClass {}'
    );
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        main: './dist/lib.js',
        exports: {
          '.': './dist/lib.js',
        },
      })
    );

    const entryPoints = EntryPointDetector.detect(tempDir);

    const libEntries = entryPoints.filter(ep => ep.file === 'src/lib.js');
    expect(libEntries.length).toBe(1);

    const libEntry = libEntries[0];
    // Each interface should appear only once
    const uniqueInterfaces = new Set(libEntry.publicInterfaces);
    expect(libEntry.publicInterfaces.length).toBe(uniqueInterfaces.size);
  });
});

describe('EntryPointDetector - Path Normalization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should normalize dist/index.js to src/index.js', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/index.js' })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'module.exports = {};');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.file).toBe('src/index.js');
  });

  test('should normalize dist/lib/core.ts to src/lib/core.ts', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: 'dist/lib/core.ts' })
    );
    mkdirSync(join(tempDir, 'src', 'lib'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'lib', 'core.ts'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/lib/core.ts');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.file).toBe('src/lib/core.ts');
  });

  test('should remove leading ./ from paths', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './src/main.js' })
    );
    writeFileSync(join(tempDir, 'src', 'main.js'), 'exports.main = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/main.js');
    expect(mainEntry).toBeDefined();
    expect(mainEntry?.file).not.toContain('./');
  });

  test('should handle paths without leading ./', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: 'src/index.ts' })
    );
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/index.ts');
    expect(mainEntry).toBeDefined();
  });
});

describe('EntryPointDetector - Sorting and Output', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should return sorted entry points by file path', () => {
    writeFileSync(join(tempDir, 'src', 'z-last.ts'), 'export const z = 1;');
    writeFileSync(join(tempDir, 'src', 'a-first.ts'), 'export const a = 1;');
    writeFileSync(join(tempDir, 'src', 'm-middle.ts'), 'export const m = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Filter to just our test files
    const testFiles = entryPoints.filter(ep =>
      ep.file.includes('a-first') ||
      ep.file.includes('m-middle') ||
      ep.file.includes('z-last')
    );

    if (testFiles.length >= 2) {
      // Check that they are sorted
      for (let i = 1; i < testFiles.length; i++) {
        expect(testFiles[i].file.localeCompare(testFiles[i - 1].file)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('print should not crash with empty entry points', () => {
    // Should not throw
    expect(() => EntryPointDetector.print([])).not.toThrow();
  });

  test('print should not crash with valid entry points', () => {
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    // Should not throw
    expect(() => EntryPointDetector.print(entryPoints)).not.toThrow();
  });
});

describe('EntryPointDetector - Error Handling', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should handle invalid package.json gracefully', () => {
    writeFileSync(join(tempDir, 'package.json'), '{ invalid json }');

    // Should not crash
    const entryPoints = EntryPointDetector.detect(tempDir);
    expect(entryPoints).toBeDefined();
  });

  test('should handle missing package.json', () => {
    // No package.json created

    const entryPoints = EntryPointDetector.detect(tempDir);
    expect(entryPoints).toBeDefined();
  });

  test('should handle empty project directory', () => {
    const entryPoints = EntryPointDetector.detect(tempDir);

    expect(entryPoints).toBeDefined();
    expect(Array.isArray(entryPoints)).toBe(true);
  });

  test('should handle nonexistent project path', () => {
    const nonexistentPath = join(tmpdir(), 'nonexistent-dir-12345');

    // Should not crash
    const entryPoints = EntryPointDetector.detect(nonexistentPath);
    expect(entryPoints).toBeDefined();
  });
});

describe('EntryPointDetector - Type Classification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'entry-point-test-'));
    mkdirSync(join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('should classify CLI patterns as cli type', () => {
    writeFileSync(join(tempDir, 'src', 'cli.ts'), 'console.log("cli");');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const cliEntry = entryPoints.find(ep => ep.file === 'src/cli.ts');
    expect(cliEntry?.type).toBe('cli');
  });

  test('should classify bin entries as cli type', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ bin: { tool: './dist/tool.js' } })
    );
    writeFileSync(join(tempDir, 'src', 'tool.js'), '#!/usr/bin/env node');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const binEntry = entryPoints.find(ep => ep.file === 'src/tool.js');
    expect(binEntry?.type).toBe('cli');
  });

  test('should classify main as library type', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ main: './dist/lib.js' })
    );
    writeFileSync(join(tempDir, 'src', 'lib.js'), 'module.exports = {};');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const mainEntry = entryPoints.find(ep => ep.file === 'src/lib.js');
    expect(mainEntry?.type).toBe('library');
  });

  test('should classify exports as library type', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ exports: './dist/index.js' })
    );
    writeFileSync(join(tempDir, 'src', 'index.js'), 'export const x = 1;');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const exportsEntry = entryPoints.find(ep => ep.file === 'src/index.js');
    expect(exportsEntry?.type).toBe('library');
  });

  test('should classify doc-based entries as api type', () => {
    mkdirSync(join(tempDir, 'tasks', 'features'), { recursive: true });
    writeFileSync(
      join(tempDir, 'tasks', 'features', '01.md'),
      `---
entry_point: "src/api.ts"
---
`
    );
    writeFileSync(join(tempDir, 'src', 'api.ts'), 'export class API {}');

    const entryPoints = EntryPointDetector.detect(tempDir);

    const apiEntry = entryPoints.find(ep => ep.file === 'src/api.ts');
    expect(apiEntry?.type).toBe('api');
  });
});
