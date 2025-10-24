import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferenceIndex } from '../types/reference-index.js';

export interface GraphQueryOptions {
  projectPath: string;
  featureId?: string;
  codeFile?: string;
  term?: string;
}

/**
 * Query the reference index
 */
export async function queryGraph(options: GraphQueryOptions): Promise<void> {
  const { projectPath, featureId, codeFile, term } = options;

  // Load index
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    console.error('❌ Index not found. Run "edgedoc graph build" first.');
    process.exit(1);
  }

  const index: ReferenceIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

  if (featureId) {
    printFeatureDetails(index, featureId);
  } else if (codeFile) {
    printCodeReferences(index, codeFile);
  } else if (term) {
    printTermUsage(index, term);
  } else {
    printOverview(index);
  }
}

/**
 * Print feature details
 */
function printFeatureDetails(index: ReferenceIndex, featureId: string): void {
  const feature = index.features[featureId];

  if (!feature) {
    console.error(`❌ Feature "${featureId}" not found`);
    process.exit(1);
  }

  console.log(`📦 Feature: ${featureId}\n`);
  console.log(`File: ${feature.file}\n`);

  // Code references
  if (feature.code.uses.length > 0) {
    console.log('💾 Uses Code:');
    for (const file of feature.code.uses) {
      console.log(`  - ${file}`);
    }
    console.log();
  }

  if (feature.code.used_by.length > 0) {
    console.log('📥 Used By Code:');
    for (const file of feature.code.used_by) {
      console.log(`  - ${file}`);
    }
    console.log();
  }

  // Feature relationships
  if (feature.features.related.length > 0) {
    console.log('🔗 Related Features:');
    for (const related of feature.features.related) {
      console.log(`  - ${related}`);
    }
    console.log();
  }

  if (feature.features.depends_on.length > 0) {
    console.log('⬇️  Depends On:');
    for (const dep of feature.features.depends_on) {
      console.log(`  - ${dep}`);
    }
    console.log();
  }

  if (feature.features.used_by.length > 0) {
    console.log('⬆️  Used By Features:');
    for (const user of feature.features.used_by) {
      console.log(`  - ${user}`);
    }
    console.log();
  }

  // Interfaces
  if (feature.interfaces.provides.length > 0) {
    console.log('🔌 Provides Interfaces:');
    const uniqueInterfaces = [...new Set(feature.interfaces.provides)];
    for (const iface of uniqueInterfaces) {
      const ifaceData = index.interfaces[iface];
      if (ifaceData) {
        console.log(`  - ${iface} (${ifaceData.from} → ${ifaceData.to})`);
      }
    }
    console.log();
  }

  if (feature.interfaces.uses.length > 0) {
    console.log('🔌 Uses Interfaces:');
    for (const iface of feature.interfaces.uses) {
      const ifaceData = index.interfaces[iface];
      if (ifaceData) {
        console.log(`  - ${iface} (${ifaceData.from} → ${ifaceData.to})`);
      }
    }
    console.log();
  }

  // Terms
  if (feature.terms.uses.length > 0) {
    console.log('📚 Uses Terms:');
    for (const t of feature.terms.uses) {
      console.log(`  - [[${t}]]`);
    }
    console.log();
  }

  // Tests
  if (feature.tests.tested_by.length > 0) {
    console.log('🧪 Tests:');
    for (const test of feature.tests.tested_by) {
      console.log(`  - ${test}`);
    }
    console.log();
  }
}

/**
 * Print code file references (reverse lookup)
 */
function printCodeReferences(index: ReferenceIndex, codeFile: string): void {
  const code = index.code[codeFile];

  if (!code) {
    console.error(`❌ Code file "${codeFile}" not found in index`);
    process.exit(1);
  }

  console.log(`💾 Code File: ${codeFile}\n`);
  console.log(`Type: ${code.type}\n`);

  if (code.documented_in.length > 0) {
    console.log('📄 Documented In:');
    for (const featureId of code.documented_in) {
      const feature = index.features[featureId];
      if (feature) {
        console.log(`  - ${featureId}`);
        console.log(`    ${feature.file}`);
      }
    }
    console.log();
  } else {
    console.log('⚠️  Not documented in any feature\n');
  }

  if (code.imports.length > 0) {
    console.log('📥 Imports:');
    for (const imp of code.imports) {
      console.log(`  - ${imp}`);
    }
    console.log();
  }

  if (code.imported_by.length > 0) {
    console.log('📤 Imported By:');
    for (const imp of code.imported_by) {
      console.log(`  - ${imp}`);
    }
    console.log();
  }

  if (code.exports && code.exports.length > 0) {
    console.log('🔧 Exports:');
    for (const exp of code.exports) {
      console.log(`  - ${exp.name} (${exp.type})`);
    }
    console.log();
  }
}

/**
 * Print term usage
 */
function printTermUsage(index: ReferenceIndex, term: string): void {
  const termData = index.terms[term];

  if (!termData) {
    console.error(`❌ Term "[[${term}]]" not found`);
    process.exit(1);
  }

  console.log(`📚 Term: [[${term}]]\n`);

  console.log('📖 Definition:');
  console.log(`  File: ${termData.definition.file}:${termData.definition.line}`);
  console.log(`  Scope: ${termData.definition.scope}\n`);

  console.log(`📊 Usage: ${termData.usage_count} references\n`);

  if (termData.references.length > 0) {
    console.log('🔗 References:');
    const maxShow = 10;
    const refs = termData.references.slice(0, maxShow);

    for (const ref of refs) {
      console.log(`  - ${ref.file}:${ref.line}`);
      console.log(`    "${ref.context}"`);
    }

    if (termData.references.length > maxShow) {
      console.log(`  ... and ${termData.references.length - maxShow} more`);
    }
    console.log();
  }
}

/**
 * Print overview
 */
function printOverview(index: ReferenceIndex): void {
  console.log('📊 Reference Index Overview\n');
  console.log(`Version: ${index.version}`);
  console.log(`Generated: ${new Date(index.generated).toLocaleString()}\n`);

  console.log('📦 Features:');
  console.log(`  Total: ${Object.keys(index.features).length}`);
  const featuresWithTests = Object.values(index.features).filter(
    (f) => f.tests.tested_by.length > 0
  ).length;
  console.log(`  With tests: ${featuresWithTests}`);
  console.log();

  console.log('💾 Code Files:');
  console.log(`  Total: ${Object.keys(index.code).length}`);
  const codeTypes = Object.values(index.code).reduce(
    (acc, c) => {
      acc[c.type]++;
      return acc;
    },
    { source: 0, test: 0, config: 0 }
  );
  console.log(`  Source: ${codeTypes.source}`);
  console.log(`  Test: ${codeTypes.test}`);
  console.log(`  Config: ${codeTypes.config}`);
  console.log();

  console.log('🔌 Interfaces:');
  console.log(`  Total: ${Object.keys(index.interfaces).length}`);
  console.log();

  console.log('📚 Terms:');
  console.log(`  Total: ${Object.keys(index.terms).length}`);
  const globalTerms = Object.values(index.terms).filter(
    (t) => t.definition.scope === 'global'
  ).length;
  console.log(`  Global: ${globalTerms}`);
  console.log(`  Document-scoped: ${Object.keys(index.terms).length - globalTerms}`);
  console.log();

  console.log('💡 Top 5 Most Used Terms:');
  const sortedTerms = Object.entries(index.terms)
    .sort((a, b) => b[1].usage_count - a[1].usage_count)
    .slice(0, 5);

  for (const [term, data] of sortedTerms) {
    console.log(`  - [[${term}]]: ${data.usage_count} uses`);
  }
  console.log();
}
