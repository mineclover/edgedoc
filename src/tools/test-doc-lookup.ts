/**
 * Test-Document Reference Lookup
 *
 * @feature 17_TestDocLookup
 * @doc tasks/features/17_TestDocLookup.md
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { loadConfig } from '../utils/config.js';
import { getDocsPath } from '../types/config.js';

/**
 * Parse YAML frontmatter
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  let currentKey = '';
  let currentArray: any[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('-')) {
      // Array item
      const value = line.trim().substring(1).trim().replace(/['"]/g, '');
      currentArray.push(value);
    } else if (line.includes(':')) {
      // Save previous array if exists
      if (currentKey && currentArray.length > 0) {
        result[currentKey] = currentArray;
        currentArray = [];
      }

      // New key-value
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/['"]/g, '');
      currentKey = key.trim();

      if (value) {
        // Try to parse numbers
        if (!isNaN(Number(value))) {
          result[currentKey] = Number(value);
        } else {
          result[currentKey] = value;
        }
      }
    }
  }

  // Save last array
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

export interface TestReference {
  featureId: string;
  docPath: string;
  testFiles: string[];
  coverage?: {
    functions?: number;
    lines?: number;
  };
}

export interface DocReference {
  testFile: string;
  featureId?: string;
  docPath?: string;
  relatedFeatures?: string[];
}

export interface CoverageReport {
  total: number;
  tested: number;
  untested: number;
  features: {
    featureId: string;
    docPath: string;
    tested: boolean;
    testFiles: string[];
    coverage?: {
      functions?: number;
      lines?: number;
    };
  }[];
}

export interface SyncValidationResult {
  valid: TestReference[];
  errors: {
    type: 'missing_test_file' | 'missing_feature_annotation' | 'file_not_found';
    message: string;
    file: string;
    line?: number;
  }[];
  warnings: {
    type: 'no_tests' | 'incomplete_coverage';
    message: string;
    featureId: string;
    docPath: string;
  }[];
}

/**
 * Find test files for a given feature
 */
export function findTestsForFeature(
  featureId: string,
  projectPath: string = process.cwd()
): TestReference | null {
  // Look for feature document
  const featureFile = findFeatureDoc(featureId, projectPath);
  if (!featureFile) {
    return null;
  }

  // Parse frontmatter
  const content = readFileSync(featureFile, 'utf-8');
  const data = parseFrontmatter(content);

  if (!data.test_files || data.test_files.length === 0) {
    return null;
  }

  return {
    featureId,
    docPath: relative(projectPath, featureFile),
    testFiles: data.test_files,
    coverage: data.test_coverage,
  };
}

/**
 * Find feature documentation for a given test file
 */
export function findDocForTest(
  testFile: string,
  projectPath: string = process.cwd()
): DocReference | null {
  const fullPath = join(projectPath, testFile);
  if (!existsSync(fullPath)) {
    return null;
  }

  // Parse JSDoc annotations
  const content = readFileSync(fullPath, 'utf-8');
  const featureMatch = content.match(/@feature\s+(\S+)/);
  const docMatch = content.match(/@doc\s+(\S+)/);
  const relatedMatch = content.match(/@related\s+(.+)/);

  if (!featureMatch) {
    return null;
  }

  return {
    testFile,
    featureId: featureMatch[1],
    docPath: docMatch?.[1],
    relatedFeatures: relatedMatch?.[1].split(/\s*,\s*/),
  };
}

/**
 * Generate test coverage report
 */
export function generateCoverageReport(
  projectPath: string = process.cwd(),
  options: { featureId?: string; missingOnly?: boolean } = {}
): CoverageReport {
  const features = collectAllFeatures(projectPath);

  let filteredFeatures = features;

  if (options.featureId) {
    filteredFeatures = features.filter(f => f.featureId === options.featureId);
  }

  if (options.missingOnly) {
    filteredFeatures = features.filter(f => !f.tested);
  }

  return {
    total: features.length,
    tested: features.filter(f => f.tested).length,
    untested: features.filter(f => !f.tested).length,
    features: filteredFeatures,
  };
}

/**
 * Validate test-doc synchronization
 */
export function validateTestDocSync(
  projectPath: string = process.cwd()
): SyncValidationResult {
  const features = collectAllFeatures(projectPath);
  const testFiles = collectAllTestFiles(projectPath);

  const valid: TestReference[] = [];
  const errors: SyncValidationResult['errors'] = [];
  const warnings: SyncValidationResult['warnings'] = [];

  // Check features with test_files
  for (const feature of features) {
    if (!feature.tested) {
      // Check if feature is implemented
      const docPath = join(projectPath, feature.docPath);
      const content = readFileSync(docPath, 'utf-8');
      const data = parseFrontmatter(content);

      if (data.status === 'implemented') {
        warnings.push({
          type: 'no_tests',
          message: `No test files specified`,
          featureId: feature.featureId,
          docPath: feature.docPath,
        });
      }
      continue;
    }

    // Validate test files exist
    let hasErrors = false;
    for (const testFile of feature.testFiles) {
      const fullPath = join(projectPath, testFile);
      if (!existsSync(fullPath)) {
        errors.push({
          type: 'file_not_found',
          message: `Test file not found: ${testFile}`,
          file: feature.docPath,
        });
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      valid.push({
        featureId: feature.featureId,
        docPath: feature.docPath,
        testFiles: feature.testFiles,
        coverage: feature.coverage,
      });
    }
  }

  // Check test files without @feature annotation
  for (const testFile of testFiles) {
    const docRef = findDocForTest(testFile, projectPath);
    if (!docRef || !docRef.featureId) {
      errors.push({
        type: 'missing_feature_annotation',
        message: `Test file missing @feature annotation`,
        file: testFile,
      });
    }
  }

  return { valid, errors, warnings };
}

/**
 * Collect all features from tasks/features/
 */
function collectAllFeatures(projectPath: string): CoverageReport['features'] {
  const config = loadConfig(projectPath);
  const featuresDir = join(projectPath, getDocsPath(config, 'features'));
  if (!existsSync(featuresDir)) {
    return [];
  }

  const files = readdirSync(featuresDir).filter(f => f.endsWith('.md'));
  const features: CoverageReport['features'] = [];

  for (const file of files) {
    const filePath = join(featuresDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const data = parseFrontmatter(content);

    const featureId = data.feature || file.replace('.md', '');
    const testFiles = data.test_files || [];
    const tested = testFiles.length > 0;

    features.push({
      featureId,
      docPath: relative(projectPath, filePath),
      tested,
      testFiles,
      coverage: data.test_coverage,
    });
  }

  return features;
}

/**
 * Collect all test files from tests/
 */
function collectAllTestFiles(projectPath: string): string[] {
  const testsDir = join(projectPath, 'tests');
  if (!existsSync(testsDir)) {
    return [];
  }

  const files: string[] = [];

  function walk(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.test.ts')) {
        files.push(relative(projectPath, fullPath));
      }
    }
  }

  walk(testsDir);
  return files;
}

/**
 * Find feature document by feature ID
 */
function findFeatureDoc(featureId: string, projectPath: string): string | null {
  const config = loadConfig(projectPath);
  const possiblePaths = [
    join(projectPath, getDocsPath(config, 'features'), `${featureId}.md`),
    join(projectPath, getDocsPath(config, 'interfaces'), `${featureId}.md`),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Print test reference results
 */
export function printTestReference(ref: TestReference | null, featureId: string): void {
  if (!ref) {
    console.log(`⚠️  No tests found for feature: ${featureId}`);
    return;
  }

  console.log(`🧪 Tests for ${ref.featureId}:`);
  for (const testFile of ref.testFiles) {
    console.log(`  - ${testFile}`);
  }

  if (ref.coverage) {
    console.log(`\n📊 Coverage:`);
    if (ref.coverage.functions !== undefined) {
      console.log(`  Functions: ${ref.coverage.functions.toFixed(2)}%`);
    }
    if (ref.coverage.lines !== undefined) {
      console.log(`  Lines: ${ref.coverage.lines.toFixed(2)}%`);
    }
  }
}

/**
 * Print doc reference results
 */
export function printDocReference(ref: DocReference | null, testFile: string): void {
  if (!ref || !ref.featureId) {
    console.log(`⚠️  No feature annotation found in: ${testFile}`);
    console.log(`\nAdd JSDoc annotation:`);
    console.log(`/**`);
    console.log(` * @feature <feature-id>`);
    console.log(` * @doc <doc-path>`);
    console.log(` */`);
    return;
  }

  console.log(`📄 Feature: ${ref.featureId}`);
  if (ref.docPath) {
    console.log(`   Doc: ${ref.docPath}`);
  }
  if (ref.relatedFeatures && ref.relatedFeatures.length > 0) {
    console.log(`\n🔗 Related:`);
    for (const related of ref.relatedFeatures) {
      console.log(`  - ${related}`);
    }
  }
}

/**
 * Print coverage report
 */
export function printCoverageReport(report: CoverageReport): void {
  console.log(`📊 Test Coverage Report\n`);
  console.log(`Total Features: ${report.total}`);
  console.log(`✅ Tested: ${report.tested} (${((report.tested / report.total) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Untested: ${report.untested} (${((report.untested / report.total) * 100).toFixed(1)}%)`);

  if (report.features.length > 0) {
    console.log(`\n─────────────────────────────────────────────`);

    for (const feature of report.features) {
      const status = feature.tested ? '✅' : '⚠️ ';
      console.log(`\n${status} ${feature.featureId}`);

      if (feature.tested) {
        for (const testFile of feature.testFiles) {
          console.log(`  - ${testFile}`);
        }

        if (feature.coverage) {
          let coverageStr = '  Coverage:';
          if (feature.coverage.functions !== undefined) {
            coverageStr += ` ${feature.coverage.functions.toFixed(1)}% functions`;
          }
          if (feature.coverage.lines !== undefined) {
            if (feature.coverage.functions !== undefined) coverageStr += ',';
            coverageStr += ` ${feature.coverage.lines.toFixed(1)}% lines`;
          }
          console.log(coverageStr);
        }
      } else {
        console.log(`  No tests`);
      }
    }
  }
}

/**
 * Print sync validation results
 */
export function printSyncValidation(result: SyncValidationResult): void {
  console.log(`✅ Synchronization Check\n`);

  if (result.valid.length > 0) {
    console.log(`Valid References:`);
    for (const ref of result.valid) {
      const testList = ref.testFiles.join(', ');
      console.log(`  - ${ref.featureId} ↔ ${testList}`);
    }
    console.log();
  }

  if (result.errors.length > 0) {
    console.log(`❌ Errors:\n`);
    for (const error of result.errors) {
      console.log(`  - ${error.message}`);
      console.log(`    ${error.file}${error.line ? `:${error.line}` : ''}`);

      if (error.type === 'missing_feature_annotation') {
        console.log(`    Add: @feature <feature-id>`);
      }
      console.log();
    }
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️  Warnings:\n`);
    for (const warning of result.warnings) {
      console.log(`  - ${warning.featureId} (${warning.docPath})`);
      console.log(`    ${warning.message}`);
      console.log(`    Consider adding tests`);
      console.log();
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`✅ All test-doc references are synchronized!`);
  }
}
