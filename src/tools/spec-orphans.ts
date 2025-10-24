import { readFileSync } from 'node:fs';
import { basename, join, relative, resolve, dirname } from 'node:path';
import type { ValidationOptions } from '../shared/types.js';
import { fileExists, getMarkdownFiles } from '../shared/utils.js';
import { ParserFactory } from '../parsers/ParserFactory.js';

/**
 * Spec orphan detection result
 */
export interface SpecOrphanResult {
  success: boolean;
  totalExports: number;
  documentedExports: number;
  orphanExports: SpecOrphanExport[];
}

export interface SpecOrphanExport {
  file: string;
  exportName: string;
  exportType: 'interface' | 'type' | 'class' | 'function' | 'const' | 'variable';
  reason: 'not_documented' | 'not_imported';
}

interface CodeReference {
  file: string;
  documentedIn: string[];
}

/**
 * Extract code_references from all markdown files
 */
function extractCodeReferences(projectPath: string): Map<string, CodeReference> {
  const references = new Map<string, CodeReference>();
  const tasksPath = join(projectPath, 'tasks');

  if (!fileExists(tasksPath)) {
    return references;
  }

  // Get all markdown files
  const featuresPath = join(tasksPath, 'features');
  const interfacesPath = join(tasksPath, 'interfaces');
  const sharedPath = join(tasksPath, 'shared');

  const allMarkdownFiles = [
    ...getMarkdownFiles(featuresPath),
    ...getMarkdownFiles(interfacesPath),
    ...getMarkdownFiles(sharedPath),
  ];

  for (const mdFile of allMarkdownFiles) {
    const content = readFileSync(mdFile, 'utf-8');
    const docName = basename(mdFile);

    // Extract code_references from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    const frontmatter = frontmatterMatch[1];
    const codeRefsMatch = frontmatter.match(/code_references:\s*\n((?:  - .+\n?)*)/);

    if (codeRefsMatch) {
      const refs = codeRefsMatch[1]
        .split('\n')
        .map((line) => line.trim().replace(/^- "?(.+?)"?$/, '$1'))
        .filter((line) => line.length > 0);

      for (const ref of refs) {
        const normalized = ref.replace(/^\//, ''); // Remove leading slash
        if (!references.has(normalized)) {
          references.set(normalized, { file: normalized, documentedIn: [] });
        }
        references.get(normalized)!.documentedIn.push(docName);
      }
    }
  }

  return references;
}

/**
 * Extract exports from a source file (Tree-sitter 기반)
 */
function extractExports(filePath: string): Array<{
  name: string;
  type: 'interface' | 'type' | 'class' | 'function' | 'const' | 'variable';
}> {
  try {
    const parser = ParserFactory.getParser(filePath);
    if (!parser) {
      return []; // No parser for this file type
    }

    const content = readFileSync(filePath, 'utf-8');
    const { exports } = parser.parse(content, filePath);

    return exports.map(exp => ({
      name: exp.name,
      type: exp.type,
    }));
  } catch (error) {
    // File might not exist or be readable
    return [];
  }
}

/**
 * Extract imports from a source file (Tree-sitter 기반)
 */
function extractImports(filePath: string): string[] {
  try {
    const parser = ParserFactory.getParser(filePath);
    if (!parser) {
      return []; // No parser for this file type
    }

    const content = readFileSync(filePath, 'utf-8');
    const { imports } = parser.parse(content, filePath);

    return imports.map(imp => imp.source);
  } catch (error) {
    // File might not exist
    return [];
  }
}

/**
 * Resolve import path to absolute file path
 */
function resolveImportPath(importPath: string, fromFile: string, projectPath: string): string | null {
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const fromDir = join(projectPath, fromFile, '..');
    const resolved = join(fromDir, importPath);

    // Try with common extensions
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
      const withExt = resolved + ext;
      if (fileExists(withExt)) {
        return relative(projectPath, withExt);
      }
    }
  }

  return null;
}

/**
 * Build import graph (who imports whom)
 */
function buildImportGraph(
  codeReferences: Map<string, CodeReference>,
  projectPath: string
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const [file] of codeReferences) {
    const filePath = join(projectPath, file);
    if (!fileExists(filePath)) continue;

    const imports = extractImports(filePath);
    const importedFiles = new Set<string>();

    for (const importPath of imports) {
      const resolved = resolveImportPath(importPath, file, projectPath);
      if (resolved && codeReferences.has(resolved)) {
        importedFiles.add(resolved);
      }
    }

    graph.set(file, importedFiles);
  }

  return graph;
}

/**
 * Check if a file is reachable from documented files via imports
 */
function isReachableFromDocumented(
  file: string,
  importGraph: Map<string, Set<string>>,
  codeReferences: Map<string, CodeReference>
): boolean {
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start from all directly documented files
  for (const [ref, info] of codeReferences) {
    if (info.documentedIn.length > 0) {
      queue.push(ref);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === file) return true;

    const imports = importGraph.get(current);
    if (imports) {
      for (const imported of imports) {
        if (!visited.has(imported)) {
          queue.push(imported);
        }
      }
    }
  }

  return false;
}

/**
 * Validate spec orphans
 */
export async function validateSpecOrphans(
  options: ValidationOptions = {}
): Promise<SpecOrphanResult> {
  const projectPath = options.projectPath || process.cwd();

  console.log('🔍 스펙 고아 코드 검증 시작...\n');
  console.log(`📁 프로젝트 경로: ${projectPath}\n`);

  // 1. Extract code references from documentation
  console.log('📖 문서에서 코드 참조 추출 중...');
  const codeReferences = extractCodeReferences(projectPath);
  console.log(`   → ${codeReferences.size}개 파일 참조됨\n`);

  // 2. Build import graph
  console.log('🔗 Import 의존성 그래프 구축 중...');
  const importGraph = buildImportGraph(codeReferences, projectPath);
  console.log(`   → ${importGraph.size}개 파일 분석됨\n`);

  // 3. Find exports in documented and imported files
  console.log('🔎 Export 분석 중...');
  const allExports = new Map<string, ReturnType<typeof extractExports>>();
  const orphanExports: SpecOrphanExport[] = [];

  for (const [file] of codeReferences) {
    const filePath = join(projectPath, file);
    if (!fileExists(filePath)) continue;

    const exports = extractExports(filePath);
    allExports.set(file, exports);
  }

  let totalExports = 0;
  for (const exports of allExports.values()) {
    totalExports += exports.length;
  }
  console.log(`   → ${totalExports}개 export 발견됨\n`);

  // 4. Check for orphans
  console.log('🚨 고아 코드 탐지 중...');
  for (const [file, exports] of allExports) {
    const ref = codeReferences.get(file)!;
    const isDirectlyDocumented = ref.documentedIn.length > 0;
    const isImportedByDocumented = isReachableFromDocumented(file, importGraph, codeReferences);

    if (!isDirectlyDocumented && !isImportedByDocumented) {
      // File is orphaned - all its exports are orphans
      for (const exp of exports) {
        orphanExports.push({
          file,
          exportName: exp.name,
          exportType: exp.type,
          reason: 'not_documented',
        });
      }
    }
  }

  console.log(`   → ${orphanExports.length}개 고아 export 발견\n`);

  // 5. Display results
  console.log('━'.repeat(60));
  console.log('📊 검증 결과\n');

  if (orphanExports.length === 0) {
    console.log('✅ 고아 export 없음 - 모든 코드가 문서화되었거나 문서화된 코드에서 사용 중\n');
  } else {
    console.log(`❌ ${orphanExports.length}개 고아 export 발견:\n`);

    const byFile = new Map<string, SpecOrphanExport[]>();
    for (const orphan of orphanExports) {
      if (!byFile.has(orphan.file)) {
        byFile.set(orphan.file, []);
      }
      byFile.get(orphan.file)!.push(orphan);
    }

    for (const [file, orphans] of byFile) {
      console.log(`📄 ${file}`);
      for (const orphan of orphans) {
        console.log(`   - ${orphan.exportType} ${orphan.exportName}`);
      }
      console.log();
    }

    console.log('💡 힌트:');
    console.log('   - 문서의 code_references 필드에 추가하거나');
    console.log('   - 문서화된 코드에서 import하여 사용하세요\n');
  }

  return {
    success: orphanExports.length === 0,
    totalExports,
    documentedExports: totalExports - orphanExports.length,
    orphanExports,
  };
}
