import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import type { SyncResult, SyncOptions } from '../shared/types.js';
import { fileExists, getMarkdownFiles } from '../shared/utils.js';
import { TypeScriptParser } from '../parsers/TypeScriptParser.js';

interface CodeFile {
  path: string;
  exports: string[];
  imports: string[];
}

interface DocumentInfo {
  path: string;
  feature?: string;
  entryPoint?: string;
  currentRefs: string[];
}

/**
 * Collect all source files in the project
 */
function collectSourceFiles(projectDir: string): string[] {
  const files: string[] = [];

  function scan(dir: string) {
    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relativePath = relative(projectDir, fullPath);

        // Skip excluded directories
        if (relativePath.startsWith('node_modules')) continue;
        if (relativePath.startsWith('dist')) continue;
        if (relativePath.startsWith('build')) continue;
        if (relativePath.startsWith('.git')) continue;
        if (relativePath.startsWith('tasks')) continue;
        if (relativePath.startsWith('.')) continue;

        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = fullPath.split('.').pop() || '';
          if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
            files.push(relativePath);
          }
        }
      }
    } catch (_error) {
      // Skip inaccessible directories
    }
  }

  scan(projectDir);
  return files;
}

/**
 * Analyze code files with Tree-sitter
 */
function analyzeCodeFiles(projectDir: string, files: string[]): Map<string, CodeFile> {
  const codeFiles = new Map<string, CodeFile>();
  const parser = new TypeScriptParser();

  for (const file of files) {
    const fullPath = join(projectDir, file);

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const isTsx = file.endsWith('.tsx') || file.endsWith('.jsx');

      const { imports, exports } = parser.parse(content, isTsx);

      codeFiles.set(file, {
        path: file,
        exports: exports.map(e => e.name),
        imports: imports.map(i => i.source),
      });
    } catch (_error) {
      // Skip files that fail to parse
    }
  }

  return codeFiles;
}

/**
 * Build import dependency graph
 */
function buildDependencyGraph(
  codeFiles: Map<string, CodeFile>,
  projectDir: string
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const [file, info] of codeFiles) {
    const dependencies = new Set<string>();

    for (const importPath of info.imports) {
      if (!importPath.startsWith('.')) continue;

      const fromDir = dirname(join(projectDir, file));
      const resolved = resolveImportPath(importPath, fromDir, projectDir);

      if (resolved && codeFiles.has(resolved)) {
        dependencies.add(resolved);
      }
    }

    graph.set(file, dependencies);
  }

  return graph;
}

/**
 * Resolve import path to file path
 */
function resolveImportPath(importPath: string, fromDir: string, projectDir: string): string | null {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];

  for (const ext of extensions) {
    const fullPath = join(fromDir, importPath + ext);
    if (fileExists(fullPath)) {
      return relative(projectDir, fullPath);
    }
  }

  return null;
}

/**
 * Extract frontmatter field value
 */
function extractFrontmatterField(content: string, field: string): string | string[] | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return undefined;

  const frontmatter = frontmatterMatch[1];

  // Array field
  const arrayMatch = frontmatter.match(new RegExp(`${field}:\\s*\\n((?:  - .+\\n?)*)`));
  if (arrayMatch) {
    return arrayMatch[1]
      .split('\n')
      .map(line => line.trim().replace(/^- "?(.+?)"?$/, '$1'))
      .filter(line => line.length > 0);
  }

  // Single value field
  const singleMatch = frontmatter.match(new RegExp(`${field}:\\s*"?([^"\\n]+)"?`));
  if (singleMatch) {
    return singleMatch[1].trim();
  }

  return undefined;
}

/**
 * Parse document information
 */
function parseDocuments(projectDir: string): DocumentInfo[] {
  const docs: DocumentInfo[] = [];
  const tasksPath = join(projectDir, 'tasks');

  if (!fileExists(tasksPath)) return docs;

  const allDocs = [
    ...getMarkdownFiles(join(tasksPath, 'features')),
    ...getMarkdownFiles(join(tasksPath, 'interfaces')),
  ];

  for (const docPath of allDocs) {
    const content = readFileSync(docPath, 'utf-8');
    const feature = extractFrontmatterField(content, 'feature') as string | undefined;
    const entryPoint = extractFrontmatterField(content, 'entry_point') as string | undefined;
    const codeRefs = extractFrontmatterField(content, 'code_references') as string[] | undefined;

    docs.push({
      path: docPath,
      feature,
      entryPoint: entryPoint?.split(':')[0], // Remove line numbers
      currentRefs: Array.isArray(codeRefs) ? codeRefs : [],
    });
  }

  return docs;
}

/**
 * Calculate transitive dependencies for a file
 */
function getTransitiveDependencies(
  file: string,
  graph: Map<string, Set<string>>,
  maxDepth = 2
): Set<string> {
  const result = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = [{ file, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { file: current, depth } = queue.shift()!;

    if (visited.has(current) || depth > maxDepth) continue;
    visited.add(current);

    if (depth > 0) result.add(current);

    const deps = graph.get(current);
    if (deps) {
      for (const dep of deps) {
        queue.push({ file: dep, depth: depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Update frontmatter code_references field
 */
function updateFrontmatter(content: string, newRefs: string[]): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return content;

  let frontmatter = frontmatterMatch[1];

  // Remove existing code_references
  frontmatter = frontmatter.replace(/code_references:\s*\n(?:  - .+\n?)*/g, '');

  // Add new code_references (sorted)
  const sortedRefs = [...newRefs].sort();
  const refsBlock = 'code_references:\n' + sortedRefs.map(ref => `  - "${ref}"`).join('\n');

  // Insert at the end of frontmatter
  frontmatter = frontmatter.trim() + '\n' + refsBlock;

  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}

/**
 * 코드 참조 동기화
 */
export async function syncCodeRefs(options: SyncOptions = {}): Promise<SyncResult> {
  const projectDir = options.projectPath || process.cwd();

  console.log('🔄 코드 참조 동기화 시작...\n');
  console.log(`📁 프로젝트 경로: ${projectDir}\n`);

  // 1. Scan all source files
  console.log('📂 코드 파일 스캔 중...');
  const sourceFiles = collectSourceFiles(projectDir);
  console.log(`   → ${sourceFiles.length}개 파일 발견\n`);

  // 2. Analyze code with Tree-sitter
  console.log('🔗 코드 분석 중 (Tree-sitter)...');
  const codeFiles = analyzeCodeFiles(projectDir, sourceFiles);
  console.log(`   → ${codeFiles.size}개 파일 분석됨\n`);

  // 3. Build dependency graph
  console.log('📊 의존성 그래프 구축 중...');
  const depGraph = buildDependencyGraph(codeFiles, projectDir);
  console.log(`   → ${depGraph.size}개 파일의 의존성 추적됨\n`);

  // 4. Parse documents
  console.log('📖 문서 파싱 중...');
  const documents = parseDocuments(projectDir);
  console.log(`   → ${documents.length}개 문서 발견\n`);

  // 5. Update documents
  console.log('📝 문서 업데이트 중...\n');

  let totalBlocks = 0;
  let updatedBlocks = 0;
  let failedBlocks = 0;

  for (const doc of documents) {
    totalBlocks++;

    try {
      const newRefs = new Set<string>();

      // Add entry_point if exists
      if (doc.entryPoint) {
        newRefs.add(doc.entryPoint);

        // Add transitive dependencies of entry_point
        const deps = getTransitiveDependencies(doc.entryPoint, depGraph);
        for (const dep of deps) {
          newRefs.add(dep);
        }
      }

      // Check if references changed
      const currentSet = new Set(doc.currentRefs);
      const hasChanges =
        newRefs.size !== currentSet.size ||
        [...newRefs].some(ref => !currentSet.has(ref));

      if (hasChanges) {
        const content = readFileSync(doc.path, 'utf-8');
        const updated = updateFrontmatter(content, [...newRefs]);

        if (!options.dryRun) {
          writeFileSync(doc.path, updated, 'utf-8');
        }

        const docName = relative(projectDir, doc.path);
        const added = [...newRefs].filter(r => !currentSet.has(r));
        const removed = [...currentSet].filter(r => !newRefs.has(r));

        console.log(`   ✅ ${docName}`);
        if (added.length > 0) {
          console.log(`      + ${added.length}개 추가: ${added.slice(0, 3).join(', ')}${added.length > 3 ? '...' : ''}`);
        }
        if (removed.length > 0) {
          console.log(`      - ${removed.length}개 제거: ${removed.slice(0, 3).join(', ')}${removed.length > 3 ? '...' : ''}`);
        }

        updatedBlocks++;
      }
    } catch (error) {
      console.log(`   ❌ ${relative(projectDir, doc.path)}: ${error}`);
      failedBlocks++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 동기화 완료\n');
  console.log(`전체 문서: ${totalBlocks}`);
  console.log(`업데이트: ${updatedBlocks}`);
  console.log(`실패: ${failedBlocks}\n`);

  if (options.dryRun) {
    console.log('⚠️  Dry-run 모드: 실제 파일은 변경되지 않았습니다\n');
  }

  return {
    success: failedBlocks === 0,
    totalBlocks,
    updatedBlocks,
    failedBlocks,
  };
}
