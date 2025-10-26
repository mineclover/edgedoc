import Parser from 'tree-sitter';
import { createHash } from 'node:crypto';

/**
 * Tree-sitter 쿼리 캐싱
 *
 * 같은 쿼리를 여러 번 사용할 때 컴파일 오버헤드 제거
 */
export class QueryCache {
  private cache = new Map<string, Parser.Query>();
  private hitCount = 0;
  private missCount = 0;

  /**
   * 캐시에서 쿼리 가져오기 또는 생성
   */
  getQuery(language: Parser.Language, queryString: string): Parser.Query {
    const key = this.generateKey(language, queryString);

    if (this.cache.has(key)) {
      this.hitCount++;
      return this.cache.get(key)!;
    }

    this.missCount++;
    const query = new Parser.Query(language, queryString);
    this.cache.set(key, query);

    return query;
  }

  /**
   * 캐시 통계
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total === 0 ? 0 : (this.hitCount / total) * 100;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      total,
      hitRate: hitRate.toFixed(1),
      size: this.cache.size,
    };
  }

  /**
   * 캐시 비우기
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 개별 엔트리 제거
   */
  delete(language: Parser.Language, queryString: string): boolean {
    const key = this.generateKey(language, queryString);
    return this.cache.delete(key);
  }

  private generateKey(
    language: Parser.Language,
    queryString: string
  ): string {
    // 쿼리 문자열 해시 (긴 쿼리도 짧은 키로)
    const queryHash = createHash('sha256')
      .update(queryString)
      .digest('hex')
      .slice(0, 12);

    // Language 객체는 비교하기 어려우므로 toString() 사용
    const languageId = String(language).slice(0, 10);

    return `${languageId}:${queryHash}`;
  }
}

// 글로벌 싱글톤 인스턴스
let globalCache: QueryCache | null = null;

export function getGlobalQueryCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache();
  }
  return globalCache;
}

export function resetGlobalQueryCache(): void {
  globalCache = null;
}
