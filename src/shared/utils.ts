import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 섹션 추출 (## 헤더)
 */
export function extractSections(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const regex = /^## .+$/gm;
    return content.match(regex) || [];
  } catch (error) {
    console.warn(`  ⚠️  파일 읽기 오류: ${error}`);
    return [];
  }
}

/**
 * 타입 이름 추출 (interface, type, class)
 */
export function extractTypeNames(filePath: string): Set<string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const types = new Set<string>();

    // interface Name
    const interfaceMatches = content.matchAll(/^interface\s+(\w+)/gm);
    for (const match of interfaceMatches) {
      types.add(match[1]);
    }

    // type Name =
    const typeMatches = content.matchAll(/^type\s+(\w+)\s*=/gm);
    for (const match of typeMatches) {
      types.add(match[1]);
    }

    // class Name
    const classMatches = content.matchAll(/^class\s+(\w+)/gm);
    for (const match of classMatches) {
      types.add(match[1]);
    }

    return types;
  } catch (error) {
    console.warn(`  ⚠️  타입 추출 오류: ${error}`);
    return new Set();
  }
}

/**
 * 마크다운 파일 목록 가져오기
 */
export function getMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => join(dir, file))
    .filter((file) => statSync(file).isFile())
    .sort();
}

/**
 * 파일 존재 여부 확인
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}

/**
 * 현재 날짜/시간 포맷
 */
export function formatDateTime(): string {
  return new Date()
    .toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\. /g, '-')
    .replace(/\./g, '');
}

/**
 * 재귀적으로 마크다운 파일 찾기 (node_modules, .git, dist, build 제외)
 */
export function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(entry)) {
        findMarkdownFiles(fullPath, files);
      }
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}
