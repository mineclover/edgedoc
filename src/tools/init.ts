import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface InitOptions {
  projectPath: string;
  force?: boolean;
}

const CONFIG_TEMPLATE = {
  validation: {
    sharedTypes: {
      maxPairs: 12,
      warnAtPairs: 8,
    },
  },
};

const GUIDE_TEMPLATE = `# EdgeDoc 가이드

## 핵심 철학

### 1. Edge-based 문서 체계

EdgeDoc은 문서 간 관계를 **그래프의 간선(edge)**으로 표현합니다.

- **A--B**: A와 B 사이의 관계 (인터페이스)
- **A--B_B--C**: 여러 관계의 교집합 (공유 타입)

이는 단순한 파일명이 아닌, **문서 간 관계의 구조적 표현**입니다.

### 2. 양방향 참조 일관성 (Bidirectional Reference)

모든 관계는 양방향으로 일관성을 유지해야 합니다.

- 공용 타입 → 인터페이스: \`interfaces\` 필드에 명시
- 인터페이스 → 공용 타입: \`shared_types\` 필드에 명시

이를 통해 **참조 무결성**을 보장합니다.

### 3. 단일 진실 원천 (SSOT)

같은 타입은 한 곳에서만 정의합니다.

\`\`\`
shared/          # 타입 정의만
interfaces/      # 타입 참조만
features/        # 타입 참조만
\`\`\`

### 4. 동일 원천 데이터 원칙

완전히 동일한 구조가 아니어도, **같은 원천**에서 파생되면 공용 타입입니다.

\`\`\`typescript
// 전체 사용
interface ImageAsset { id, name, width, height, blob }

// 부분 사용 (같은 원천)
Pick<ImageAsset, 'id' | 'name' | 'width' | 'height'>
\`\`\`

### 5. 그래프 무결성

- **순환 참조 방지**: 문서 간 순환 의존성 검증
- **고아 노드 검출**: 참조되지 않는 문서 탐지
- **일관성 검증**: frontmatter 양방향 참조 확인

## 시작하기

1. 프로젝트 구조:
\`\`\`
your-project/
├── tasks/
│   ├── interfaces/    # A--B.md 형식
│   ├── shared/        # A--B_C--D.md 형식
│   └── features/      # 기능 문서
└── mdoc.config.json
\`\`\`

2. 검증 실행:
\`\`\`bash
edgedoc validate all
\`\`\`

## 핵심 규칙

1. **파일명 = 관계의 표현**: \`A--B\`는 A-B 간선을 나타냄
2. **양방향 = 무결성**: 관계는 항상 쌍방향 명시
3. **SSOT = 일관성**: 정의는 한 곳, 참조는 여러 곳
4. **원천 = 공유 기준**: 구조가 아닌 원천으로 공유 여부 판단
5. **그래프 = 전체 구조**: 개별 문서가 아닌 관계망으로 사고

---

더 자세한 내용은 \`edgedoc --help\`를 참고하세요.
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

    // 3. tasks 디렉토리 구조 생성 (없을 경우)
    const tasksPath = join(projectPath, 'tasks');
    if (!existsSync(tasksPath)) {
      await mkdir(tasksPath, { recursive: true });
      await mkdir(join(tasksPath, 'interfaces'), { recursive: true });
      await mkdir(join(tasksPath, 'shared'), { recursive: true });
      await mkdir(join(tasksPath, 'features'), { recursive: true });
      console.log('✅ tasks/ 디렉토리 구조 생성 완료');
      console.log('   - tasks/interfaces/');
      console.log('   - tasks/shared/');
      console.log('   - tasks/features/');
    } else {
      console.log('ℹ️  tasks/ 디렉토리가 이미 존재합니다.');
    }

    console.log('\n🎉 초기화 완료!\n');
    console.log('다음 단계:');
    console.log('1. EDGEDOC_GUIDE.md를 읽고 핵심 철학 이해');
    console.log('2. tasks/ 디렉토리에 문서 작성');
    console.log('3. edgedoc validate all 로 검증\n');

    return { success: true };
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    return { success: false, error };
  }
}
