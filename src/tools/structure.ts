import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ValidationOptions } from '../shared/types.js';
import type { MdocConfig } from '../types/config.js';
import { fileExists, getMarkdownFiles } from '../shared/utils.js';
import { loadConfig } from '../utils/config.js';

/**
 * Structure validation result
 */
export interface StructureValidationResult {
  success: boolean;
  totalErrors: number;
  circularDependencies: CircularDependency[];
  interfaceErrors: InterfaceError[];
  frontmatterErrors: FrontmatterError[];
  exampleCodeErrors: ExampleCodeError[];
  sharedTypeErrors: SharedTypeError[];
}

export interface CircularDependency {
  cycle: string[];
  message: string;
}

export interface InterfaceError {
  file: string;
  type: 'from_not_found' | 'to_not_found' | 'not_referenced';
  message: string;
}

export interface FrontmatterError {
  file: string;
  field: string;
  message: string;
}

export interface ExampleCodeError {
  file: string;
  message: string;
}

export interface SharedTypeError {
  file: string;
  type: 'format' | 'sorting' | 'duplicate' | 'frontmatter' | 'reference' | 'length' | 'complexity';
  message: string;
}

/**
 * Extract frontmatter field value
 */
function extractFrontmatterField(content: string, field: string): string | null {
  const regex = new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract frontmatter array field
 */
function extractFrontmatterArray(content: string, field: string): string[] {
  const lines = content.split('\n');
  const fieldIndex = lines.findIndex((line) => line.trim().startsWith(`${field}:`));

  if (fieldIndex === -1) return [];

  const result: string[] = [];
  for (let i = fieldIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('- ')) break;

    const value = line.replace(/^-\s*"?/, '').replace(/"?\s*$/, '');
    result.push(value);
  }

  return result;
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies(projectPath: string): CircularDependency[] {
  const dependencies: CircularDependency[] = [];
  const featuresPath = join(projectPath, 'tasks', 'features');

  if (!fileExists(featuresPath)) {
    return dependencies;
  }

  const featureFiles = getMarkdownFiles(featuresPath);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  /**
   * DFS to detect cycles
   */
  function detectCycle(featureName: string, path: string[]): boolean {
    if (recursionStack.has(featureName)) {
      // Found cycle
      const cycleStart = path.indexOf(featureName);
      const cycle = [...path.slice(cycleStart), featureName];
      dependencies.push({
        cycle,
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
      });
      return true;
    }

    if (visited.has(featureName)) {
      return false;
    }

    visited.add(featureName);
    recursionStack.add(featureName);

    // Read feature file and get dependencies
    const featureFile = join(featuresPath, `${featureName}.md`);
    if (fileExists(featureFile)) {
      const content = readFileSync(featureFile, 'utf-8');
      const deps = extractFrontmatterArray(content, 'dependencies');

      for (const dep of deps) {
        if (detectCycle(dep, [...path, featureName])) {
          return true;
        }
      }
    }

    recursionStack.delete(featureName);
    return false;
  }

  // Check each feature
  for (const file of featureFiles) {
    const featureName = basename(file, '.md');
    if (!visited.has(featureName)) {
      detectCycle(featureName, []);
    }
  }

  return dependencies;
}

/**
 * Check interface consistency
 */
function checkInterfaceConsistency(projectPath: string): InterfaceError[] {
  const errors: InterfaceError[] = [];
  const interfacesPath = join(projectPath, 'tasks', 'interfaces');
  const featuresPath = join(projectPath, 'tasks', 'features');

  if (!fileExists(interfacesPath)) {
    return errors;
  }

  const interfaceFiles = getMarkdownFiles(interfacesPath);

  for (const interfaceFile of interfaceFiles) {
    const interfaceName = basename(interfaceFile, '.md');
    const content = readFileSync(interfaceFile, 'utf-8');

    // Extract from and to
    const from = extractFrontmatterField(content, 'from');
    const to = extractFrontmatterField(content, 'to');

    if (from) {
      const fromFile = join(featuresPath, `${from}.md`);
      if (!fileExists(fromFile)) {
        errors.push({
          file: interfaceName,
          type: 'from_not_found',
          message: `from feature not found (${from})`,
        });
      } else {
        // Check if interface is referenced in from feature
        const fromContent = readFileSync(fromFile, 'utf-8');
        if (!fromContent.includes(interfaceName)) {
          errors.push({
            file: interfaceName,
            type: 'not_referenced',
            message: `not referenced in ${from}`,
          });
        }
      }
    }

    if (to) {
      const toFile = join(featuresPath, `${to}.md`);
      if (!fileExists(toFile)) {
        errors.push({
          file: interfaceName,
          type: 'to_not_found',
          message: `to feature not found (${to})`,
        });
      }
    }
  }

  return errors;
}

/**
 * Check frontmatter required fields
 */
function checkFrontmatterFields(projectPath: string): FrontmatterError[] {
  const errors: FrontmatterError[] = [];
  const tasksPath = join(projectPath, 'tasks');

  // Check features
  const featuresPath = join(tasksPath, 'features');
  if (fileExists(featuresPath)) {
    const featureFiles = getMarkdownFiles(featuresPath);
    const requiredFields = ['feature', 'status', 'entry_point'];

    for (const filePath of featureFiles) {
      const fileName = basename(filePath);
      const content = readFileSync(filePath, 'utf-8');

      for (const field of requiredFields) {
        const value = extractFrontmatterField(content, field);
        if (!value) {
          errors.push({
            file: `features/${fileName}`,
            field,
            message: `missing '${field}' field`,
          });
        }
      }
    }
  }

  // Check interfaces
  const interfacesPath = join(tasksPath, 'interfaces');
  if (fileExists(interfacesPath)) {
    const interfaceFiles = getMarkdownFiles(interfacesPath);
    const requiredFields = ['from', 'to', 'type'];

    for (const filePath of interfaceFiles) {
      const fileName = basename(filePath);
      const content = readFileSync(filePath, 'utf-8');

      for (const field of requiredFields) {
        const value = extractFrontmatterField(content, field);
        if (!value) {
          errors.push({
            file: `interfaces/${fileName}`,
            field,
            message: `missing '${field}' field`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Check for example code (prohibited in interfaces)
 */
function checkExampleCode(projectPath: string): ExampleCodeError[] {
  const errors: ExampleCodeError[] = [];
  const interfacesPath = join(projectPath, 'tasks', 'interfaces');

  if (!fileExists(interfacesPath)) {
    return errors;
  }

  const interfaceFiles = getMarkdownFiles(interfacesPath);

  for (const filePath of interfaceFiles) {
    const fileName = basename(filePath);
    const content = readFileSync(filePath, 'utf-8');

    // Check for example sections (Korean)
    if (/^##.*[예예]시/m.test(content)) {
      errors.push({
        file: `interfaces/${fileName}`,
        message: 'contains example section (예시 금지)',
      });
    }

    // Check for common code patterns
    if (/await|const.*=|\.then\(/.test(content)) {
      errors.push({
        file: `interfaces/${fileName}`,
        message: 'possibly contains example code',
      });
    }
  }

  return errors;
}

/**
 * Check shared type structure
 */
function checkSharedTypeStructure(projectPath: string, config?: MdocConfig): SharedTypeError[] {
  const errors: SharedTypeError[] = [];
  const sharedPath = join(projectPath, 'tasks', 'shared');

  if (!fileExists(sharedPath)) {
    return errors;
  }

  const sharedFiles = getMarkdownFiles(sharedPath);
  const cfg = config || loadConfig(projectPath);

  for (const filePath of sharedFiles) {
    const fileName = basename(filePath);
    const fileBaseName = basename(filePath, '.md');
    const content = readFileSync(filePath, 'utf-8');

    // Check for underscore (shared type identifier)
    if (!fileBaseName.includes('_')) {
      errors.push({
        file: `shared/${fileName}`,
        type: 'format',
        message: '공용 타입 파일명에 _ 구분자 없음',
      });
      continue;
    }

    // Split into pairs
    const pairs = fileBaseName.split('_');
    const pairPattern = /^[0-9]{2}--[0-9]{2}$/;

    // Validate each pair format
    for (const pair of pairs) {
      if (!pairPattern.test(pair)) {
        errors.push({
          file: `shared/${fileName}`,
          type: 'format',
          message: `잘못된 쌍 형식 (${pair})`,
        });
      }
    }

    // Check for duplicate pairs
    const uniquePairs = new Set(pairs);
    if (pairs.length !== uniquePairs.size) {
      errors.push({
        file: `shared/${fileName}`,
        type: 'duplicate',
        message: '중복된 쌍 존재',
      });
    }

    // Check sorting
    const sortedPairs = [...pairs].sort();
    if (JSON.stringify(pairs) !== JSON.stringify(sortedPairs)) {
      errors.push({
        file: `shared/${fileName}`,
        type: 'sorting',
        message: `쌍이 정렬되지 않음 (정렬 후: ${sortedPairs.join('_')})`,
      });
    }

    // Check frontmatter
    const interfaces = extractFrontmatterArray(content, 'interfaces');
    if (interfaces.length === 0) {
      errors.push({
        file: `shared/${fileName}`,
        type: 'frontmatter',
        message: 'interfaces 필드 누락',
      });
    } else {
      // Check pairs count complexity (based on filename pairs, not interfaces array)
      if (cfg.validation?.sharedTypes?.warnAtPairs && cfg.validation?.sharedTypes?.maxPairs) {
        if (pairs.length >= cfg.validation.sharedTypes.maxPairs) {
          errors.push({
            file: `shared/${fileName}`,
            type: 'complexity',
            message: `연결된 쌍이 너무 많음 (${pairs.length}개, 최대 ${cfg.validation.sharedTypes.maxPairs}개). Global type으로 격상 권장`,
          });
        } else if (pairs.length >= cfg.validation.sharedTypes.warnAtPairs) {
          errors.push({
            file: `shared/${fileName}`,
            type: 'complexity',
            message: `⚠️  연결된 쌍 개수 경고 (${pairs.length}개, ${cfg.validation.sharedTypes.maxPairs}개 이상 시 Global type 권장)`,
          });
        }
      }

      // Check interfaces count matches pairs count
      if (interfaces.length !== pairs.length) {
        errors.push({
          file: `shared/${fileName}`,
          type: 'frontmatter',
          message: `interfaces 개수(${interfaces.length})와 파일명 쌍 개수(${pairs.length}) 불일치`,
        });
      }

      // Check each pair is in interfaces
      for (const pair of pairs) {
        if (!interfaces.includes(pair)) {
          errors.push({
            file: `shared/${fileName}`,
            type: 'reference',
            message: `파일명에 ${pair} 있지만 interfaces에 없음`,
          });
        }
      }

      // Check interfaces sorting
      const sortedInterfaces = [...interfaces].sort();
      if (JSON.stringify(interfaces) !== JSON.stringify(sortedInterfaces)) {
        errors.push({
          file: `shared/${fileName}`,
          type: 'frontmatter',
          message: 'interfaces가 정렬되지 않음',
        });
      }
    }

    // Check type field
    const typeField = extractFrontmatterField(content, 'type');
    if (typeField !== 'shared') {
      errors.push({
        file: `shared/${fileName}`,
        type: 'frontmatter',
        message: 'type이 "shared"가 아님',
      });
    }

    // Check status field
    const statusField = extractFrontmatterField(content, 'status');
    if (!statusField) {
      errors.push({
        file: `shared/${fileName}`,
        type: 'frontmatter',
        message: 'status 필드 누락',
      });
    }
  }

  return errors;
}

/**
 * Validate structure
 */
export async function validateStructure(
  options: ValidationOptions = {}
): Promise<StructureValidationResult> {
  const projectPath = options.projectPath || process.cwd();
  const config = loadConfig(projectPath);

  console.log('🔍 Tasks 구조 검증');
  console.log('========================\n');

  // 1. Circular dependencies
  console.log('1️⃣  순환 의존성 검사...');
  const circularDeps = checkCircularDependencies(projectPath);
  if (circularDeps.length === 0) {
    console.log('✅ 순환 의존성 없음');
  } else {
    console.log('⚠️  순환 의존성 발견됨');
    for (const dep of circularDeps) {
      console.log(`❌ ${dep.message}`);
    }
  }
  console.log('');

  // 2. Interface consistency
  console.log('2️⃣  인터페이스 일관성 검사...');
  const interfaceErrors = checkInterfaceConsistency(projectPath);
  if (interfaceErrors.length === 0) {
    console.log('✅ 인터페이스 일관성 확인');
  } else {
    console.log('⚠️  인터페이스 불일치 발견');
    for (const error of interfaceErrors) {
      console.log(`❌ ${error.file}: ${error.message}`);
    }
  }
  console.log('');

  // 3. Frontmatter fields
  console.log('3️⃣  Frontmatter 필수 필드 검사...');
  const frontmatterErrors = checkFrontmatterFields(projectPath);
  if (frontmatterErrors.length === 0) {
    console.log('✅ Frontmatter 필드 완전');
  } else {
    console.log('⚠️  누락된 필드 있음');
    for (const error of frontmatterErrors) {
      console.log(`❌ ${error.file}: ${error.message}`);
    }
  }
  console.log('');

  // 4. Example code
  console.log('4️⃣  예시 코드 금지 검사...');
  const exampleErrors = checkExampleCode(projectPath);
  if (exampleErrors.length === 0) {
    console.log('✅ 예시 코드 없음');
  } else {
    console.log('⚠️  예시 코드 발견');
    for (const error of exampleErrors) {
      console.log(`❌ ${error.file}: ${error.message}`);
    }
  }
  console.log('');

  // 5. Shared type structure
  console.log('5️⃣  공용 타입 구조 검증...');
  const sharedErrors = checkSharedTypeStructure(projectPath, config);
  if (sharedErrors.length === 0) {
    console.log('✅ 공용 타입 구조 검증 통과');
  } else {
    console.log(`❌ 공용 타입 오류: ${sharedErrors.length}개 발견`);
    for (const error of sharedErrors) {
      console.log(`${error.type === 'complexity' && error.message.startsWith('⚠️') ? '⚠️' : '❌'} ${error.file}: ${error.message}`);
    }
  }
  console.log('');

  // Summary
  const totalErrors =
    circularDeps.length +
    interfaceErrors.length +
    frontmatterErrors.length +
    exampleErrors.length +
    sharedErrors.length;

  console.log('========================');
  if (totalErrors === 0) {
    console.log('✅ 모든 검증 통과');
  } else {
    console.log(`❌ ${totalErrors}개 오류 발견`);
  }

  return {
    success: totalErrors === 0,
    totalErrors,
    circularDependencies: circularDeps,
    interfaceErrors,
    frontmatterErrors,
    exampleCodeErrors: exampleErrors,
    sharedTypeErrors: sharedErrors,
  };
}
