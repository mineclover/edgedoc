import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TermParser } from '../parsers/TermParser.js';
import { TermRegistry } from './term-registry.js';
import type { TermDefinition } from '../types/terminology.js';
import { loadConfig } from '../utils/config.js';

export interface TermCommandOptions {
  projectPath: string;
}

/**
 * Build term registry from project
 */
async function buildRegistry(projectPath: string): Promise<TermRegistry> {
  const registry = new TermRegistry();
  const config = loadConfig(projectPath);

  // Find all markdown files
  const mdFiles = findMarkdownFiles(projectPath);

  // Extract definitions
  for (const file of mdFiles) {
    const relativePath = file.replace(projectPath + '/', '');

    // Skip GLOSSARY.md (output file, not source)
    if (relativePath === 'docs/GLOSSARY.md') {
      continue;
    }

    const content = readFileSync(file, 'utf-8');

    try {
      const definitions = TermParser.extractDefinitions(content, relativePath, config);
      for (const def of definitions) {
        registry.addDefinition(def);
      }
    } catch (error: any) {
      // Skip files with errors
    }
  }

  // Extract references
  for (const file of mdFiles) {
    const relativePath = file.replace(projectPath + '/', '');
    const content = readFileSync(file, 'utf-8');

    const references = TermParser.extractReferences(content, relativePath);
    for (const ref of references) {
      registry.addReference(ref);
    }
  }

  return registry;
}

/**
 * List all defined terms
 */
export async function listTerms(options: TermCommandOptions): Promise<void> {
  const { projectPath } = options;

  console.log('📚 용어 목록\n');

  const registry = await buildRegistry(projectPath);
  const terms = registry.listAll();

  if (terms.length === 0) {
    console.log('정의된 용어가 없습니다.\n');
    return;
  }

  // Group by scope
  const globalTerms = terms.filter((t) => t.scope === 'global');
  const documentTerms = terms.filter((t) => t.scope === 'document');

  // Print global terms
  if (globalTerms.length > 0) {
    console.log('## Global Terms\n');

    // Group by type
    const byType = new Map<string, TermDefinition[]>();

    for (const term of globalTerms) {
      const type = term.type || 'other';
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(term);
    }

    // Print each type
    const typeOrder = ['concept', 'entity', 'process', 'attribute', 'abbreviation', 'other'];

    for (const type of typeOrder) {
      const termsOfType = byType.get(type);
      if (!termsOfType || termsOfType.length === 0) continue;

      console.log(`### ${capitalize(type)} (${termsOfType.length})\n`);

      for (const term of termsOfType) {
        console.log(`- **${term.term}**`);

        if (term.aliases && term.aliases.length > 0) {
          console.log(`  - Aliases: ${term.aliases.join(', ')}`);
        }

        if (term.definition) {
          const shortDef = truncate(term.definition, 80);
          console.log(`  - ${shortDef}`);
        }

        console.log(`  - 📍 ${term.file}:${term.line}`);
        console.log();
      }
    }
  }

  // Print document-scoped terms
  if (documentTerms.length > 0) {
    console.log('## Document-scoped Terms\n');

    // Group by file
    const byFile = new Map<string, TermDefinition[]>();

    for (const term of documentTerms) {
      if (!byFile.has(term.file)) {
        byFile.set(term.file, []);
      }
      byFile.get(term.file)!.push(term);
    }

    for (const [file, terms] of byFile) {
      console.log(`### ${file} (${terms.length})\n`);

      for (const term of terms) {
        console.log(`- **${term.term}**`);
        if (term.definition) {
          const shortDef = truncate(term.definition, 80);
          console.log(`  - ${shortDef}`);
        }
        console.log();
      }
    }
  }

  // Summary
  console.log('━'.repeat(80));
  console.log(`\n📊 총 ${terms.length}개 용어 정의됨`);
  console.log(`   - Global: ${globalTerms.length}개`);
  console.log(`   - Document: ${documentTerms.length}개\n`);
}

/**
 * Find term definition
 */
export async function findTerm(
  query: string,
  options: TermCommandOptions
): Promise<void> {
  const { projectPath } = options;

  console.log(`🔍 용어 검색: "${query}"\n`);

  const registry = await buildRegistry(projectPath);

  // Try exact match first
  const exactMatch = registry.find(query);

  if (exactMatch) {
    printTermDetail(exactMatch, registry);
    return;
  }

  // Search
  const results = registry.search(query);

  if (results.length === 0) {
    console.log(`❌ "${query}"와 일치하는 용어를 찾을 수 없습니다.\n`);
    return;
  }

  if (results.length === 1) {
    printTermDetail(results[0], registry);
    return;
  }

  // Multiple results
  console.log(`📚 ${results.length}개 결과 발견:\n`);

  for (let i = 0; i < results.length; i++) {
    const term = results[i];
    console.log(`${i + 1}. **${term.term}**`);

    if (term.aliases && term.aliases.length > 0) {
      console.log(`   Aliases: ${term.aliases.join(', ')}`);
    }

    if (term.definition) {
      const shortDef = truncate(term.definition, 100);
      console.log(`   ${shortDef}`);
    }

    console.log(`   📍 ${term.file}:${term.line}`);
    console.log();
  }
}

/**
 * Print term detail
 */
function printTermDetail(term: TermDefinition, registry: TermRegistry): void {
  console.log('━'.repeat(80));
  console.log(`\n## ${term.term}\n`);

  console.log(`**Type**: ${term.type || 'unknown'}`);
  console.log(`**Scope**: ${term.scope}`);
  console.log(`**Location**: ${term.file}:${term.line}\n`);

  if (term.aliases && term.aliases.length > 0) {
    console.log(`**Aliases**: ${term.aliases.join(', ')}\n`);
  }

  if (term.definition) {
    console.log(`**Definition**:\n${term.definition}\n`);
  }

  if (term.parent) {
    console.log(`**Parent**: [[${term.parent}]]\n`);
  }

  if (term.related && term.related.length > 0) {
    console.log(`**Related Terms**:`);
    for (const related of term.related) {
      console.log(`  - [[${related}]]`);
    }
    console.log();
  }

  if (term.notToConfuse) {
    console.log(`**Not to Confuse**: [[${term.notToConfuse}]]\n`);
  }

  // Show usage
  const references = registry.references.filter((r) => registry.resolve(r.term) === term.term);

  if (references.length > 0) {
    console.log(`**Usage**: ${references.length}개 참조\n`);

    // Group by file
    const byFile = new Map<string, typeof references>();
    for (const ref of references) {
      if (!byFile.has(ref.file)) {
        byFile.set(ref.file, []);
      }
      byFile.get(ref.file)!.push(ref);
    }

    const files = Array.from(byFile.keys()).slice(0, 5); // Show max 5 files
    for (const file of files) {
      const refs = byFile.get(file)!;
      console.log(`  - ${file} (${refs.length}회)`);
    }

    if (byFile.size > 5) {
      console.log(`  ... ${byFile.size - 5}개 파일 더`);
    }
    console.log();
  } else {
    console.log(`⚠️  **Usage**: 참조 없음 (미사용)\n`);
  }

  console.log('━'.repeat(80) + '\n');
}

/**
 * Find markdown files recursively
 */
function findMarkdownFiles(dir: string, files: string[] = []): string[] {
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

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.substring(0, maxLen - 3) + '...';
}
