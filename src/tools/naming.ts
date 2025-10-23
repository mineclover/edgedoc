import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  NamingError,
  NamingOptions,
  NamingValidationResult,
  NamingWarning,
} from '../shared/types.js';
import { fileExists, getMarkdownFiles } from '../shared/utils.js';

/**
 * 쌍 정규화 (XX--YY → 작은 숫자가 앞으로)
 */
function normalizePair(pair: string): string {
  const parts = pair.split('--');
  if (parts.length !== 2) return pair;

  const [a, b] = parts;
  return a <= b ? pair : `${b}--${a}`;
}

/**
 * 인터페이스 파일명 검증 (XX--YY.md)
 */
function validateInterfaceName(filename: string): NamingError[] {
  const errors: NamingError[] = [];
  const basename = filename.replace('.md', '');

  // 형식 검증: XX--YY (2자리--2자리)
  const pattern = /^[0-9]{2}--[0-9]{2}$/;
  if (!pattern.test(basename)) {
    errors.push({
      file: filename,
      type: 'format',
      message: `인터페이스 파일명 형식 오류 (올바른 형식: XX--YY.md)`,
    });
    return errors;
  }

  // 쌍 내부 정렬 확인 (01--02 vs 02--01)
  const normalized = normalizePair(basename);
  if (basename !== normalized) {
    errors.push({
      file: filename,
      type: 'sorting',
      message: `쌍 내부가 정렬되지 않음 (올바른 형식: ${normalized}.md)`,
    });
  }

  return errors;
}

/**
 * 공용 타입 파일명 검증 (XX--YY_YY--ZZ.md)
 */
function validateSharedTypeName(filename: string): {
  errors: NamingError[];
  warnings: NamingWarning[];
} {
  const errors: NamingError[] = [];
  const warnings: NamingWarning[] = [];
  const basename = filename.replace('.md', '');

  // _ 포함 여부 확인 (공용 타입 식별자)
  if (!basename.includes('_')) {
    errors.push({
      file: filename,
      type: 'format',
      message: `공용 타입은 '_' 구분자를 포함해야 함`,
    });
    return { errors, warnings };
  }

  // 각 쌍 추출
  const pairs = basename.split('_');
  const pairPattern = /^[0-9]{2}--[0-9]{2}$/;

  // 각 쌍이 XX--YY 형식인지 확인
  for (const pair of pairs) {
    if (!pairPattern.test(pair)) {
      errors.push({
        file: filename,
        type: 'format',
        message: `쌍 '${pair}'이 올바른 형식이 아님 (올바른 형식: XX--YY)`,
      });
    }
  }

  // 각 쌍 내부 정렬 확인 (01--02 vs 02--01)
  const normalizedPairs = pairs.map(normalizePair);
  const hasUnnormalizedPairs = pairs.some((pair, idx) => pair !== normalizedPairs[idx]);

  if (hasUnnormalizedPairs) {
    const normalizedName = `${normalizedPairs.sort().join('_')}.md`;
    errors.push({
      file: filename,
      type: 'sorting',
      message: `쌍 내부가 정렬되지 않음 (올바른 형식: ${normalizedName})`,
    });
  }

  // 중복 쌍 확인 (정규화 후)
  const uniqueNormalizedPairs = new Set(normalizedPairs);
  if (uniqueNormalizedPairs.size !== normalizedPairs.length) {
    errors.push({
      file: filename,
      type: 'duplicate',
      message: `중복된 쌍 존재 (01--02와 02--01은 동일)`,
    });
  }

  // 쌍 간 정렬 확인 (정규화된 쌍 기준)
  const sortedNormalizedPairs = [...normalizedPairs].sort();
  const isPairsSorted = normalizedPairs.every((pair, idx) => pair === sortedNormalizedPairs[idx]);

  if (!isPairsSorted && !hasUnnormalizedPairs) {
    const sortedName = `${sortedNormalizedPairs.join('_')}.md`;
    errors.push({
      file: filename,
      type: 'sorting',
      message: `쌍이 정렬되지 않음 (정렬 후: ${sortedName})`,
    });
  }

  return { errors, warnings };
}

/**
 * Frontmatter 파싱
 */
function parseFrontmatter(content: string): Record<string, string | string[]> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter: Record<string, string | string[]> = {};
  const lines = match[1].split('\n');

  let currentKey = '';
  let currentArray: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('-')) {
      // 배열 항목
      const value = line.trim().substring(1).trim().replace(/['"]/g, '');
      currentArray.push(value);
    } else if (line.includes(':')) {
      // 배열이 있었다면 저장
      if (currentKey && currentArray.length > 0) {
        frontmatter[currentKey] = currentArray;
        currentArray = [];
      }

      // 새 키-값
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/['"]/g, '');
      currentKey = key.trim();

      if (value) {
        frontmatter[currentKey] = value;
      }
    }
  }

  // 마지막 배열 저장
  if (currentKey && currentArray.length > 0) {
    frontmatter[currentKey] = currentArray;
  }

  return frontmatter;
}

/**
 * 공용 타입 Frontmatter 검증
 */
function validateSharedTypeFrontmatter(
  filepath: string,
  filename: string
): { errors: NamingError[]; warnings: NamingWarning[] } {
  const errors: NamingError[] = [];
  const warnings: NamingWarning[] = [];

  try {
    const content = readFileSync(filepath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push({
        file: filename,
        type: 'frontmatter',
        message: 'Frontmatter 없음',
      });
      return { errors, warnings };
    }

    // interfaces 필드 확인
    if (!frontmatter.interfaces || !Array.isArray(frontmatter.interfaces)) {
      errors.push({
        file: filename,
        type: 'frontmatter',
        message: 'interfaces 필드가 없거나 배열이 아님',
      });
    } else {
      // interfaces 배열과 파일명 쌍 개수 일치 확인
      const basename = filename.replace('.md', '');
      const pairs = basename.split('_');

      if (frontmatter.interfaces.length !== pairs.length) {
        errors.push({
          file: filename,
          type: 'frontmatter',
          message: `interfaces 개수(${frontmatter.interfaces.length})와 파일명 쌍 개수(${pairs.length}) 불일치`,
        });
      }

      // interfaces 정렬 확인
      const sortedInterfaces = [...frontmatter.interfaces].sort();
      const isSorted = frontmatter.interfaces.every(
        (iface: string, idx: number) => iface === sortedInterfaces[idx]
      );

      if (!isSorted) {
        warnings.push({
          file: filename,
          type: 'sorting',
          message: 'interfaces가 정렬되지 않음',
        });
      }
    }

    // type 필드 확인
    if (frontmatter.type !== 'shared') {
      errors.push({
        file: filename,
        type: 'frontmatter',
        message: `type이 "shared"가 아님 (현재: ${frontmatter.type})`,
      });
    }

    // status 필드 확인
    if (!frontmatter.status) {
      errors.push({
        file: filename,
        type: 'frontmatter',
        message: 'status 필드 없음',
      });
    }
  } catch (error) {
    errors.push({
      file: filename,
      type: 'frontmatter',
      message: `파일 읽기 오류: ${error}`,
    });
  }

  return { errors, warnings };
}

/**
 * 양방향 참조 검증 (shared type ↔ interface)
 */
function validateBidirectionalReferences(tasksDir: string): {
  errors: NamingError[];
  warnings: NamingWarning[];
} {
  const errors: NamingError[] = [];
  const warnings: NamingWarning[] = [];

  const sharedDir = join(tasksDir, 'shared');
  const interfacesDir = join(tasksDir, 'interfaces');

  if (!fileExists(sharedDir) || !fileExists(interfacesDir)) {
    return { errors, warnings };
  }

  // Build map: shared type filename → interfaces[]
  const sharedTypeMap = new Map<string, string[]>();
  const sharedFiles = getMarkdownFiles(sharedDir);

  for (const filepath of sharedFiles) {
    const filename = filepath.split('/').pop()?.replace('.md', '') || '';
    const content = readFileSync(filepath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (frontmatter?.interfaces && Array.isArray(frontmatter.interfaces)) {
      sharedTypeMap.set(filename, frontmatter.interfaces);
    }
  }

  // Build map: interface filename → shared_types[]
  const interfaceMap = new Map<string, string[]>();
  const interfaceFiles = getMarkdownFiles(interfacesDir);

  for (const filepath of interfaceFiles) {
    const filename = filepath.split('/').pop()?.replace('.md', '') || '';
    const content = readFileSync(filepath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (frontmatter?.shared_types && Array.isArray(frontmatter.shared_types)) {
      interfaceMap.set(filename, frontmatter.shared_types);
    }
  }

  // Check: For each interface's shared_types, verify the shared type includes this interface
  for (const [interfaceName, sharedTypeList] of interfaceMap.entries()) {
    for (const sharedTypeName of sharedTypeList) {
      const sharedTypeInterfaces = sharedTypeMap.get(sharedTypeName);

      if (!sharedTypeInterfaces) {
        errors.push({
          file: `interfaces/${interfaceName}.md`,
          type: 'reference',
          message: `shared_types에 "${sharedTypeName}"를 참조하지만 해당 파일이 없음`,
        });
        continue;
      }

      if (!sharedTypeInterfaces.includes(interfaceName)) {
        errors.push({
          file: `interfaces/${interfaceName}.md`,
          type: 'reference',
          message: `shared_types에 "${sharedTypeName}"를 참조하지만 ${sharedTypeName}.md의 interfaces에 "${interfaceName}" 없음`,
        });
      }
    }
  }

  // Check: For each shared type's interfaces, verify the interface includes this shared type
  for (const [sharedTypeName, interfaces] of sharedTypeMap.entries()) {
    for (const interfaceName of interfaces) {
      const interfaceSharedTypes = interfaceMap.get(interfaceName);

      if (!interfaceSharedTypes) {
        warnings.push({
          file: `shared/${sharedTypeName}.md`,
          type: 'reference',
          message: `interfaces에 "${interfaceName}"를 포함하지만 해당 인터페이스가 없거나 shared_types 필드 없음`,
        });
        continue;
      }

      if (!interfaceSharedTypes.includes(sharedTypeName)) {
        errors.push({
          file: `shared/${sharedTypeName}.md`,
          type: 'reference',
          message: `interfaces에 "${interfaceName}"를 포함하지만 ${interfaceName}.md의 shared_types에 "${sharedTypeName}" 없음`,
        });
      }
    }
  }

  return { errors, warnings };
}

/**
 * 네이밍 컨벤션 검증
 */
export async function validateNaming(options: NamingOptions = {}): Promise<NamingValidationResult> {
  console.log('🔍 네이밍 컨벤션 검증 시작...\n');

  const projectDir = options.projectPath || process.cwd();
  const tasksDir = join(projectDir, 'tasks');

  if (!fileExists(tasksDir)) {
    console.log('⚠️  tasks/ 없음 - 검증 스킵');
    return {
      success: true,
      totalFiles: 0,
      passedFiles: 0,
      failedFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      errors: [],
      warnings: [],
    };
  }

  const allErrors: NamingError[] = [];
  const allWarnings: NamingWarning[] = [];
  let totalFiles = 0;
  let passedFiles = 0;

  // 인터페이스 파일 검증
  console.log('📂 Interfaces 검증');
  console.log('━'.repeat(40));

  const interfacesDir = join(tasksDir, 'interfaces');
  if (fileExists(interfacesDir)) {
    const interfaceFiles = getMarkdownFiles(interfacesDir);

    for (const filepath of interfaceFiles) {
      const filename = filepath.split('/').pop() || '';
      totalFiles++;

      console.log(`\n📄 ${filename}`);

      const errors = validateInterfaceName(filename);

      if (errors.length > 0) {
        allErrors.push(...errors);
        for (const error of errors) {
          console.log(`  ❌ ${error.message}`);
        }
      } else {
        console.log('  ✅ 통과');
        passedFiles++;
      }
    }
  }

  // 공용 타입 파일 검증
  console.log('\n\n📂 Shared Types 검증');
  console.log('━'.repeat(40));

  const sharedDir = join(tasksDir, 'shared');
  if (fileExists(sharedDir)) {
    const sharedFiles = getMarkdownFiles(sharedDir);

    for (const filepath of sharedFiles) {
      const filename = filepath.split('/').pop() || '';
      totalFiles++;

      console.log(`\n📄 ${filename}`);

      // 파일명 검증
      const { errors: nameErrors, warnings: nameWarnings } = validateSharedTypeName(filename);
      allErrors.push(...nameErrors);
      allWarnings.push(...nameWarnings);

      // Frontmatter 검증
      const { errors: fmErrors, warnings: fmWarnings } = validateSharedTypeFrontmatter(
        filepath,
        filename
      );
      allErrors.push(...fmErrors);
      allWarnings.push(...fmWarnings);

      const totalFileErrors = nameErrors.length + fmErrors.length;
      const totalFileWarnings = nameWarnings.length + fmWarnings.length;

      if (totalFileErrors > 0) {
        for (const error of [...nameErrors, ...fmErrors]) {
          console.log(`  ❌ ${error.message}`);
        }
      }

      if (totalFileWarnings > 0) {
        for (const warning of [...nameWarnings, ...fmWarnings]) {
          console.log(`  ⚠️  ${warning.message}`);
        }
      }

      if (totalFileErrors === 0) {
        if (totalFileWarnings === 0) {
          console.log('  ✅ 통과');
        } else {
          console.log('  ✅ 통과 (경고 있음)');
        }
        passedFiles++;
      }
    }
  }

  // 양방향 참조 검증
  console.log('\n\n📂 양방향 참조 검증 (Shared Type ↔ Interface)');
  console.log('━'.repeat(40));

  const { errors: refErrors, warnings: refWarnings } = validateBidirectionalReferences(tasksDir);
  allErrors.push(...refErrors);
  allWarnings.push(...refWarnings);

  if (refErrors.length > 0) {
    console.log('\n❌ 참조 불일치 발견:');
    for (const error of refErrors) {
      console.log(`  ❌ ${error.file}: ${error.message}`);
    }
  }

  if (refWarnings.length > 0) {
    console.log('\n⚠️  참조 경고:');
    for (const warning of refWarnings) {
      console.log(`  ⚠️  ${warning.file}: ${warning.message}`);
    }
  }

  if (refErrors.length === 0 && refWarnings.length === 0) {
    console.log('✅ 모든 참조 일치');
  }

  // 결과 출력
  console.log(`\n${'━'.repeat(40)}`);
  console.log('📊 검증 결과\n');
  console.log('문서:');
  console.log(`  전체: ${totalFiles}`);
  console.log(`  통과: ${passedFiles}`);
  console.log(`  실패: ${totalFiles - passedFiles}`);
  console.log();
  console.log('이슈:');
  console.log(`  에러: ${allErrors.length}`);
  console.log(`  경고: ${allWarnings.length}`);
  console.log();

  const success = allErrors.length === 0;

  if (success) {
    if (allWarnings.length === 0) {
      console.log('✅ 네이밍 컨벤션 검증 통과');
    } else {
      console.log(`✅ 네이밍 컨벤션 검증 통과 (경고 ${allWarnings.length}개)`);
    }
  } else {
    console.log(`❌ ${allErrors.length}개 에러 발견`);
    console.log('\n힌트:');
    console.log('  - 인터페이스: XX--YY.md 형식 사용');
    console.log('  - 공용 타입: XX--YY_YY--ZZ.md 형식 사용 (정렬 필수)');
    console.log('  - Frontmatter 필수 필드 확인');
  }

  return {
    success,
    totalFiles,
    passedFiles,
    failedFiles: totalFiles - passedFiles,
    totalErrors: allErrors.length,
    totalWarnings: allWarnings.length,
    errors: allErrors,
    warnings: allWarnings,
  };
}
