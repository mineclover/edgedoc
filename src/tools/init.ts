import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface InitOptions {
  projectPath: string;
  force?: boolean;
}

const CONFIG_TEMPLATE = {
  language: 'en',
  docs: {
    baseDir: 'edgedoc',
    features: 'features',
    interfaces: 'interfaces',
    shared: 'shared',
  },
  validation: {
    sharedTypes: {
      maxPairs: 12,
      warnAtPairs: 8,
    },
  },
  terminology: {
    globalScopePaths: [
      'docs/GLOSSARY.md',
      'docs/terms/',
    ],
  },
};

const GUIDE_TEMPLATE = `# EdgeDoc Quick Start Guide

> Edge-based Documentation Validation & Sync Tool (CLI + MCP)

## 🚀 빠른 시작

### 설치된 프로젝트 구조

\`\`\`bash
your-project/
├── mdoc.config.json          # 설정 파일 (docs.baseDir로 경로 지정)
├── docs/
│   └── GLOSSARY.md          # 용어 정의 (global scope)
├── edgedoc/                 # 문서 루트 (기본값, config로 변경 가능)
│   ├── features/            # 기능 문서
│   ├── interfaces/          # 인터페이스 (A--B.md)
│   └── shared/              # 공용 타입 (A--B_C--D.md)
└── .edgedoc/
    └── references.json      # 자동 생성 (graph build)
\`\`\`

**디렉토리 구조 커스터마이징** (mdoc.config.json):
- \`docs.baseDir\`: 문서 루트 (기본: edgedoc → tasks, specs 등으로 변경 가능)
- \`docs.features\`: features 하위 디렉토리 (기본: features)
- \`docs.interfaces\`: interfaces 하위 디렉토리 (기본: interfaces)
- \`docs.shared\`: shared types 하위 디렉토리 (기본: shared)

### 첫 번째 검증 실행

\`\`\`bash
# 모든 검증 실행
npm run dev validate all

# 또는 빌드 후
npm run build
edgedoc validate all
\`\`\`

## 📋 핵심 개념

### 1. Edge-Based 명명 체계

문서 간의 관계를 파일명으로 표현합니다:

- **인터페이스**: \`A--B.md\` (A와 B 사이의 관계)
- **공용 타입**: \`A--B_C--D.md\` (여러 관계의 교집합)
  - 반드시 정렬된 형태: \`01--02_01--03\` ✓
  - 역순 불가: \`02--01\` ✗

### 2. 양방향 참조 일관성

모든 관계는 frontmatter에서 명시적으로 쌍방향 참조:

\`\`\`yaml
---
# 인터페이스 (A--B.md)
shared_types:
  - "A--B_C--D"    # 이 인터페이스를 사용하는 공용 타입

# 공용 타입 (A--B_C--D.md)
interfaces:
  - "A--B"         # 이 공용 타입이 제공하는 인터페이스
  - "C--D"
---
\`\`\`

### 3. SSOT (Single Source of Truth)

- **정의**: \`shared/\` 또는 \`docs/\` 디렉토리에서만
- **참조**: \`interfaces/\`, \`features/\`에서 링크 사용
- **중복 정의 금지**: 같은 타입을 여러 곳에서 정의하지 않기

### 4. 용어 관리 (Terminology)

전역 용어는 \`docs/GLOSSARY.md\` 또는 \`docs/terms/\`에 정의:

\`\`\`markdown
## Term Definition

**Definition**: 명확한 정의

**Related**: [[Related Term]], [[Another Term]]

**Usage**: 사용 예시
\`\`\`

참조:
\`\`\`markdown
[[Term Definition]] - 자동으로 링크 및 추적
\`\`\`

## 🛠️ 주요 명령어

### 검증

\`\`\`bash
# 전체 검증
edgedoc validate all

# 네이밍 컨벤션만
edgedoc validate naming

# 고아 파일 (참조되지 않는 파일)
edgedoc validate orphans

# 마이그레이션 (edgedoc-v2 존재 시)
edgedoc validate migration

# 인터페이스 양방향 일관성
edgedoc validate interfaces

# 용어 정의 및 참조
edgedoc validate terms
\`\`\`

### 그래프 및 참조 조회

\`\`\`bash
# 참조 인덱스 생성
edgedoc graph build

# 전체 개요
edgedoc graph query

# 특정 feature 조회
edgedoc graph query validate-terms

# 코드 역참조 (어떤 feature가 이 코드를 사용?)
edgedoc graph query --code src/tools/validate-terms.ts

# 용어 사용처 조회
edgedoc graph query --term "Term Definition"
\`\`\`

### 작업 관리

\`\`\`bash
# 모든 tasks 조회
edgedoc tasks list

# 미완료만
edgedoc tasks list --incomplete

# 특정 feature 상세
edgedoc tasks get feature-name

# 전체 진행도
edgedoc tasks progress

# 역참조: 코드 파일의 tasks 조회
edgedoc tasks list --code src/path/file.ts
\`\`\`

## ⚙️ 설정 (mdoc.config.json)

\`\`\`json
{
  "language": "en",
  "docs": {
    "baseDir": "edgedoc",           // 문서 루트 디렉토리 (기본: edgedoc)
    "features": "features",         // features 하위 디렉토리
    "interfaces": "interfaces",     // interfaces 하위 디렉토리
    "shared": "shared"              // shared types 하위 디렉토리
  },
  "validation": {
    "sharedTypes": {
      "maxPairs": 12,
      "warnAtPairs": 8
    }
  },
  "terminology": {
    "globalScopePaths": [
      "docs/GLOSSARY.md",
      "docs/terms/"
    ]
  }
}
\`\`\`

**기존 tasks/ 프로젝트로 변경 예시**:
\`\`\`json
{
  "docs": {
    "baseDir": "tasks"
  }
}
\`\`\`

**더 복잡한 구조 예시** (커스텀 경로):
\`\`\`json
{
  "docs": {
    "baseDir": "specs",
    "features": "features",
    "interfaces": "api",
    "shared": "types"
  }
}
\`\`\`

## 📚 더 알아보기

- 공유 타입 원칙: \`tasks/SHARED_TYPES.md\`
- 검증 가이드: 프로젝트의 docs/ 디렉토리
- MCP 서버: Claude Desktop 연동 가능

---

**팁**: 처음에는 \`edgedoc validate all\`로 시작하여 오류를 수정하며 학습하세요!
`;

export async function initProject(options: InitOptions) {
  const { projectPath, force = false } = options;

  console.log('🚀 EdgeDoc 프로젝트 초기화...\n');

  try {
    // 1. Config 파일 생성
    const configPath = join(projectPath, 'mdoc.config.json');
    if (existsSync(configPath) && !force) {
      console.log('⚠️  mdoc.config.json이 이미 존재합니다. --force 옵션으로 덮어쓸 수 있습니다.');
    } else {
      await writeFile(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2), 'utf-8');
      console.log('✅ mdoc.config.json 생성 완료');
    }

    // 2. 가이드 문서 생성
    const guidePath = join(projectPath, 'EDGEDOC_GUIDE.md');
    if (existsSync(guidePath) && !force) {
      console.log('⚠️  EDGEDOC_GUIDE.md이 이미 존재합니다. --force 옵션으로 덮어쓸 수 있습니다.');
    } else {
      await writeFile(guidePath, GUIDE_TEMPLATE, 'utf-8');
      console.log('✅ EDGEDOC_GUIDE.md 생성 완료');
    }

    // 3. edgedoc 디렉토리 구조 생성 (없을 경우)
    const baseDir = CONFIG_TEMPLATE.docs.baseDir;
    const basePath = join(projectPath, baseDir);
    if (!existsSync(basePath)) {
      await mkdir(basePath, { recursive: true });
      await mkdir(join(basePath, 'interfaces'), { recursive: true });
      await mkdir(join(basePath, 'shared'), { recursive: true });
      await mkdir(join(basePath, 'features'), { recursive: true });
      console.log(`✅ ${baseDir}/ 디렉토리 구조 생성 완료`);
      console.log(`   - ${baseDir}/interfaces/`);
      console.log(`   - ${baseDir}/shared/`);
      console.log(`   - ${baseDir}/features/`);
    } else {
      console.log(`ℹ️  ${baseDir}/ 디렉토리가 이미 존재합니다.`);
    }

    console.log('\n🎉 초기화 완료!\n');
    console.log('다음 단계:');
    console.log('1. EDGEDOC_GUIDE.md를 읽고 핵심 철학 이해');
    console.log(`2. ${baseDir}/ 디렉토리에 문서 작성`);
    console.log('3. edgedoc validate all 로 검증\n');
    console.log('💡 팁: 다른 디렉토리를 사용하려면 mdoc.config.json에서 tasks.baseDir을 수정하세요.');

    return { success: true };
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    return { success: false, error };
  }
}
