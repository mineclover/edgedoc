import { describe, it, expect, beforeEach } from 'vitest';
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import {
  QueryCache,
  getGlobalQueryCache,
  resetGlobalQueryCache,
} from '../../src/parsers/QueryCache';

describe('QueryCache', () => {
  let cache: QueryCache;
  const language = TypeScript.typescript as unknown as Parser.Language;
  const query1 = `(import_statement)`;
  const query2 = `(export_statement)`;

  beforeEach(() => {
    cache = new QueryCache();
  });

  it('should cache queries', () => {
    const q1 = cache.getQuery(language, query1);
    const q2 = cache.getQuery(language, query1);

    // 같은 참조인지 확인 (캐시 히트)
    expect(q1).toBe(q2);
  });

  it('should track cache statistics', () => {
    cache.getQuery(language, query1); // miss
    cache.getQuery(language, query1); // hit
    cache.getQuery(language, query1); // hit
    cache.getQuery(language, query2); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.size).toBe(2);
  });

  it('should clear cache', () => {
    cache.getQuery(language, query1);
    cache.clear();

    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
  });

  it('should work with global cache', () => {
    resetGlobalQueryCache();
    const global1 = getGlobalQueryCache();
    const global2 = getGlobalQueryCache();

    expect(global1).toBe(global2);
  });
});
