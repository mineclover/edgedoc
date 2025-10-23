#!/usr/bin/env bun

import { Command } from 'commander';
import { validateNaming } from './tools/naming.js';
import { validateOrphans } from './tools/orphans.js';
import { validateSpecOrphans } from './tools/spec-orphans.js';
import { validateStructure } from './tools/structure.js';
import { syncCodeRefs } from './tools/sync.js';
import { validateMigration } from './tools/validate.js';

const program = new Command();

program.name('mdoc').version('1.0.0').description('문서 검증 및 동기화 도구');

// Validate commands
const validate = program.command('validate').description('문서 검증');

validate
  .command('migration')
  .description('마이그레이션 검증 (tasks → tasks-v2)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .option('-m, --markdown', '마크다운 리포트 생성')
  .action(async (options) => {
    try {
      const result = await validateMigration({
        projectPath: options.project,
        markdown: options.markdown,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('naming')
  .description('네이밍 컨벤션 검증 (인터페이스/공용 타입)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .action(async (options) => {
    try {
      const result = await validateNaming({
        projectPath: options.project,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('orphans')
  .description('고아 파일 검증 (문서화되지 않고 사용되지 않는 파일)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .option('--include-node-modules', 'node_modules 포함')
  .option('--include-dist', 'dist/build 디렉토리 포함')
  .action(async (options) => {
    try {
      const result = await validateOrphans({
        projectPath: options.project,
        includeNodeModules: options.includeNodeModules,
        includeDist: options.includeDist,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('structure')
  .description('문서 구조 검증 (순환 의존성, 일관성, frontmatter)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .action(async (options) => {
    try {
      const result = await validateStructure({
        projectPath: options.project,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('spec-orphans')
  .description('스펙 고아 코드 검증 (문서화되지 않은 export)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .action(async (options) => {
    try {
      const result = await validateSpecOrphans({
        projectPath: options.project,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('all')
  .description('전체 검증 실행')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .action(async (options) => {
    console.log('🔄 전체 검증 실행...\n');

    // 마이그레이션 검증
    const migrationResult = await validateMigration({ projectPath: options.project });
    console.log('\n');

    // 네이밍 컨벤션 검증
    const namingResult = await validateNaming({ projectPath: options.project });
    console.log('\n');

    // 구조 검증
    const structureResult = await validateStructure({ projectPath: options.project });
    console.log('\n');

    // 고아 파일 검증
    const orphansResult = await validateOrphans({ projectPath: options.project });
    console.log('\n');

    // 스펙 고아 코드 검증
    const specOrphansResult = await validateSpecOrphans({ projectPath: options.project });

    const success =
      migrationResult.success &&
      namingResult.success &&
      structureResult.success &&
      orphansResult.success &&
      specOrphansResult.success;

    console.log('\n━'.repeat(40));
    console.log('📊 전체 검증 요약\n');
    console.log(`마이그레이션: ${migrationResult.success ? '✅ 통과' : '❌ 실패'}`);
    console.log(`네이밍 컨벤션: ${namingResult.success ? '✅ 통과' : '❌ 실패'}`);
    console.log(`구조 검증: ${structureResult.success ? '✅ 통과' : '❌ 실패'}`);
    console.log(
      `고아 파일: ${orphansResult.success ? '✅ 통과' : `⚠️  ${orphansResult.orphanFiles}개 발견`}`
    );
    console.log(
      `스펙 고아 코드: ${specOrphansResult.success ? '✅ 통과' : `❌ ${specOrphansResult.orphanExports.length}개 발견`}`
    );

    if (success) {
      console.log('\n✅ 전체 검증 통과');
    } else {
      console.log('\n❌ 일부 검증 실패');
    }

    process.exit(success ? 0 : 1);
  });

// Sync commands
program
  .command('sync')
  .description('코드 참조 동기화')
  .action(async () => {
    try {
      const result = await syncCodeRefs();
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Docs commands
const docs = program.command('docs').description('문서 도구');

docs
  .command('list <file>')
  .description('details 블록 목록')
  .action(async (file) => {
    console.log(`📋 ${file}의 details 블록 목록`);
    // TODO: 구현
  });

docs
  .command('open <file>')
  .description('details 블록 열기')
  .option('--index <number>', '블록 인덱스')
  .option('--all', '모든 블록')
  .action(async (file, _options) => {
    console.log(`📖 ${file} 블록 열기`);
    // TODO: 구현
  });

docs
  .command('close <file>')
  .description('details 블록 닫기')
  .option('--index <number>', '블록 인덱스')
  .option('--all', '모든 블록')
  .action(async (file, _options) => {
    console.log(`📕 ${file} 블록 닫기`);
    // TODO: 구현
  });

program.parse();
