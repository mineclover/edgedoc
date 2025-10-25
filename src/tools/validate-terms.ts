import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TermParser } from '../parsers/TermParser.js';
import { TermRegistry } from './term-registry.js';
import type { ValidationResult } from '../types/terminology.js';
import { t } from '../shared/i18n.js';

export interface ValidateTermsOptions {
  projectPath: string;
}

export interface ValidateTermsResult extends ValidationResult {
  success: boolean;
}

/**
 * Validate terms across all markdown files
 */
export async function validateTerms(
  options: ValidateTermsOptions
): Promise<ValidateTermsResult> {
  const { projectPath } = options;

  console.log('🔍 ' + t().terms.validation_start + '\n');

  // Initialize registry
  const registry = new TermRegistry();

  // Find all markdown files
  const mdFiles = findMarkdownFiles(projectPath);
  console.log(`📄 ${mdFiles.length}개 마크다운 파일 발견\n`);

  // Step 1: Extract definitions
  console.log('📖 용어 정의 추출 중...');
  let totalDefinitions = 0;

  for (const file of mdFiles) {
    const relativePath = file.replace(projectPath + '/', '');
    const content = readFileSync(file, 'utf-8');

    try {
      const definitions = TermParser.extractDefinitions(content, relativePath);

      for (const def of definitions) {
        registry.addDefinition(def);
        totalDefinitions++;
      }
    } catch (error: any) {
      console.error(`   ❌ ${relativePath}: ${error.message}`);
    }
  }

  console.log(`   → ${totalDefinitions}개 정의 발견`);

  // Show breakdown by scope
  const globalDefs = Array.from(registry.definitions.values()).filter(
    (d) => d.scope === 'global'
  );
  const docDefs = Array.from(registry.definitions.values()).filter(
    (d) => d.scope === 'document'
  );

  console.log(`     - Global: ${globalDefs.length}개`);
  console.log(`     - Document: ${docDefs.length}개`);

  // Show files with definitions
  const filesWithDefs = Array.from(registry.byFile.keys());
  console.log(`     - 파일: ${filesWithDefs.length}개`);
  for (const file of filesWithDefs) {
    const count = registry.getDefinitionsInFile(file).length;
    console.log(`       • ${file} (${count}개)`);
  }

  console.log();

  // Step 2: Extract references
  console.log('🔗 용어 참조 추출 중...');
  let totalReferences = 0;

  for (const file of mdFiles) {
    const relativePath = file.replace(projectPath + '/', '');
    const content = readFileSync(file, 'utf-8');

    const references = TermParser.extractReferences(content, relativePath);

    for (const ref of references) {
      registry.addReference(ref);
      totalReferences++;
    }
  }

  const uniqueRefTerms = new Set(registry.references.map((r) => r.term));
  console.log(`   → ${totalReferences}개 참조 발견 (고유 용어: ${uniqueRefTerms.size}개)\n`);

  // Step 3: Validate
  console.log('✅ 검증 시작...\n');

  const result = registry.validate();

  // Print results
  printValidationResults(result);

  return result;
}

/**
 * Find all markdown files recursively
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
 * Print validation results
 */
function printValidationResults(result: ValidationResult): void {
  const { errors, warnings, stats } = result;

  // 1. Undefined terms
  const undefinedErrors = errors.filter((e) => e.type === 'undefined_term');
  if (undefinedErrors.length > 0) {
    console.log('❌ 1. 정의되지 않은 용어');
    console.log(`   → ${undefinedErrors.length}개 발견\n`);

    // Group by term
    const grouped = new Map<string, typeof undefinedErrors>();
    for (const error of undefinedErrors) {
      if (!grouped.has(error.term)) {
        grouped.set(error.term, []);
      }
      grouped.get(error.term)!.push(error);
    }

    for (const [term, errs] of grouped) {
      console.log(`   📝 "${term}"`);
      for (const err of errs.slice(0, 3)) {
        // Show max 3 locations
        console.log(`      - ${err.location?.file}:${err.location?.line}`);
      }
      if (errs.length > 3) {
        console.log(`      ... ${errs.length - 3}개 더`);
      }
      console.log();
    }
  } else {
    console.log('✅ 1. 정의되지 않은 용어');
    console.log(`   → 모든 참조 용어가 정의되었습니다\n`);
  }

  // 2. Scope violations
  const scopeErrors = errors.filter((e) => e.type === 'scope_violation');
  if (scopeErrors.length > 0) {
    console.log('❌ 2. 스코프 위반');
    console.log(`   → ${scopeErrors.length}개 발견\n`);

    for (const error of scopeErrors) {
      console.log(`   📝 "${error.term}" (document-scoped)`);
      console.log(`      ${error.location?.file}:${error.location?.line}`);
      console.log(`      ${error.suggestion}\n`);
    }
  } else {
    console.log('✅ 2. 스코프 위반');
    console.log(`   → 모든 용어가 올바른 스코프에서 사용되었습니다\n`);
  }

  // 3. Unused definitions
  const unusedWarnings = warnings.filter((w) => w.type === 'unused_definition');
  if (unusedWarnings.length > 0) {
    console.log('⚠️  3. 사용되지 않는 정의');
    console.log(`   → ${unusedWarnings.length}개 발견\n`);

    for (const warning of unusedWarnings) {
      console.log(`   📝 "${warning.term}"`);
      console.log(`      ${warning.location?.file}:${warning.location?.line}`);
    }
    console.log();
  } else {
    console.log('✅ 3. 사용되지 않는 정의');
    console.log(`   → 모든 정의가 사용되었습니다\n`);
  }

  // 4. Isolated terms (no relationships)
  const isolatedWarnings = warnings.filter((w) => w.type === 'isolated_term');
  if (isolatedWarnings.length > 0) {
    console.log('⚠️  4. 고립된 용어 (관계 없음)');
    console.log(`   → ${isolatedWarnings.length}개 발견\n`);

    for (const warning of isolatedWarnings) {
      console.log(`   🔗 ${warning.message}`);
      console.log(`      ${warning.location?.file}:${warning.location?.line}`);
      console.log(`      ${warning.suggestion}`);
    }
    console.log();
  } else {
    console.log('✅ 4. 고립된 용어');
    console.log(`   → 모든 용어가 다른 용어와 연결되었습니다\n`);
  }

  // 5. Duplicate terms (similar definitions)
  const duplicateWarnings = warnings.filter((w) => w.type === 'duplicate_term');
  if (duplicateWarnings.length > 0) {
    console.log('⚠️  5. 중복 가능성 (유사한 정의)');
    console.log(`   → ${duplicateWarnings.length}개 발견\n`);

    for (const warning of duplicateWarnings) {
      console.log(`   🔄 ${warning.message}`);
      console.log(`      ${warning.location?.file}:${warning.location?.line}`);
      console.log(`      ${warning.suggestion}`);
    }
    console.log();
  } else {
    console.log('✅ 5. 중복 가능성');
    console.log(`   → 중복된 정의 없음\n`);
  }

  // Summary
  console.log('━'.repeat(80));
  console.log('📊 검증 요약\n');

  console.log(`정의된 용어: ${stats.totalDefinitions}개`);
  console.log(`  - Global: ${stats.globalDefinitions}개`);
  console.log(`  - Document: ${stats.documentDefinitions}개`);
  console.log();

  console.log(`참조: ${stats.totalReferences}개 (고유 용어: ${stats.uniqueReferences}개)`);
  console.log();

  console.log(`미정의 용어: ${stats.undefinedTerms}개`);
  console.log(`미사용 정의: ${stats.unusedDefinitions}개`);
  console.log(`고립된 용어: ${stats.isolatedTerms}개`);
  console.log();

  console.log(`에러: ${errors.length}개`);
  console.log(`경고: ${warnings.length}개`);
  console.log();

  if (result.success) {
    console.log('✅ 용어 검증 통과');
  } else {
    console.log('❌ 용어 검증 실패 - 에러를 수정하세요');
  }
}
