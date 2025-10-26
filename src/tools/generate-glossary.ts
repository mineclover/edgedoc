import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TermParser } from '../parsers/TermParser.js';
import { TermRegistry } from './term-registry.js';
import type { TermDefinition } from '../types/terminology.js';
import { loadConfig } from '../utils/config.js';

export interface GenerateGlossaryOptions {
  projectPath: string;
  outputPath?: string;
  includeDocumentScoped?: boolean;
}

/**
 * Generate GLOSSARY.md from all term definitions in the project
 */
export async function generateGlossary(
  options: GenerateGlossaryOptions
): Promise<void> {
  const {
    projectPath,
    outputPath = join(projectPath, 'docs/GLOSSARY.md'),
    includeDocumentScoped = false,
  } = options;

  console.log('📚 GLOSSARY 생성 중...\n');

  // Build registry
  const registry = await buildRegistry(projectPath);
  const allTerms = registry.listAll();

  // Filter terms
  const terms = includeDocumentScoped
    ? allTerms
    : allTerms.filter((t) => t.scope === 'global');

  if (terms.length === 0) {
    console.log('⚠️  정의된 용어가 없습니다.\n');
    return;
  }

  console.log(`📖 ${terms.length}개 용어 발견`);
  console.log(`   - Global: ${terms.filter((t) => t.scope === 'global').length}개`);
  console.log(
    `   - Document: ${terms.filter((t) => t.scope === 'document').length}개\n`
  );

  // Generate markdown
  const markdown = generateMarkdown(terms, projectPath);

  // Write file
  writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`✅ GLOSSARY 생성 완료: ${outputPath}\n`);
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
      // Skip files with errors, but log for debugging
      console.warn(`⚠️  ${relativePath}: ${error.message}`);
    }
  }

  // Extract references for usage stats
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
 * Read full term content from source file
 */
function readTermContent(termDef: TermDefinition, projectPath: string): string {
  const fullPath = join(projectPath, termDef.file);
  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  // Find the term heading
  const headingPattern = new RegExp(`^#{1,3}\\s+\\[\\[${termDef.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`);

  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i])) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    console.warn(`⚠️  Could not find heading for term "${termDef.term}" in ${termDef.file}`);
    return termDef.definition || '';
  }

  // Collect content until next heading of same or higher level
  const headingLevel = lines[startIndex].match(/^(#{1,3})/)?.[1].length || 2;
  const contentLines: string[] = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    // Stop at next heading of same or higher level
    const nextHeadingMatch = line.match(/^(#{1,3})\s/);
    if (nextHeadingMatch && nextHeadingMatch[1].length <= headingLevel) {
      break;
    }

    contentLines.push(line);
  }

  // Remove metadata lines and extract just the content
  const result: string[] = [];
  let inMetadata = true;

  for (const line of contentLines) {
    const trimmed = line.trim();

    // Skip empty lines at start
    if (inMetadata && trimmed === '') {
      continue;
    }

    // End metadata section after first non-metadata line
    if (inMetadata && trimmed && !trimmed.startsWith('**')) {
      inMetadata = false;
    }

    // Skip metadata lines
    if (trimmed.startsWith('**Type**:') ||
        trimmed.startsWith('**Scope**:') ||
        trimmed.startsWith('**Aliases**:') ||
        trimmed.startsWith('**Parent**:') ||
        trimmed.startsWith('**Related**:') ||
        trimmed.startsWith('**Not to Confuse**:')) {
      continue;
    }

    // Include everything after metadata
    if (!inMetadata) {
      result.push(line);
    }
  }

  // Trim trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result.join('\n');
}

/**
 * Generate GLOSSARY markdown
 */
function generateMarkdown(terms: TermDefinition[], projectPath: string): string {
  const lines: string[] = [];

  // Header
  lines.push('# Project Glossary\n');
  lines.push('**Type**: glossary');
  lines.push('**Language**: bilingual (English/Korean)');
  lines.push(`**Last Updated**: ${new Date().toISOString().split('T')[0]}`);
  lines.push('**Auto-generated**: This file is automatically generated from term definitions across the project.\n');
  lines.push('---\n');

  // Group by type
  const byType = new Map<string, TermDefinition[]>();

  for (const term of terms) {
    const type = term.type || 'other';
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(term);
  }

  // Sort terms within each type
  for (const [_, terms] of byType) {
    terms.sort((a, b) => a.term.localeCompare(b.term));
  }

  // Type order
  const typeOrder = [
    // Syntax/Documentation types
    'Documentation',
    'Test',
    'Content',
    'Code',
    'Metadata',
    // Domain types
    'concept',
    'entity',
    'process',
    'attribute',
    'abbreviation',
    // Code types
    'class',
    'function',
    'module',
    'interface',
    'type',
    'other',
  ];

  // Generate sections
  for (const type of typeOrder) {
    const termsOfType = byType.get(type);
    if (!termsOfType || termsOfType.length === 0) continue;

    // Type header (H1 comment)
    lines.push(`<!-- Type: ${capitalize(type)} (${termsOfType.length} terms) -->\n`);

    // Each term
    for (const term of termsOfType) {
      // Term heading (H2)
      lines.push(`## [[${term.term}]]\n`);

      // Metadata
      if (term.type) {
        lines.push(`**Type**: ${term.type}`);
      }
      lines.push(`**Scope**: ${term.scope}`);

      if (term.aliases && term.aliases.length > 0) {
        lines.push(`**Aliases**: ${term.aliases.join(', ')}`);
      }

      if (term.parent) {
        lines.push(`**Parent**: [[${term.parent}]]`);
      }

      if (term.related && term.related.length > 0) {
        lines.push(`**Related**: ${term.related.map((r) => `[[${r}]]`).join(', ')}`);
      }

      if (term.notToConfuse) {
        lines.push(`**Not to Confuse**: [[${term.notToConfuse}]]`);
      }

      lines.push(''); // Empty line after metadata

      // Full content from source file
      const content = readTermContent(term, projectPath);
      if (content) {
        lines.push(content);
        lines.push('');
      }

      // Source reference
      lines.push(`**Source**: ${term.file}:${term.line}`);
      lines.push('');

      lines.push('---\n');
    }
  }

  // Footer
  lines.push('**Document Status**: ✅ Auto-generated');
  lines.push(`**Total Terms**: ${terms.length}`);
  lines.push(`**Last Updated**: ${new Date().toISOString().split('T')[0]}\n`);

  return lines.join('\n');
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
