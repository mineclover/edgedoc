#!/usr/bin/env bun

import { Command } from 'commander';
import { initProject } from './tools/init.js';
import { validateNaming } from './tools/naming.js';
import { validateOrphans } from './tools/orphans.js';
import { validateSpecOrphans } from './tools/spec-orphans.js';
import { validateStructure } from './tools/structure.js';
import { syncCodeRefs } from './tools/sync.js';
import { validateMigration } from './tools/validate.js';
import { EntryPointDetector } from './tools/entry-point-detector.js';
import { validateTerms } from './tools/validate-terms.js';
import { listTerms, findTerm } from './tools/term-commands.js';
import { buildReferenceIndex } from './tools/build-reference-index.js';
import { queryGraph } from './tools/graph-query.js';
import {
  listTasks,
  printTasksList,
  getTaskDetails,
  getTasksByCode,
  printTasksForCode,
} from './tools/tasks-list.js';
import {
  listDetailsBlocks,
  printDetailsBlocks,
  openDetailsBlocks,
  closeDetailsBlocks,
} from './tools/docs-toggle.js';

const program = new Command();

program
  .name('edgedoc')
  .version('1.0.0')
  .description('Edge-based documentation validation and sync tool');

// Init command
program
  .command('init')
  .description('프로젝트 초기화 (config 및 가이드 생성)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .option('-f, --force', '기존 파일 덮어쓰기')
  .action(async (options) => {
    try {
      const result = await initProject({
        projectPath: options.project,
        force: options.force,
      });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

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
  .command('terms')
  .description('용어 검증 (정의/참조 일관성)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .action(async (options) => {
    try {
      const result = await validateTerms({
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
  .option('-p, --project <path>', '프로젝트 디렉토리 경로')
  .option('--dry-run', '실제 파일 변경 없이 시뮬레이션')
  .action(async (options) => {
    try {
      const result = await syncCodeRefs({
        projectPath: options.project,
        dryRun: options.dryRun,
      });
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
    try {
      const blocks = listDetailsBlocks(file);
      printDetailsBlocks(file, blocks);
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

docs
  .command('open <file>')
  .description('details 블록 열기')
  .option('--index <numbers...>', '블록 인덱스 (여러 개 가능)')
  .option('--all', '모든 블록')
  .action(async (file, options) => {
    try {
      const indices = options.index ? options.index.map((n: string) => parseInt(n, 10)) : undefined;
      const result = openDetailsBlocks(file, {
        indices,
        all: options.all,
      });

      if (result.modified > 0) {
        console.log(`✅ ${result.modified}/${result.total} block(s) opened`);
      } else {
        console.log('ℹ️  No blocks were modified (already open)');
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

docs
  .command('close <file>')
  .description('details 블록 닫기')
  .option('--index <numbers...>', '블록 인덱스 (여러 개 가능)')
  .option('--all', '모든 블록')
  .action(async (file, options) => {
    try {
      const indices = options.index ? options.index.map((n: string) => parseInt(n, 10)) : undefined;
      const result = closeDetailsBlocks(file, {
        indices,
        all: options.all,
      });

      if (result.modified > 0) {
        console.log(`✅ ${result.modified}/${result.total} block(s) closed`);
      } else {
        console.log('ℹ️  No blocks were modified (already closed)');
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Analyze commands
const analyze = program.command('analyze').description('코드베이스 분석');

analyze
  .command('entry-points')
  .description('진입점 모듈 탐지')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      const entryPoints = EntryPointDetector.detect(options.project);
      EntryPointDetector.print(entryPoints);
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Terms commands
const terms = program.command('terms').description('용어 관리');

terms
  .command('list')
  .description('정의된 용어 목록')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      await listTerms({ projectPath: options.project });
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

terms
  .command('find <query>')
  .description('용어 검색')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (query, options) => {
    try {
      await findTerm(query, { projectPath: options.project });
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Tasks commands
const tasks = program.command('tasks').description('작업 관리');

tasks
  .command('list')
  .description('Feature 목록 및 진행률')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('--status <status>', 'Status 필터 (planned, in_progress, active)')
  .option('--priority <priority>', 'Priority 필터 (high, medium, low)')
  .option('--code <file>', '코드 파일 경로로 feature 찾기')
  .option('-v, --verbose', '상세 출력')
  .action(async (options) => {
    try {
      // Code file lookup
      if (options.code) {
        const { featureIds, tasks } = await getTasksByCode(options.project, options.code);
        printTasksForCode(options.code, featureIds, tasks);
        process.exit(0);
      }

      // Normal list
      const taskList = await listTasks({
        projectPath: options.project,
        status: options.status,
        priority: options.priority,
      });
      printTasksList(taskList, { verbose: options.verbose });
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

tasks
  .command('get <task-id>')
  .description('특정 Feature 상세 정보')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (taskId, options) => {
    try {
      const taskList = await listTasks({ projectPath: options.project });
      const task = getTaskDetails(taskList, taskId);

      if (!task) {
        console.error(`❌ Task "${taskId}" not found`);
        process.exit(1);
      }

      console.log(`📦 Task: ${task.id}\n`);
      console.log(`Title: ${task.title}`);
      console.log(`Status: ${task.status}`);
      if (task.priority) {
        console.log(`Priority: ${task.priority}`);
      }
      console.log(`File: ${task.file}\n`);

      if (task.checkboxes.total > 0) {
        const progressBar = '█'.repeat(Math.floor(task.checkboxes.progress / 10));
        const emptyBar = '░'.repeat(10 - Math.floor(task.checkboxes.progress / 10));
        console.log('📊 Progress:');
        console.log(
          `   ${progressBar}${emptyBar} ${task.checkboxes.checked}/${task.checkboxes.total} (${task.checkboxes.progress}%)\n`
        );
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

tasks
  .command('progress')
  .description('전체 프로젝트 진행률')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      const taskList = await listTasks({ projectPath: options.project });

      const total = taskList.length;
      const byStatus = taskList.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const totalCheckboxes = taskList.reduce((sum, task) => sum + task.checkboxes.total, 0);
      const checkedCheckboxes = taskList.reduce((sum, task) => sum + task.checkboxes.checked, 0);
      const overallProgress =
        totalCheckboxes > 0 ? Math.round((checkedCheckboxes / totalCheckboxes) * 100) : 0;

      console.log('📊 Project Progress\n');
      console.log(`Total Features: ${total}`);
      console.log(`  Active: ${byStatus.active || 0}`);
      console.log(`  In Progress: ${byStatus.in_progress || 0}`);
      console.log(`  Planned: ${byStatus.planned || 0}\n`);

      console.log('Checkboxes:');
      const progressBar = '█'.repeat(Math.floor(overallProgress / 5));
      const emptyBar = '░'.repeat(20 - Math.floor(overallProgress / 5));
      console.log(`  ${progressBar}${emptyBar} ${checkedCheckboxes}/${totalCheckboxes} (${overallProgress}%)\n`);

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Graph commands
const graph = program.command('graph').description('참조 그래프 관리');

graph
  .command('build')
  .description('참조 인덱스 생성')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('-o, --output <path>', '출력 경로')
  .option('--symbols', '심볼 정보 포함 (느림)')
  .option('-v, --verbose', '상세 출력')
  .action(async (options) => {
    try {
      const { index, stats } = await buildReferenceIndex({
        projectPath: options.project,
        outputPath: options.output,
        includeSymbols: options.symbols,
        verbose: options.verbose || true,
      });

      console.log('\n📊 Index Statistics:\n');
      console.log(`Features: ${stats.features}`);
      console.log(`Code files: ${stats.code_files}`);
      console.log(`Interfaces: ${stats.interfaces}`);
      console.log(`Terms: ${stats.terms}`);
      console.log(`Total references: ${stats.total_references}`);
      console.log(`Build time: ${stats.build_time_ms}ms\n`);

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

graph
  .command('query [id]')
  .description('참조 그래프 조회')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('--feature <id>', 'Feature ID 조회')
  .option('--code <file>', '코드 파일 조회 (역방향)')
  .option('--term <name>', '용어 사용처 조회')
  .action(async (id, options) => {
    try {
      await queryGraph({
        projectPath: options.project,
        featureId: options.feature || id,
        codeFile: options.code,
        term: options.term,
      });
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

program.parse();
