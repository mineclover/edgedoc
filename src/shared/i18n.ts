/**
 * Internationalization (i18n) support
 */

export type Language = 'en' | 'ko';

export interface Messages {
  // Sync command
  sync: {
    starting: string;
    projectPath: string;
    scanningFiles: string;
    filesFound: string;
    analyzingCode: string;
    filesAnalyzed: string;
    buildingGraph: string;
    dependenciesTracked: string;
    parsingDocs: string;
    docsFound: string;
    updatingDocs: string;
    syncComplete: string;
    totalDocs: string;
    updated: string;
    failed: string;
    dryRunWarning: string;
    filesAdded: string;
    filesRemoved: string;
  };

  // Validation commands
  validation: {
    structureTitle: string;
    circularDeps: string;
    noCircularDeps: string;
    circularDepsFound: string;
    interfaceConsistency: string;
    interfaceConsistent: string;
    interfaceInconsistent: string;
    frontmatterFields: string;
    frontmatterComplete: string;
    frontmatterMissing: string;
    exampleCode: string;
    noExampleCode: string;
    exampleCodeFound: string;
    sharedTypeStructure: string;
    sharedTypeValid: string;
    sharedTypeErrors: string;
    allTestsPassed: string;
    errorsFound: string;
  };

  // Orphan detection
  orphans: {
    starting: string;
    projectPath: string;
    extractingRefs: string;
    refsExtracted: string;
    scanningFiles: string;
    filesFound: string;
    buildingGraph: string;
    filesAnalyzed: string;
    searchingOrphans: string;
    result: string;
    totalFiles: string;
    referenced: string;
    orphanFiles: string;
    sourceFiles: string;
    otherFiles: string;
    hints: string;
    addToTasks: string;
    deleteUnused: string;
    importedOk: string;
  };

  // Common
  common: {
    success: string;
    failed: string;
    passed: string;
    warning: string;
    error: string;
  };
}

const EN_MESSAGES: Messages = {
  sync: {
    starting: '🔄 Starting code reference synchronization...',
    projectPath: '📁 Project path',
    scanningFiles: '📂 Scanning code files...',
    filesFound: 'files found',
    analyzingCode: '🔗 Analyzing code (Tree-sitter)...',
    filesAnalyzed: 'files analyzed',
    buildingGraph: '📊 Building dependency graph...',
    dependenciesTracked: 'file dependencies tracked',
    parsingDocs: '📖 Parsing documents...',
    docsFound: 'documents found',
    updatingDocs: '📝 Updating documents...',
    syncComplete: '📊 Synchronization complete',
    totalDocs: 'Total documents',
    updated: 'Updated',
    failed: 'Failed',
    dryRunWarning: '⚠️  Dry-run mode: No files were modified',
    filesAdded: 'added',
    filesRemoved: 'removed',
  },

  validation: {
    structureTitle: '🔍 Tasks Structure Validation',
    circularDeps: '1️⃣  Checking circular dependencies...',
    noCircularDeps: '✅ No circular dependencies',
    circularDepsFound: '⚠️  Circular dependencies found',
    interfaceConsistency: '2️⃣  Checking interface consistency...',
    interfaceConsistent: '✅ Interface consistency verified',
    interfaceInconsistent: '⚠️  Interface inconsistencies found',
    frontmatterFields: '3️⃣  Checking required frontmatter fields...',
    frontmatterComplete: '✅ All frontmatter fields present',
    frontmatterMissing: '⚠️  Missing frontmatter fields',
    exampleCode: '4️⃣  Checking for prohibited example code...',
    noExampleCode: '✅ No example code found',
    exampleCodeFound: '⚠️  Example code detected',
    sharedTypeStructure: '5️⃣  Validating shared type structure...',
    sharedTypeValid: '✅ Shared type structure validation passed',
    sharedTypeErrors: 'shared type errors found',
    allTestsPassed: '✅ All validations passed',
    errorsFound: 'errors found',
  },

  orphans: {
    starting: '🔍 Starting orphan file detection...',
    projectPath: '📁 Project path',
    extractingRefs: '📖 Extracting file references from tasks documents...',
    refsExtracted: 'files referenced',
    scanningFiles: '📂 Scanning project files...',
    filesFound: 'files found',
    buildingGraph: '🔗 Building import graph...',
    filesAnalyzed: 'files analyzed',
    searchingOrphans: '🔎 Searching for orphan files...',
    result: '📊 Validation result',
    totalFiles: 'Total files',
    referenced: 'Referenced',
    orphanFiles: 'Orphan files',
    sourceFiles: 'Source files',
    otherFiles: 'Other files',
    hints: '💡 Hints',
    addToTasks: 'Add to tasks documentation: code_references or entry_point',
    deleteUnused: 'Delete if unused',
    importedOk: 'OK if imported by other code',
  },

  common: {
    success: 'Success',
    failed: 'Failed',
    passed: 'Passed',
    warning: 'Warning',
    error: 'Error',
  },
};

const KO_MESSAGES: Messages = {
  sync: {
    starting: '🔄 코드 참조 동기화 시작...',
    projectPath: '📁 프로젝트 경로',
    scanningFiles: '📂 코드 파일 스캔 중...',
    filesFound: '개 파일 발견',
    analyzingCode: '🔗 코드 분석 중 (Tree-sitter)...',
    filesAnalyzed: '개 파일 분석됨',
    buildingGraph: '📊 의존성 그래프 구축 중...',
    dependenciesTracked: '개 파일의 의존성 추적됨',
    parsingDocs: '📖 문서 파싱 중...',
    docsFound: '개 문서 발견',
    updatingDocs: '📝 문서 업데이트 중...',
    syncComplete: '📊 동기화 완료',
    totalDocs: '전체 문서',
    updated: '업데이트',
    failed: '실패',
    dryRunWarning: '⚠️  Dry-run 모드: 실제 파일은 변경되지 않았습니다',
    filesAdded: '개 추가',
    filesRemoved: '개 제거',
  },

  validation: {
    structureTitle: '🔍 Tasks 구조 검증',
    circularDeps: '1️⃣  순환 의존성 검사...',
    noCircularDeps: '✅ 순환 의존성 없음',
    circularDepsFound: '⚠️  순환 의존성 발견됨',
    interfaceConsistency: '2️⃣  인터페이스 일관성 검사...',
    interfaceConsistent: '✅ 인터페이스 일관성 확인',
    interfaceInconsistent: '⚠️  인터페이스 불일치 발견',
    frontmatterFields: '3️⃣  Frontmatter 필수 필드 검사...',
    frontmatterComplete: '✅ Frontmatter 필드 완전',
    frontmatterMissing: '⚠️  누락된 필드 있음',
    exampleCode: '4️⃣  예시 코드 금지 검사...',
    noExampleCode: '✅ 예시 코드 없음',
    exampleCodeFound: '⚠️  예시 코드 발견',
    sharedTypeStructure: '5️⃣  공용 타입 구조 검증...',
    sharedTypeValid: '✅ 공용 타입 구조 검증 통과',
    sharedTypeErrors: '개 공용 타입 오류 발견',
    allTestsPassed: '✅ 모든 검증 통과',
    errorsFound: '개 오류 발견',
  },

  orphans: {
    starting: '🔍 고아 파일 검증 시작...',
    projectPath: '📁 프로젝트 경로',
    extractingRefs: '📖 tasks 문서에서 참조 파일 추출 중...',
    refsExtracted: '개 파일 참조됨',
    scanningFiles: '📂 프로젝트 파일 스캔 중...',
    filesFound: '개 파일 발견',
    buildingGraph: '🔗 Import 그래프 구축 중...',
    filesAnalyzed: '개 파일 분석됨',
    searchingOrphans: '🔎 고아 파일 탐색 중...',
    result: '📊 검증 결과',
    totalFiles: '전체 파일',
    referenced: '참조됨',
    orphanFiles: '고아 파일',
    sourceFiles: '소스 파일',
    otherFiles: '기타 파일',
    hints: '💡 힌트',
    addToTasks: 'tasks 문서에 참조 추가: code_references 또는 entry_point',
    deleteUnused: '사용하지 않는 파일이면 삭제 고려',
    importedOk: '다른 코드에서 import하여 사용 중이면 문제 없음',
  },

  common: {
    success: '성공',
    failed: '실패',
    passed: '통과',
    warning: '경고',
    error: '오류',
  },
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(): Messages {
  return currentLanguage === 'ko' ? KO_MESSAGES : EN_MESSAGES;
}
