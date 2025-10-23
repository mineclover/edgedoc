import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FileResult, ValidationOptions, ValidationResult } from '../shared/types.js';
import {
  extractSections,
  extractTypeNames,
  fileExists,
  formatDateTime,
  getMarkdownFiles,
} from '../shared/utils.js';

/**
 * 파일 검증
 */
function validateFile(
  oldFile: string,
  newFile: string
): {
  sectionErrors: string[];
  typeErrors: string[];
} {
  const sectionErrors: string[] = [];
  const typeErrors: string[] = [];

  // 섹션 검증
  const oldSections = extractSections(oldFile);
  const newSections = extractSections(newFile);

  for (const section of oldSections) {
    if (!newSections.includes(section)) {
      sectionErrors.push(`Missing section: ${section}`);
    }
  }

  // 타입 검증
  const oldTypes = extractTypeNames(oldFile);
  const newTypes = extractTypeNames(newFile);

  for (const typeName of oldTypes) {
    if (!newTypes.has(typeName)) {
      typeErrors.push(`Missing type: ${typeName}`);
    }
  }

  return { sectionErrors, typeErrors };
}

/**
 * 마크다운 리포트 생성
 */
function generateMarkdownReport(result: ValidationResult, outputPath: string) {
  const lines: string[] = [];

  // 헤더
  lines.push('# 마이그레이션 검증 리포트\n');
  lines.push(`**날짜**: ${formatDateTime()}\n`);
  lines.push('**검증 대상**: tasks → tasks-v2\n');

  // 요약
  lines.push('---\n');
  lines.push('## 📊 요약\n');
  lines.push(`- **전체 문서**: ${result.totalFiles}`);
  lines.push(`- **통과**: ${result.passedFiles} ✅`);
  lines.push(`- **실패**: ${result.failedFiles} ❌`);
  lines.push(`- **전체 오류**: ${result.totalErrors}\n`);

  // 상태
  if (result.totalErrors === 0) {
    lines.push('**상태**: ✅ 모든 검증 통과\n');
  } else {
    lines.push(`**상태**: ❌ ${result.totalErrors}개 오류 발견\n`);
  }

  // 상세 결과
  lines.push('---\n');
  lines.push('## 📋 상세 결과\n');

  for (const [category, files] of Object.entries(result.details)) {
    lines.push(`### ${category}\n`);

    for (const fileResult of files) {
      const { filename, missing, sectionErrors, typeErrors } = fileResult;

      if (missing) {
        lines.push(`#### ❌ ${filename}\n`);
        lines.push('**파일 누락**\n');
        continue;
      }

      const hasErrors = sectionErrors.length > 0 || typeErrors.length > 0;

      if (hasErrors) {
        lines.push(`#### ❌ ${filename}\n`);

        if (sectionErrors.length > 0) {
          lines.push('**섹션 누락**:\n');
          for (const err of sectionErrors) {
            lines.push(`- ${err}`);
          }
          lines.push('');
        }

        if (typeErrors.length > 0) {
          lines.push('**타입 누락**:\n');
          for (const err of typeErrors) {
            lines.push(`- ${err}`);
          }
          lines.push('');
        }
      } else {
        lines.push(`#### ✅ ${filename}\n`);
      }
    }
  }

  // 힌트
  if (result.totalErrors > 0) {
    lines.push('---\n');
    lines.push('## 💡 해결 방법\n');
    lines.push('1. tasks에 있는 섹션을 tasks-v2에 복원하세요');
    lines.push('2. tasks에 있는 타입 정의를 tasks-v2에 복원하세요');
    lines.push('3. 누락된 파일을 tasks-v2에 복사하세요\n');
  }

  // 파일 쓰기
  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

/**
 * 마이그레이션 검증
 */
export async function validateMigration(
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  console.log('🔄 마이그레이션 검증 시작...\n');

  // 프로젝트 디렉토리 기준 (옵션으로 지정 가능)
  const projectDir = options.projectPath || process.cwd();

  // Load config
  const configPath = join(projectDir, 'mdoc.config.json');
  let config: any = {
    migration: {
      sourceDir: 'tasks',
      targetDir: 'tasks-v2',
    }
  };

  if (fileExists(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.warn(`⚠️  Failed to parse mdoc.config.json: ${error}`);
    }
  }

  const tasksDir = join(projectDir, config.migration.sourceDir);
  const tasksV2Dir = join(projectDir, config.migration.targetDir);

  console.log(`📁 프로젝트 경로: ${projectDir}\n`);

  // Check if target directory exists (if not, skip migration validation)
  if (!fileExists(tasksV2Dir)) {
    console.log(`⚠️  ${config.migration.targetDir}/ 없음 - 마이그레이션 검증 스킵`);
    return {
      success: true,
      totalFiles: 0,
      passedFiles: 0,
      failedFiles: 0,
      totalErrors: 0,
      details: {},
    };
  }

  let totalFiles = 0;
  let passedFiles = 0;
  let totalErrors = 0;
  const details: Record<string, FileResult[]> = {};

  // Features 검증
  console.log('📂 Features 검증');
  console.log('━'.repeat(40));

  details.Features = [];
  const featureFiles = getMarkdownFiles(join(tasksDir, 'features'));

  for (const oldFile of featureFiles) {
    const filename = oldFile.split('/').pop() || '';
    const newFile = join(tasksV2Dir, 'features', filename);
    totalFiles++;

    console.log(`\n📄 ${filename}`);

    const fileResult: FileResult = {
      filename,
      missing: false,
      sectionErrors: [],
      typeErrors: [],
    };

    if (!fileExists(newFile)) {
      console.log('  ❌ 파일 누락');
      totalErrors++;
      fileResult.missing = true;
      details.Features.push(fileResult);
      continue;
    }

    const { sectionErrors, typeErrors } = validateFile(oldFile, newFile);
    fileResult.sectionErrors = sectionErrors;
    fileResult.typeErrors = typeErrors;

    const hasErrors = sectionErrors.length > 0 || typeErrors.length > 0;

    if (sectionErrors.length > 0) {
      console.log('  ❌ 섹션 누락:');
      for (const err of sectionErrors) {
        console.log(`     ${err}`);
      }
      totalErrors += sectionErrors.length;
    }

    if (typeErrors.length > 0) {
      console.log('  ❌ 타입 누락:');
      for (const err of typeErrors) {
        console.log(`     ${err}`);
      }
      totalErrors += typeErrors.length;
    }

    if (!hasErrors) {
      console.log('  ✅ 통과');
      passedFiles++;
    }

    details.Features.push(fileResult);
  }

  // Interfaces 검증
  if (fileExists(join(tasksDir, 'interfaces'))) {
    console.log('\n\n📂 Interfaces 검증');
    console.log('━'.repeat(40));

    details.Interfaces = [];
    const interfaceFiles = getMarkdownFiles(join(tasksDir, 'interfaces'));

    for (const oldFile of interfaceFiles) {
      const filename = oldFile.split('/').pop() || '';
      const newFile = join(tasksV2Dir, 'interfaces', filename);
      totalFiles++;

      console.log(`\n📄 ${filename}`);

      const fileResult: FileResult = {
        filename,
        missing: false,
        sectionErrors: [],
        typeErrors: [],
      };

      if (!fileExists(newFile)) {
        console.log('  ❌ 파일 누락');
        totalErrors++;
        fileResult.missing = true;
        details.Interfaces.push(fileResult);
        continue;
      }

      const { sectionErrors, typeErrors } = validateFile(oldFile, newFile);
      fileResult.sectionErrors = sectionErrors;
      fileResult.typeErrors = typeErrors;

      const hasErrors = sectionErrors.length > 0 || typeErrors.length > 0;

      if (sectionErrors.length > 0) {
        console.log('  ❌ 섹션 누락:');
        for (const err of sectionErrors) {
          console.log(`     ${err}`);
        }
        totalErrors += sectionErrors.length;
      }

      if (typeErrors.length > 0) {
        console.log('  ❌ 타입 누락:');
        for (const err of typeErrors) {
          console.log(`     ${err}`);
        }
        totalErrors += typeErrors.length;
      }

      if (!hasErrors) {
        console.log('  ✅ 통과');
        passedFiles++;
      }

      details.Interfaces.push(fileResult);
    }
  }

  // 결과 출력
  console.log(`\n${'━'.repeat(40)}`);
  console.log('📊 검증 결과\n');
  console.log('문서:');
  console.log(`  전체: ${totalFiles}`);
  console.log(`  통과: ${passedFiles}`);
  console.log(`  실패: ${totalFiles - passedFiles}`);
  console.log();
  console.log('오류:');
  console.log(`  전체: ${totalErrors}`);
  console.log();

  const result: ValidationResult = {
    success: totalErrors === 0,
    totalFiles,
    passedFiles,
    failedFiles: totalFiles - passedFiles,
    totalErrors,
    details,
  };

  // 마크다운 리포트 생성
  if (options.markdown) {
    const reportPath = join(tasksV2Dir, 'MIGRATION_REPORT.md');
    generateMarkdownReport(result, reportPath);
    console.log(`📝 마크다운 리포트 생성: ${reportPath}`);
    console.log();
  }

  if (totalErrors === 0) {
    console.log('✅ 마이그레이션 검증 통과');
  } else {
    console.log(`❌ ${totalErrors}개 오류 발견`);
    console.log('\n힌트:');
    console.log('  - tasks에 있는 섹션이 tasks-v2에서 누락되었습니다');
    console.log('  - tasks-v2에 섹션/타입을 복원하세요');
    if (options.markdown) {
      console.log(`  - 상세 리포트: ${join(tasksV2Dir, 'MIGRATION_REPORT.md')}`);
    }
  }

  return result;
}
