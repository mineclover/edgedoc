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
import { validateInterfaceLinks, printValidationResults } from './tools/validate-interface-links.js';
import {
  listTasks,
  printTasksList,
  getTaskDetails,
  getTasksByCode,
  getTasksByInterface,
  getTasksByTerm,
  printTasksForReference,
  calculateProgress,
  printProgressDashboard,
  filterIncompleteTasks,
} from './tools/tasks-list.js';
import {
  listDetailsBlocks,
  printDetailsBlocks,
  openDetailsBlocks,
  closeDetailsBlocks,
} from './tools/docs-toggle.js';
import { collectIssues, printIssuesReport } from './tools/issues.js';
import {
  findTestsForFeature,
  findDocForTest,
  generateCoverageReport,
  validateTestDocSync,
  printTestReference,
  printDocReference,
  printCoverageReport,
  printSyncValidation,
} from './tools/test-doc-lookup.js';
import {
  generateImplementationCoverage,
  printImplementationCoverage,
} from './tools/implementation-coverage.js';
import {
  collectSyntaxTerms,
  findSyntaxTerm,
  getSyntaxTermsByCategory,
} from './tools/syntax-manager.js';

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
  .command('interfaces')
  .description('인터페이스 검증 (양방향 링크 + 계층 구조)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('--feature <id>', '특정 feature만 검증')
  .option('--namespace <name>', '특정 namespace만 검증')
  .option('-v, --verbose', '상세 출력')
  .action(async (options) => {
    try {
      const result = validateInterfaceLinks(options.project, {
        feature: options.feature,
        namespace: options.namespace,
      });

      printValidationResults(result, options.verbose);

      const hasErrors = result.summary.errorCount > 0;
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

validate
  .command('dependencies [feature-id]')
  .description('의존성 준비 상태 검증 (재귀)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (featureId, options) => {
    try {
      const { checkDependencyReadiness, printDependencyReadiness } = await import(
        './tools/validate-cross.js'
      );
      const results = await checkDependencyReadiness(options.project, featureId);
      printDependencyReadiness(results);

      const hasBlockers = results.some((r) => r.readiness === 'blocked');
      process.exit(hasBlockers ? 1 : 0);
    } catch (error: any) {
      console.error('❌ 오류:', error.message);
      process.exit(1);
    }
  });

validate
  .command('quality [feature-id]')
  .description('진행도-품질 교차 검증')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (featureId, options) => {
    try {
      const { checkProgressQuality, printProgressQuality } = await import(
        './tools/validate-cross.js'
      );
      const results = await checkProgressQuality(options.project, featureId);
      printProgressQuality(results);

      const hasErrors = results.some((r) => r.recommendation === 'not_ready');
      process.exit(hasErrors ? 1 : 0);
    } catch (error: any) {
      console.error('❌ 오류:', error.message);
      process.exit(1);
    }
  });

validate
  .command('impact [interface-id]')
  .description('인터페이스 영향 분석')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (interfaceId, options) => {
    try {
      const { analyzeInterfaceImpact, printInterfaceImpact } = await import(
        './tools/validate-cross.js'
      );
      const results = await analyzeInterfaceImpact(options.project, interfaceId);
      printInterfaceImpact(results);

      const hasIssues = results.some(
        (r) => r.impact.blockedConsumers > 0 || r.impact.atRiskConsumers > 0
      );
      process.exit(hasIssues ? 1 : 0);
    } catch (error: any) {
      console.error('❌ 오류:', error.message);
      process.exit(1);
    }
  });

validate
  .command('terms-recursive')
  .description('재귀 용어 검증 (우선순위 기반)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      const { validateTermsRecursive, printRecursiveTerms } = await import(
        './tools/validate-cross.js'
      );
      const results = await validateTermsRecursive(options.project);
      printRecursiveTerms(results);

      const hasCritical = results.some((r) => r.severity === 'critical');
      process.exit(hasCritical ? 1 : 0);
    } catch (error: any) {
      console.error('❌ 오류:', error.message);
      process.exit(1);
    }
  });

validate
  .command('all')
  .description('전체 검증 실행 (재귀 검증 포함)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)', process.cwd())
  .option('--skip-cross', '재귀 검증 스킵')
  .action(async (options) => {
    console.log('🔄 전체 검증 실행...\n');

    // Phase 1: Individual validations
    console.log('━━━ Phase 1: Individual Validations ━━━\n');

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
    console.log('\n');

    // 인터페이스 검증
    const interfaceResult = validateInterfaceLinks(options.project);
    printValidationResults(interfaceResult);
    console.log('\n');

    // 용어 검증
    const termsResult = await validateTerms({ projectPath: options.project });
    console.log('\n');

    // Phase 2: Cross validations (unless skipped)
    if (!options.skipCross) {
      console.log('━━━ Phase 2: Cross Validations (Recursive) ━━━\n');

      const {
        checkDependencyReadiness,
        checkProgressQuality,
        analyzeInterfaceImpact,
        validateTermsRecursive,
        printDependencyReadiness,
        printProgressQuality,
        printInterfaceImpact,
        printRecursiveTerms,
      } = await import('./tools/validate-cross.js');

      const dependencyResults = await checkDependencyReadiness(options.project);
      printDependencyReadiness(dependencyResults);

      const qualityResults = await checkProgressQuality(options.project);
      printProgressQuality(qualityResults);

      const impactResults = await analyzeInterfaceImpact(options.project);
      printInterfaceImpact(impactResults);

      const recursiveTermsResults = await validateTermsRecursive(options.project);
      printRecursiveTerms(recursiveTermsResults);

      // Overall summary with cross-validation results
      console.log('━'.repeat(80));
      console.log('📊 전체 검증 요약\n');

      const blockedFeatures = dependencyResults.filter((r) => r.readiness === 'blocked').length;
      const unsafeFeatures = qualityResults.filter((r) => r.recommendation === 'not_ready').length;
      const highImpactInterfaces = impactResults.filter(
        (r) => r.impact.blockedConsumers > 0 || r.impact.atRiskConsumers > 0
      ).length;
      const criticalTerms = recursiveTermsResults.filter((r) => r.severity === 'critical').length;

      console.log('Individual Validations:');
      console.log(`  마이그레이션: ${migrationResult.success ? '✅ 통과' : '❌ 실패'}`);
      console.log(`  네이밍 컨벤션: ${namingResult.success ? '✅ 통과' : '❌ 실패'}`);
      console.log(`  구조 검증: ${structureResult.success ? '✅ 통과' : '❌ 실패'}`);
      console.log(
        `  고아 파일: ${orphansResult.success ? '✅ 통과' : `⚠️  ${orphansResult.orphanFiles}개 발견`}`
      );
      console.log(
        `  스펙 고아 코드: ${specOrphansResult.success ? '✅ 통과' : `❌ ${specOrphansResult.orphanExports.length}개 발견`}`
      );
      console.log(
        `  인터페이스: ${interfaceResult.summary.errorCount === 0 ? '✅ 통과' : `❌ ${interfaceResult.summary.errorCount}개 에러`}`
      );
      console.log(`  용어: ${termsResult.success ? '✅ 통과' : '❌ 실패'}`);

      console.log('\nCross Validations:');
      console.log(
        `  의존성 준비도: ${blockedFeatures === 0 ? '✅ 통과' : `❌ ${blockedFeatures}개 blocked`}`
      );
      console.log(
        `  진행도-품질: ${unsafeFeatures === 0 ? '✅ 통과' : `⚠️  ${unsafeFeatures}개 not ready`}`
      );
      console.log(
        `  인터페이스 영향: ${highImpactInterfaces === 0 ? '✅ 통과' : `⚠️  ${highImpactInterfaces}개 high impact`}`
      );
      console.log(
        `  재귀 용어: ${criticalTerms === 0 ? '✅ 통과' : `❌ ${criticalTerms}개 critical`}`
      );

      const hasErrors =
        !migrationResult.success ||
        !namingResult.success ||
        !structureResult.success ||
        !specOrphansResult.success ||
        interfaceResult.summary.errorCount > 0 ||
        !termsResult.success ||
        blockedFeatures > 0 ||
        criticalTerms > 0;

      console.log();
      if (hasErrors) {
        console.log('❌ 검증 실패 - 에러를 수정하세요');
        process.exit(1);
      } else {
        console.log('✅ 모든 검증 통과');
        process.exit(0);
      }
    } else {
      // Original summary (without cross-validation)
      const success =
        migrationResult.success &&
        namingResult.success &&
        structureResult.success &&
        orphansResult.success &&
        specOrphansResult.success &&
        interfaceResult.summary.errorCount === 0 &&
        termsResult.success;

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
      console.log(
        `인터페이스: ${interfaceResult.summary.errorCount === 0 ? '✅ 통과' : `❌ ${interfaceResult.summary.errorCount}개 에러`}`
      );
      console.log(`용어: ${termsResult.success ? '✅ 통과' : '❌ 실패'}`);

      if (success) {
        console.log('\n✅ 전체 검증 통과');
      } else {
        console.log('\n❌ 일부 검증 실패');
      }
      process.exit(success ? 0 : 1);
    }
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

terms
  .command('generate')
  .description('GLOSSARY.md 자동 생성')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('-o, --output <path>', '출력 파일 경로 (default: docs/GLOSSARY.md)')
  .option('--include-document', 'Document-scoped 용어도 포함', false)
  .action(async (options) => {
    try {
      const { generateGlossary } = await import('./tools/generate-glossary.js');
      await generateGlossary({
        projectPath: options.project,
        outputPath: options.output,
        includeDocumentScoped: options.includeDocument,
      });
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
  .option('--interface <id>', '인터페이스 ID로 feature 찾기')
  .option('--term <name>', '용어 이름으로 feature 찾기')
  .option('--incomplete', '미완료 tasks만 표시')
  .option('-v, --verbose', '상세 출력')
  .action(async (options) => {
    try {
      // Code file lookup
      if (options.code) {
        let { featureIds, tasks } = await getTasksByCode(options.project, options.code);
        if (options.incomplete) {
          tasks = filterIncompleteTasks(tasks);
        }
        printTasksForReference('code', options.code, featureIds, tasks);
        process.exit(0);
      }

      // Interface lookup
      if (options.interface) {
        let { featureIds, tasks } = await getTasksByInterface(options.project, options.interface);
        if (options.incomplete) {
          tasks = filterIncompleteTasks(tasks);
        }
        printTasksForReference('interface', options.interface, featureIds, tasks);
        process.exit(0);
      }

      // Term lookup
      if (options.term) {
        let { featureIds, tasks } = await getTasksByTerm(options.project, options.term);
        if (options.incomplete) {
          tasks = filterIncompleteTasks(tasks);
        }
        printTasksForReference('term', options.term, featureIds, tasks);
        process.exit(0);
      }

      // Normal list
      let taskList = await listTasks({
        projectPath: options.project,
        status: options.status,
        priority: options.priority,
      });

      if (options.incomplete) {
        taskList = filterIncompleteTasks(taskList);
      }

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
      } else {
        // No checkboxes - show clear status message
        if (task.status === 'active' || task.status === 'implemented') {
          console.log('✅ Implemented (no pending tasks)\n');
        } else if (task.status === 'planned') {
          console.log('📋 Planned (no implementation yet)\n');
        }
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

tasks
  .command('progress')
  .description('전체 프로젝트 진행률 대시보드')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      const taskList = await listTasks({ projectPath: options.project });
      const summary = calculateProgress(taskList);
      printProgressDashboard(summary);
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });


// Feature commands
const feature = program.command('feature').description('Feature 정보 및 커버리지 조회');

feature
  .command('info <feature-id>')
  .description('Feature 전체 정보 조회')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('--full', '전체 코드 파일 목록 표시')
  .option('--json', 'JSON 형식 출력')
  .action(async (featureId, options) => {
    try {
      const { getFeatureInfo } = await import('./tools/feature-info.js');
      const info = await getFeatureInfo(options.project, featureId);

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
      } else {
        // Simple output for now
        console.log(`📦 Feature: ${info.id}`);
        console.log(`   Title: ${info.title}`);
        console.log(`   Status: ${info.status}`);
        if (info.hasCheckboxes) {
          console.log(`   Progress: ${info.progress}%`);
        }
        console.log(`\n🔗 Interfaces Provided: ${info.interfaces.provides.length}`);
        console.log(`🔗 Interfaces Used: ${info.interfaces.uses.length}`);
        console.log(`🧪 Tests: ${info.tests.hasCoverage ? '✅ ' + info.tests.files.length : '❌ None'}`);
        console.log(`📝 Code Files: ${info.code.files.length}`);
      }

      process.exit(0);
    } catch (error: any) {
      console.error('❌ 오류:', error.message);
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

// Issues command
program
  .command('issues')
  .description('프로젝트 이상치 검토 (미완료 작업, 고아 파일, 용어 문제 등)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('--tasks', 'Task 관련 이상치만 표시')
  .option('--orphans', '고아 파일만 표시')
  .option('--terms', '용어 문제만 표시')
  .option('--quality', '품질 이슈만 표시')
  .option('--interfaces', '인터페이스 문제만 표시')
  .option('--all', '모든 이상치 표시 (기본값)')
  .option('-v, --verbose', '상세 정보 표시')
  .action(async (options) => {
    try {
      const report = await collectIssues({
        projectPath: options.project,
        tasks: options.tasks,
        orphans: options.orphans,
        terms: options.terms,
        quality: options.quality,
        interfaces: options.interfaces,
        all: options.all,
      });

      printIssuesReport(report, { verbose: options.verbose });

      // Exit with code 1 if there are warnings
      const hasWarnings = report.summary.bySeverity.warning > 0;
      process.exit(hasWarnings ? 1 : 0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Test commands
const test = program.command('test').description('테스트 관리');

test
  .command('find')
  .description('Feature에서 테스트 파일 찾기')
  .option('-f, --feature <id>', 'Feature ID')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      if (!options.feature) {
        console.error('❌ --feature 옵션이 필요합니다');
        process.exit(1);
      }

      const ref = findTestsForFeature(options.feature, options.project);
      printTestReference(ref, options.feature);
      process.exit(ref ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

test
  .command('coverage')
  .description('테스트 커버리지 확인')
  .option('-f, --feature <id>', 'Feature ID')
  .option('-m, --missing', '테스트되지 않은 feature만 표시')
  .option('-c, --code', '구현 커버리지 확인 (문서 정의 vs 실제 구현)')
  .option('-v, --verbose', '상세 출력')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      // Implementation coverage
      if (options.code) {
        const coverage = generateImplementationCoverage(options.project);
        printImplementationCoverage(coverage, {
          verbose: options.verbose,
          featureId: options.feature,
        });
        process.exit(0);
        return;
      }

      // Test coverage
      const report = generateCoverageReport(options.project, {
        featureId: options.feature,
        missingOnly: options.missing,
      });
      printCoverageReport(report);
      process.exit(0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Doc commands (extends existing docs command group)
docs
  .command('find')
  .description('테스트 파일에서 Feature 찾기')
  .option('-t, --test <path>', '테스트 파일 경로')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      if (!options.test) {
        console.error('❌ --test 옵션이 필요합니다');
        process.exit(1);
      }

      const ref = findDocForTest(options.test, options.project);
      printDocReference(ref, options.test);
      process.exit(ref ? 0 : 1);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Validation - add test-sync command
validate
  .command('test-sync')
  .description('테스트-문서 참조 동기화 검증')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action(async (options) => {
    try {
      const result = validateTestDocSync(options.project);
      printSyncValidation(result);

      const hasErrors = result.errors.length > 0;
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Syntax validation
validate
  .command('syntax [term]')
  .description('문법 검증 (Component Definition, Frontmatter Field, Term Definition)')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .option('-v, --verbose', '상세 출력')
  .action(async (termName, options) => {
    try {
      const { validateComponentDefinition, validateFrontmatterField, validateTermDefinition, reportSyntaxErrors, findSyntaxTerm } = await import('./validators/syntax-validator.js');
      const { collectSyntaxTerms } = await import('./tools/syntax-manager.js');

      if (!termName) {
        // Show available syntax validators
        console.log(`📋 Syntax Validation\n`);
        console.log(`사용 가능한 문법 검증:\n`);
        console.log(`  edgedoc validate syntax component      # Component Definition 검증`);
        console.log(`  edgedoc validate syntax frontmatter    # Frontmatter Field 검증`);
        console.log(`  edgedoc validate syntax term           # Term Definition 검증\n`);
        console.log(`전체 검증:`);
        console.log(`  edgedoc validate all`);
        process.exit(0);
        return;
      }

      const lowerTerm = termName.toLowerCase();
      let errors: any[] = [];

      // Route to appropriate validator
      if (lowerTerm.includes('component')) {
        console.log(`🔍 [[Component Definition]] 검증\n`);
        // Validate all feature files for component definitions
        const fs = require('fs');
        const path = require('path');
        const featuresDir = path.join(options.project, 'tasks', 'features');

        if (fs.existsSync(featuresDir)) {
          const files = fs.readdirSync(featuresDir).filter((f: string) => f.endsWith('.md'));
          for (const file of files) {
            const filePath = path.join(featuresDir, file);
            const fileErrors = validateComponentDefinition(filePath, options.project);
            errors = errors.concat(fileErrors);
          }
        }
      } else if (lowerTerm.includes('frontmatter') || lowerTerm.includes('field')) {
        console.log(`🔍 [[Frontmatter Field]] 검증\n`);
        // Validate all markdown files for frontmatter
        const fs = require('fs');
        const path = require('path');
        const tasksDir = path.join(options.project, 'tasks');

        if (fs.existsSync(tasksDir)) {
          const walkDir = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isDirectory()) {
                walkDir(filePath);
              } else if (file.endsWith('.md')) {
                const fileErrors = validateFrontmatterField(filePath, options.project);
                errors = errors.concat(fileErrors);
              }
            }
          };
          walkDir(tasksDir);
        }
      } else if (lowerTerm.includes('term')) {
        console.log(`🔍 [[Term Definition]] 검증\n`);
        // Validate term definitions in docs/terms/
        const fs = require('fs');
        const path = require('path');
        const termsDir = path.join(options.project, 'docs', 'terms');

        if (fs.existsSync(termsDir)) {
          const files = fs.readdirSync(termsDir).filter((f: string) => f.endsWith('.md'));
          for (const file of files) {
            const filePath = path.join(termsDir, file);
            const fileErrors = validateTermDefinition(filePath, options.project);
            errors = errors.concat(fileErrors);
          }
        }
      } else {
        console.error(`❌ Unknown syntax term: ${termName}`);
        console.log(`\nAvailable: component, frontmatter, term`);
        process.exit(1);
      }

      // Report results
      if (errors.length === 0) {
        console.log(`✅ No syntax errors found\n`);
        process.exit(0);
      } else {
        reportSyntaxErrors(errors, options.verbose);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Syntax management commands
const syntax = program
  .command('syntax')
  .description('문법 용어 관리');

syntax
  .command('list')
  .description('모든 문법 용어 목록')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action((options) => {
    try {
      const categories = getSyntaxTermsByCategory(options.project);

      console.log('📝 Syntax Terms\n');

      for (const [category, terms] of Object.entries(categories)) {
        console.log(`${category}:`);
        for (const term of terms) {
          const status = term.status === 'documented' ? '✅' : term.status === 'planned' ? '📝' : '⚠️';
          console.log(`  ${status} [[${term.name}]] (${term.status})`);
        }
        console.log();
      }

      const total = Object.values(categories).reduce((sum, terms) => sum + terms.length, 0);
      console.log(`Total: ${total} syntax terms`);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

syntax
  .command('show <term>')
  .description('문법 용어 상세 정보')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action((termName, options) => {
    try {
      const term = findSyntaxTerm(termName, options.project);

      if (!term) {
        console.error(`❌ Syntax term not found: ${termName}`);
        process.exit(1);
      }

      console.log(`📝 [[${term.name}]]\n`);
      console.log(`Type: ${term.type}`);
      console.log(`Status: ${term.status}`);
      console.log(`Parser: ${term.parser}`);
      if (term.validator) {
        console.log(`Validator: ${term.validator}`);
      }
      console.log();

      if (term.description) {
        console.log(`Description:`);
        console.log(`  ${term.description}\n`);
      }

      if (term.patterns.length > 0) {
        console.log(`Patterns (${term.patterns.length}):`);
        for (const pattern of term.patterns) {
          console.log(`  - ${pattern.name}`);
          if (pattern.description) {
            console.log(`    ${pattern.description}`);
          }
        }
        console.log();
      }

      if (term.rules.length > 0) {
        console.log(`Validation Rules (${term.rules.length}):`);
        for (const rule of term.rules) {
          const severity = rule.severity === 'error' ? '❌' : '⚠️';
          console.log(`  ${severity} ${rule.description}`);
        }
        console.log();
      }

      if (term.relatedFeatures.length > 0) {
        console.log(`Related Features:`);
        for (const feature of term.relatedFeatures) {
          console.log(`  - ${feature}`);
        }
        console.log();
      }

      if (term.examples.valid.length > 0) {
        console.log(`Valid Examples:`);
        for (const example of term.examples.valid) {
          console.log(`  ✅ ${example}`);
        }
        console.log();
      }

      if (term.examples.invalid.length > 0) {
        console.log(`Invalid Examples:`);
        for (const example of term.examples.invalid) {
          console.log(`  ❌ ${example}`);
        }
        console.log();
      }

      console.log(`Location: ${term.docPath}`);
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

syntax
  .command('usage <term>')
  .description('문법 용어 사용처 찾기')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action((termName, options) => {
    try {
      const term = findSyntaxTerm(termName, options.project);

      if (!term) {
        console.error(`❌ Syntax term not found: ${termName}`);
        process.exit(1);
      }

      console.log(`🔍 Usage of [[${term.name}]]\n`);

      if (term.examples.valid.length > 0) {
        console.log(`Found in ${term.examples.valid.length} features:\n`);
        for (const example of term.examples.valid) {
          console.log(`✅ ${example}`);
        }
      } else {
        console.log('⚠️  No usage examples found');
      }
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

syntax
  .command('guide [term]')
  .description('문법 가이드 - 코드에서 추출한 규칙')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action((termName, options) => {
    try {
      if (termName) {
        // Show specific term guide
        const term = findSyntaxTerm(termName, options.project);
        if (!term) {
          console.error(`❌ Syntax term not found: ${termName}`);
          process.exit(1);
        }

        console.log(`📖 [[${term.name}]] 가이드\n`);
        console.log(`Parser: ${term.parser}`);
        console.log();

        if (term.patterns.length > 0) {
          console.log(`✅ 지원되는 패턴:\n`);
          for (const pattern of term.patterns) {
            console.log(`${pattern.name}`);
            console.log(`  ${pattern.description}`);
            console.log();
          }
        }

        if (term.rules.length > 0) {
          console.log(`📋 검증 규칙:\n`);
          for (const rule of term.rules) {
            console.log(`${rule.description}`);
          }
          console.log();
        }

        console.log(`📚 예시:`);
        if (term.examples.valid.length > 0) {
          console.log(`  ✅ Valid: ${term.examples.valid[0]}`);
        }
        if (term.examples.invalid.length > 0) {
          console.log(`  ❌ Invalid: ${term.examples.invalid[0]}`);
        }
        console.log();
        console.log(`상세 문서: ${term.docPath}`);
      } else {
        // Show all syntax guides summary
        const categories = getSyntaxTermsByCategory(options.project);

        console.log(`📖 Syntax Guide - SSOT 문서 작성 규칙\n`);
        console.log(`명확하고 직관적이고 간단 명료하게 코드를 정의하는 SSOT 문서 유지\n`);

        for (const [category, terms] of Object.entries(categories)) {
          console.log(`${category}:`);
          for (const term of terms) {
            console.log(`  [[${term.name}]]`);
            console.log(`    Parser: ${term.parser}`);
            console.log(`    Patterns: ${term.patterns.length}, Rules: ${term.rules.length}`);
          }
          console.log();
        }

        console.log(`사용법:`);
        console.log(`  edgedoc syntax guide <term>     # 특정 문법 상세 가이드`);
        console.log(`  edgedoc syntax validate <term>  # 문법 검증`);
        console.log(`  edgedoc syntax list             # 전체 문법 목록`);
      }
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

// Syntax validation - route to existing validators
syntax
  .command('validate [term]')
  .description('문법 검증 - 기존 검증 도구 라우팅')
  .option('-p, --project <path>', '프로젝트 디렉토리 경로', process.cwd())
  .action((termName, options) => {
    try {
      if (!termName) {
        // Show available syntax validators
        console.log(`📋 Syntax Validation\n`);
        console.log(`사용 가능한 문법 검증:\n`);
        console.log(`  [[Component Definition]]`);
        console.log(`    edgedoc syntax validate component`);
        console.log(`    → edgedoc test coverage --code\n`);
        console.log(`  [[Frontmatter Field]]`);
        console.log(`    edgedoc syntax validate frontmatter`);
        console.log(`    → edgedoc validate structure\n`);
        console.log(`  [[Term Definition]]`);
        console.log(`    edgedoc syntax validate term`);
        console.log(`    → edgedoc validate terms\n`);
        console.log(`전체 검증:`);
        console.log(`  edgedoc validate all`);
        return;
      }

      const lowerTerm = termName.toLowerCase();

      // Route to appropriate validator
      if (lowerTerm.includes('component')) {
        console.log(`🔍 [[Component Definition]] 검증\n`);
        console.log(`Implementation Coverage 실행...\n`);
        const coverage = generateImplementationCoverage(options.project);
        printImplementationCoverage(coverage, { verbose: false });
      } else if (lowerTerm.includes('frontmatter') || lowerTerm.includes('field')) {
        console.log(`🔍 [[Frontmatter Field]] 검증\n`);
        console.log(`Structure Validation 실행...\n`);
        validateStructure({ project: options.project });
      } else if (lowerTerm.includes('term')) {
        console.log(`🔍 [[Term Definition]] 검증\n`);
        console.log(`Term Validation 실행...\n`);
        validateTerms({ projectPath: options.project });
      } else {
        console.error(`❌ Unknown syntax term: ${termName}`);
        console.log(`\nAvailable: component, frontmatter, term`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 오류:', error);
      process.exit(1);
    }
  });

program.parse();
