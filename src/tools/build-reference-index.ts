import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type {
  ReferenceIndex,
  BuildIndexOptions,
  IndexStats,
  FeatureIndex,
  CodeIndex,
  InterfaceIndex,
  TermIndex,
} from '../types/reference-index.js';
import { TermParser } from '../parsers/TermParser.js';
import { findMarkdownFiles } from '../shared/utils.js';

/**
 * Build reference index from project documentation
 */
export async function buildReferenceIndex(
  options: BuildIndexOptions
): Promise<{ index: ReferenceIndex; stats: IndexStats }> {
  const startTime = Date.now();
  const { projectPath, outputPath, includeSymbols = false, verbose = false } = options;

  if (verbose) {
    console.log('🔨 Building reference index...\n');
  }

  // Initialize empty index
  const index: ReferenceIndex = {
    version: '1.0',
    generated: new Date().toISOString(),
    features: {},
    code: {},
    interfaces: {},
    terms: {},
  };

  // Step 1: Extract feature references
  if (verbose) console.log('📄 Extracting feature references...');
  await extractFeatureReferences(projectPath, index, verbose);

  // Step 2: Extract code dependencies
  if (verbose) console.log('💾 Extracting code dependencies...');
  await extractCodeDependencies(projectPath, index, includeSymbols, verbose);

  // Step 3: Extract interface connections
  if (verbose) console.log('🔗 Extracting interface connections...');
  await extractInterfaceConnections(projectPath, index, verbose);

  // Step 4: Extract term usage
  if (verbose) console.log('📚 Extracting term usage...');
  await extractTermUsage(projectPath, index, verbose);

  // Step 5: Build reverse mappings
  if (verbose) console.log('🔄 Building reverse mappings...');
  buildReverseMappings(index, verbose);

  // Calculate statistics
  const stats: IndexStats = {
    features: Object.keys(index.features).length,
    code_files: Object.keys(index.code).length,
    interfaces: Object.keys(index.interfaces).length,
    terms: Object.keys(index.terms).length,
    total_references:
      Object.values(index.features).reduce((sum, f) => sum + f.code.uses.length, 0) +
      Object.values(index.code).reduce((sum, c) => sum + c.imports.length, 0),
    build_time_ms: Date.now() - startTime,
  };

  // Save index
  if (outputPath || true) {
    const output = outputPath || join(projectPath, '.edgedoc', 'references.json');
    const outputDir = join(projectPath, '.edgedoc');

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(output, JSON.stringify(index, null, 2));

    if (verbose) {
      console.log(`\n✅ Index saved: ${relative(projectPath, output)}`);
    }
  }

  return { index, stats };
}

/**
 * Extract feature references from tasks/features/*.md
 */
async function extractFeatureReferences(
  projectPath: string,
  index: ReferenceIndex,
  verbose: boolean
): Promise<void> {
  const featuresDir = join(projectPath, 'tasks', 'features');
  const files = findMarkdownFiles(featuresDir);

  for (const file of files) {
    const relativePath = relative(projectPath, file);
    const content = readFileSync(file, 'utf-8');

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    const frontmatter = parseFrontmatter(frontmatterMatch[1]);

    const featureId = frontmatter.feature || extractFeatureId(file);

    index.features[featureId] = {
      file: relativePath,
      code: {
        uses: frontmatter.code_references || [],
        used_by: [],
      },
      features: {
        related: frontmatter.related_features || [],
        depends_on: frontmatter.depends_on || [],
        used_by: [],
      },
      interfaces: {
        provides: frontmatter.interfaces || [],
        uses: [],
      },
      terms: {
        defines: [],
        uses: [],
      },
      tests: {
        tested_by: frontmatter.test_files || [],
      },
    };

    // Extract [[Term]] references from body
    const bodyContent = content.replace(/^---[\s\S]*?---\n/, '');
    const termReferences = TermParser.extractReferences(bodyContent, relativePath);
    index.features[featureId].terms.uses = [
      ...new Set(termReferences.map((ref) => ref.term)),
    ];
  }

  if (verbose) {
    console.log(`   → ${Object.keys(index.features).length} features found\n`);
  }
}

/**
 * Extract code dependencies (simplified - full implementation uses Tree-sitter)
 */
async function extractCodeDependencies(
  projectPath: string,
  index: ReferenceIndex,
  includeSymbols: boolean,
  verbose: boolean
): Promise<void> {
  // For now, just initialize code index from feature references
  // Full implementation would use Tree-sitter to parse actual imports

  for (const feature of Object.values(index.features)) {
    for (const codeFile of feature.code.uses) {
      if (!index.code[codeFile]) {
        index.code[codeFile] = {
          type: inferCodeType(codeFile),
          documented_in: [],
          imports: [],
          imported_by: [],
        };
      }
    }
  }

  if (verbose) {
    console.log(`   → ${Object.keys(index.code).length} code files indexed\n`);
  }
}

/**
 * Extract interface connections from tasks/interfaces/*.md
 */
async function extractInterfaceConnections(
  projectPath: string,
  index: ReferenceIndex,
  verbose: boolean
): Promise<void> {
  const interfacesDir = join(projectPath, 'tasks', 'interfaces');
  if (!existsSync(interfacesDir)) {
    if (verbose) console.log('   → No interfaces directory\n');
    return;
  }

  const files = findMarkdownFiles(interfacesDir);

  for (const file of files) {
    const relativePath = relative(projectPath, file);
    const content = readFileSync(file, 'utf-8');

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    const frontmatter = parseFrontmatter(frontmatterMatch[1]);

    const interfaceId = extractInterfaceId(file);

    index.interfaces[interfaceId] = {
      file: relativePath,
      from: frontmatter.from || '',
      to: frontmatter.to || '',
      type: frontmatter.type || 'unknown',
      shared_types: frontmatter.shared_types || [],
    };

    // Update feature interface mappings
    if (frontmatter.from && index.features[frontmatter.from]) {
      index.features[frontmatter.from].interfaces.provides.push(interfaceId);
    }
    if (frontmatter.to && index.features[frontmatter.to]) {
      index.features[frontmatter.to].interfaces.uses.push(interfaceId);
    }
  }

  if (verbose) {
    console.log(`   → ${Object.keys(index.interfaces).length} interfaces found\n`);
  }
}

/**
 * Extract term usage using TermParser
 */
async function extractTermUsage(
  projectPath: string,
  index: ReferenceIndex,
  verbose: boolean
): Promise<void> {
  const allMdFiles = findMarkdownFiles(projectPath);

  // Extract definitions
  for (const file of allMdFiles) {
    const relativePath = relative(projectPath, file);
    const content = readFileSync(file, 'utf-8');

    const definitions = TermParser.extractDefinitions(content, relativePath);

    for (const def of definitions) {
      if (!index.terms[def.term]) {
        index.terms[def.term] = {
          definition: {
            file: def.file,
            line: def.line,
            scope: def.scope,
          },
          references: [],
          usage_count: 0,
        };
      }
    }
  }

  // Extract references
  for (const file of allMdFiles) {
    const relativePath = relative(projectPath, file);
    const content = readFileSync(file, 'utf-8');

    const references = TermParser.extractReferences(content, relativePath);

    for (const ref of references) {
      if (index.terms[ref.term]) {
        index.terms[ref.term].references.push({
          file: ref.file,
          line: ref.line,
          context: ref.context,
        });
        index.terms[ref.term].usage_count++;
      }
    }
  }

  if (verbose) {
    console.log(`   → ${Object.keys(index.terms).length} terms found\n`);
  }
}

/**
 * Build reverse mappings
 */
function buildReverseMappings(index: ReferenceIndex, verbose: boolean): void {
  // Code → Features (documented_in)
  for (const [featureId, feature] of Object.entries(index.features)) {
    for (const codeFile of feature.code.uses) {
      if (index.code[codeFile]) {
        index.code[codeFile].documented_in.push(featureId);
      }
    }
  }

  // Feature → Feature (used_by)
  for (const [featureId, feature] of Object.entries(index.features)) {
    for (const relatedFeature of feature.features.related) {
      if (index.features[relatedFeature]) {
        // For now, assume related means "depends on"
        if (!index.features[relatedFeature].features.used_by.includes(featureId)) {
          index.features[relatedFeature].features.used_by.push(featureId);
        }
      }
    }

    for (const dependency of feature.features.depends_on) {
      if (index.features[dependency]) {
        if (!index.features[dependency].features.used_by.includes(featureId)) {
          index.features[dependency].features.used_by.push(featureId);
        }
      }
    }
  }

  if (verbose) {
    console.log('   → Reverse mappings complete\n');
  }
}

/**
 * Parse YAML frontmatter
 */
function parseFrontmatter(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};

  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Array item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).replace(/^["']|["']$/g, '');
      currentArray.push(value);
      continue;
    }

    // Key-value
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      // Save previous array
      if (currentKey && currentArray.length > 0) {
        result[currentKey] = currentArray;
        currentArray = [];
      }

      currentKey = match[1];
      const value = match[2].replace(/^["']|["']$/g, '');

      if (value) {
        result[currentKey] = value;
        currentKey = null;
      }
    }
  }

  // Save last array
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Extract feature ID from filename
 */
function extractFeatureId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace(/\.md$/, '');
}

/**
 * Extract interface ID from filename
 */
function extractInterfaceId(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  return filename.replace(/\.md$/, '');
}

/**
 * Infer code file type
 */
function inferCodeType(filePath: string): 'source' | 'test' | 'config' {
  if (filePath.includes('/tests/') || filePath.includes('.test.') || filePath.includes('.spec.')) {
    return 'test';
  }
  if (
    filePath.includes('config') ||
    filePath.endsWith('.json') ||
    filePath.endsWith('.yaml') ||
    filePath.endsWith('.yml')
  ) {
    return 'config';
  }
  return 'source';
}
