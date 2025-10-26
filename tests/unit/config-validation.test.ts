import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../../src/utils/config';
import { EdgeDocError, ErrorCode } from '../../src/errors/index';

const TEST_DIR = join(__dirname, '../../test-fixtures');

describe('Config Validation', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  it('should load valid config', () => {
    const config = {
      language: 'ko',
      docs: { baseDir: 'docs' },
    };
    writeFileSync(
      join(TEST_DIR, 'mdoc.config.json'),
      JSON.stringify(config)
    );

    const loaded = loadConfig(TEST_DIR);
    expect(loaded.language).toBe('ko');
  });

  it('should throw on invalid JSON', () => {
    writeFileSync(join(TEST_DIR, 'mdoc.config.json'), '{invalid json}');

    expect(() => loadConfig(TEST_DIR)).toThrow(EdgeDocError);
  });

  it('should provide helpful error message for invalid schema', () => {
    const config = { language: 'invalid' };
    writeFileSync(
      join(TEST_DIR, 'mdoc.config.json'),
      JSON.stringify(config)
    );

    try {
      loadConfig(TEST_DIR);
      expect.fail('Should have thrown EdgeDocError');
    } catch (error) {
      expect(error).toBeInstanceOf(EdgeDocError);
      const e = error as EdgeDocError;
      expect(e.code).toBe(ErrorCode.CONFIG_SCHEMA_VIOLATION);
      expect(e.context.suggestion).toBeTruthy();
    }
  });

  it('should use defaults when config file missing', () => {
    const config = loadConfig(TEST_DIR);
    expect(config.language).toBe('en');
    expect(config.docs?.baseDir).toBe('edgedoc');
  });
});
