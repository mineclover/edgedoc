import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { OrphanFile, OrphanFilesResult, OrphanOptions } from '../shared/types.js';
import { fileExists, getMarkdownFiles } from '../shared/utils.js';

/**
 * 파일 경로 추출 정규식
 */
const FILE_PATH_PATTERNS = [
  // code_references 배열에서 (여러 줄 지원)
  /-\s*"([^"]+)"/g,
  // entry_point에서
  /entry_point:\s*"([^"]+)"/g,
  // 마크다운 링크에서
  /\[.*?\]\(\.\.\/\.\.\/([^)]+)\)/g,
  // 일반 경로 참조
  /(?:src|dist)\/[a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx|json)/g,
];

/**
 * tasks 문서에서 참조된 파일 경로 추출
 */
function extractReferencedFiles(tasksDir: string): Set<string> {
  const referenced = new Set<string>();

  if (!fileExists(tasksDir)) {
    return referenced;
  }

  // features 디렉토리 검색
  const featuresDir = join(tasksDir, 'features');
  if (fileExists(featuresDir)) {
    const featureFiles = getMarkdownFiles(featuresDir);
    for (const file of featureFiles) {
      const content = readFileSync(file, 'utf-8');

      for (const pattern of FILE_PATH_PATTERNS) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const path = match[1];
          if (path && !path.startsWith('http') && !path.startsWith('#')) {
            referenced.add(path);
          }
        }
      }
    }
  }

  // interfaces 디렉토리 검색
  const interfacesDir = join(tasksDir, 'interfaces');
  if (fileExists(interfacesDir)) {
    const interfaceFiles = getMarkdownFiles(interfacesDir);
    for (const file of interfaceFiles) {
      const content = readFileSync(file, 'utf-8');

      for (const pattern of FILE_PATH_PATTERNS) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const path = match[1];
          if (path && !path.startsWith('http') && !path.startsWith('#')) {
            referenced.add(path);
          }
        }
      }
    }
  }

  return referenced;
}

/**
 * 소스 파일 목록 수집
 */
function collectSourceFiles(dir: string, baseDir: string, options: OrphanOptions): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relativePath = relative(baseDir, fullPath);

      // 제외 디렉토리
      if (!options.includeNodeModules && relativePath.startsWith('node_modules')) continue;
      if (
        !options.includeDist &&
        (relativePath.startsWith('dist') || relativePath.startsWith('build'))
      )
        continue;
      if (relativePath.startsWith('.git')) continue;
      if (relativePath.startsWith('tasks')) continue;
      if (relativePath.startsWith('tasks-v2')) continue;
      if (relativePath.startsWith('mdoc-tools')) continue;
      if (relativePath.startsWith('out')) continue; // Electron 빌드 아티팩트
      if (relativePath.startsWith('.vite')) continue; // Vite 빌드 캐시
      if (relativePath.startsWith('.serena')) continue; // Serena 설정

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...collectSourceFiles(fullPath, baseDir, options));
      } else if (stat.isFile()) {
        // 소스 파일 및 설정 파일만
        const ext = fullPath.split('.').pop() || '';
        const validExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'yaml', 'yml'];

        if (validExts.includes(ext)) {
          files.push(relativePath);
        }
      }
    }
  } catch (_error) {
    // 권한 오류 등 무시
  }

  return files;
}

/**
 * 코드에서 import되는지 확인
 */
function isImportedByCode(filePath: string, projectDir: string, allSourceFiles: string[]): boolean {
  const fileBasename = filePath.split('/').pop() || '';
  const fileWithoutExt = fileBasename.replace(/\.(ts|tsx|js|jsx)$/, '');

  // 간단한 import 검색 (정규식 기반)
  const importPatterns = [
    new RegExp(`from ['"].*${fileWithoutExt}['"]`, 'g'),
    new RegExp(`import.*['"].*${fileWithoutExt}['"]`, 'g'),
    new RegExp(`require\\(['"].*${fileWithoutExt}['"]\\)`, 'g'),
  ];

  for (const sourceFile of allSourceFiles) {
    if (sourceFile === filePath) continue;

    try {
      const fullPath = join(projectDir, sourceFile);
      const content = readFileSync(fullPath, 'utf-8');

      for (const pattern of importPatterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    } catch (_error) {
      // 파일 읽기 실패 무시
    }
  }

  return false;
}

/**
 * 파일 타입 분류
 */
function classifyFileType(path: string): 'source' | 'config' | 'other' {
  const basename = path.split('/').pop() || '';

  // 설정 파일 (빌드, 환경, 린트 등)
  const configFiles = [
    'package.json',
    'package-lock.json',
    'bun.lockb',
    'tsconfig.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'vite.config.js',
    'vite.main.config.ts',
    'vite.preload.config.ts',
    'vite.renderer.config.ts',
    'webpack.config.js',
    'rollup.config.js',
    'babel.config.js',
    'forge.config.ts',
    'forge.config.js',
    '.eslintrc.json',
    '.eslintrc.js',
    '.prettierrc.json',
    '.prettierrc',
    'jest.config.js',
    'vitest.config.ts',
    'biome.json',
    '.editorconfig',
  ];

  // 환경 정의 파일 패턴
  const envPatterns = [
    /\.env(\..+)?$/, // .env, .env.local, .env.production 등
    /\.d\.ts$/, // TypeScript 타입 정의 파일
    /^\..*rc(\.json|\.js)?$/, // dotfiles (.eslintrc, .prettierrc 등)
  ];

  if (configFiles.includes(basename) || basename.startsWith('.')) {
    return 'config';
  }

  for (const pattern of envPatterns) {
    if (pattern.test(basename)) {
      return 'config';
    }
  }

  // 소스 파일
  const ext = basename.split('.').pop() || '';
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
    return 'source';
  }

  return 'other';
}

/**
 * 고아 파일 검증
 */
export async function validateOrphans(options: OrphanOptions = {}): Promise<OrphanFilesResult> {
  console.log('🔍 고아 파일 검증 시작...\n');

  const projectDir = options.projectPath || process.cwd();
  const tasksDir = join(projectDir, 'tasks');

  if (!fileExists(tasksDir)) {
    console.log('⚠️  tasks/ 없음 - 검증 스킵');
    return {
      success: true,
      totalFiles: 0,
      referencedFiles: 0,
      orphanFiles: 0,
      orphans: [],
    };
  }

  console.log(`📁 프로젝트 경로: ${projectDir}\n`);

  // 1. tasks에서 참조된 파일 추출
  console.log('📖 tasks 문서에서 참조 파일 추출 중...');
  const referencedPaths = extractReferencedFiles(tasksDir);
  console.log(`   → ${referencedPaths.size}개 파일 참조됨\n`);

  // 2. 프로젝트의 모든 소스 파일 수집
  console.log('📂 프로젝트 파일 스캔 중...');
  const allSourceFiles = collectSourceFiles(projectDir, projectDir, options);
  console.log(`   → ${allSourceFiles.length}개 파일 발견\n`);

  // 3. 고아 파일 찾기
  console.log('🔎 고아 파일 탐색 중...\n');

  const orphans: OrphanFile[] = [];
  let checkedCount = 0;

  for (const sourceFile of allSourceFiles) {
    checkedCount++;

    // tasks에서 참조됨
    if (referencedPaths.has(sourceFile)) {
      continue;
    }

    // 설정 파일은 스킵
    const fileType = classifyFileType(sourceFile);
    if (fileType === 'config') {
      continue;
    }

    // 코드에서 import됨 확인 (소스 파일만)
    let isImported = false;
    if (fileType === 'source') {
      isImported = isImportedByCode(sourceFile, projectDir, allSourceFiles);
    }

    // tasks에도 없고, import도 안 됨 → 고아 파일
    if (!isImported) {
      try {
        const fullPath = join(projectDir, sourceFile);
        const stat = statSync(fullPath);

        orphans.push({
          path: sourceFile,
          type: fileType,
          size: stat.size,
          isImportedByCode: false,
        });
      } catch (_error) {
        // 파일 접근 실패 무시
      }
    }

    // 진행 상황 출력 (100개마다)
    if (checkedCount % 100 === 0) {
      console.log(`   검사 중... ${checkedCount}/${allSourceFiles.length}`);
    }
  }

  console.log(`\n━${'━'.repeat(40)}`);
  console.log('📊 검증 결과\n');
  console.log(`전체 파일: ${allSourceFiles.length}`);
  console.log(`참조됨: ${referencedPaths.size}`);
  console.log(`고아 파일: ${orphans.length}\n`);

  // 고아 파일 상세 출력
  if (orphans.length > 0) {
    console.log('⚠️  고아 파일 목록:\n');

    // 타입별로 그룹화
    const byType: Record<string, OrphanFile[]> = {
      source: [],
      config: [],
      other: [],
    };

    for (const orphan of orphans) {
      byType[orphan.type].push(orphan);
    }

    // 소스 파일
    if (byType.source.length > 0) {
      console.log('📄 소스 파일:');
      for (const orphan of byType.source.slice(0, 20)) {
        const sizeKB = (orphan.size / 1024).toFixed(1);
        console.log(`   ${orphan.path} (${sizeKB} KB)`);
      }
      if (byType.source.length > 20) {
        console.log(`   ... 외 ${byType.source.length - 20}개\n`);
      } else {
        console.log('');
      }
    }

    // 기타 파일
    if (byType.other.length > 0) {
      console.log('📋 기타 파일:');
      for (const orphan of byType.other.slice(0, 10)) {
        const sizeKB = (orphan.size / 1024).toFixed(1);
        console.log(`   ${orphan.path} (${sizeKB} KB)`);
      }
      if (byType.other.length > 10) {
        console.log(`   ... 외 ${byType.other.length - 10}개\n`);
      } else {
        console.log('');
      }
    }

    console.log('💡 힌트:');
    console.log('  - tasks 문서에 참조 추가: code_references 또는 entry_point');
    console.log('  - 사용하지 않는 파일이면 삭제 고려');
    console.log('  - 다른 코드에서 import하여 사용 중이면 문제 없음\n');
  } else {
    console.log('✅ 모든 파일이 tasks에 문서화되었거나 코드에서 사용 중입니다\n');
  }

  return {
    success: orphans.length === 0,
    totalFiles: allSourceFiles.length,
    referencedFiles: referencedPaths.size,
    orphanFiles: orphans.length,
    orphans,
  };
}
