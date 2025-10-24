# edgedoc

Edge-based Documentation Validation & Sync Tool (CLI + MCP)

## 소개

`edgedoc`는 edge 기반 양방향 참조 체계를 사용하는 문서 검증 및 동기화 도구입니다. 문서 간 관계를 그래프 구조로 관리하며, 점진적 마이그레이션과 문서 일관성을 검증합니다. TypeScript로 작성되었으며 Bun 런타임을 활용합니다.

### 주요 기능

- ✅ **마이그레이션 검증**: `tasks/` → `tasks-v2/` 점진적 마이그레이션 지원
- ✅ **네이밍 컨벤션 검증**: 인터페이스 및 공유 타입 파일명 규칙 강제
- ✅ **고아 파일 검증**: 문서화되지 않고 사용되지 않는 파일 탐지
- ✅ **SSOT 검증**: Single Source of Truth 원칙 준수 확인
- ✅ **섹션 검증**: 문서 섹션 누락 감지
- ✅ **타입 검증**: TypeScript 타입 정의 누락 감지
- ✅ **리포트 생성**: 마크다운 형식 검증 리포트
- ✅ **다국어 지원**: TypeScript, JavaScript, Python 파일 자동 파싱
- 🔄 **MCP 서버**: AI 에이전트 통합 (개발 중)

### 지원하는 언어

edgedoc는 Tree-sitter 기반 파서를 사용하여 다음 언어를 지원합니다:

| 언어 | 파일 확장자 | Import/Export 지원 |
|------|------------|-------------------|
| **TypeScript** | `.ts`, `.tsx` | ✅ 완전 지원 |
| **JavaScript** | `.js`, `.jsx` | ✅ 완전 지원 |
| **Python** | `.py` | ✅ 완전 지원 |

Python 지원:
- `import` / `from ... import` 문 파싱
- 함수, 클래스, 변수 정의 추출 (top-level만)
- 언더스코어(_)로 시작하는 private 이름 자동 제외

## 설치

### 사전 요구사항

- [Bun](https://bun.sh) >= 1.0

### 의존성 설치

\`\`\`bash
cd edgedoc
bun install
\`\`\`

## Configuration (mdoc.config.json)

Create `mdoc.config.json` in your project root to customize validation rules:

```json
{
  "language": "en",
  "validation": {
    "sharedTypes": {
      "maxPairs": 12,
      "warnAtPairs": 8
    }
  }
}
```

### Configuration Options

#### language
- **Type**: `"en"` | `"ko"`
- **Default**: `"en"`
- **Description**: Display language for command output
  - `"en"` - English (default)
  - `"ko"` - Korean (한국어)

```json
{
  "language": "ko"  // Use Korean messages
}
```

#### validation.sharedTypes
- **maxPairs**: 공유 타입 파일명에 허용되는 최대 쌍 개수 (기본: 12)
- **warnAtPairs**: 경고를 표시할 쌍 개수 (기본: 8)
- **규칙**:
  - 8개 쌍 이상: ⚠️ 경고 (Global type 고려 권장)
  - 12개 쌍 이상: ❌ 에러 (파일명이 너무 길어지므로 Global type으로 격상 필수)
- **Global type 권장 사례**: `LayerNode.md`, `ImageAsset.md` 등 의미 있는 이름 사용

### 마이그레이션 검증

마이그레이션 검증은 **자동으로 감지**됩니다:
- `tasks-v2/` 디렉토리가 **존재하면** → 마이그레이션 검증 실행
- `tasks-v2/` 디렉토리가 **없으면** → 마이그레이션 검증 스킵

별도의 설정이나 플래그가 필요하지 않습니다!

## 사용법

### 개발 모드

\`\`\`bash
# 소스 코드 직접 실행
bun run dev validate migration --help
\`\`\`

### CLI 빌드

\`\`\`bash
# JavaScript 번들 빌드
bun run build

# 실행 가능한 바이너리 빌드
bun run build:binary
\`\`\`

### CLI 명령어

#### 1. 마이그레이션 검증

기본 검증 (현재 디렉토리):
\`\`\`bash
edgedoc validate migration
\`\`\`

특정 프로젝트 경로 지정:
\`\`\`bash
edgedoc validate migration --project /path/to/project
\`\`\`

마크다운 리포트 생성:
\`\`\`bash
edgedoc validate migration --markdown
\`\`\`

모든 옵션 조합:
\`\`\`bash
edgedoc validate migration -p ~/my-project -m
\`\`\`

#### 2. 네이밍 컨벤션 검증

인터페이스 및 공용 타입 파일명 검증:
\`\`\`bash
edgedoc validate naming
\`\`\`

특정 프로젝트 경로 지정:
\`\`\`bash
edgedoc validate naming -p ~/my-project
\`\`\`

**검증 항목**:
- 인터페이스 파일명: \`XX--YY.md\` 형식
- 공용 타입 파일명: \`XX--YY_YY--ZZ.md\` 형식 (정렬 필수)
- Frontmatter 필수 필드
- interfaces 배열 개수 일치
- 양방향 참조 일관성

#### 3. 전체 검증

모든 검증을 한 번에 실행:
\`\`\`bash
edgedoc validate all -p ~/my-project
\`\`\`

#### 4. 참조 그래프 (Reference Index)

**인덱스 생성**:
\`\`\`bash
# 참조 인덱스 생성 (.edgedoc/references.json)
edgedoc graph build

# 상세 출력
edgedoc graph build --verbose
\`\`\`

**그래프 조회**:
\`\`\`bash
# 전체 개요
edgedoc graph query

# 특정 feature 조회
edgedoc graph query validate-terms

# 코드 파일의 역방향 조회 (어떤 feature가 이 코드를 사용하는가?)
edgedoc graph query --code src/tools/validate-terms.ts

# 용어 사용처 조회
edgedoc graph query --term "Entry Point Module"
\`\`\`

**주요 기능**:
- Feature → Code 매핑
- Code → Feature 역방향 매핑 (documented_in)
- Feature → Feature 관계 (depends_on, used_by)
- Interface 연결
- Term 정의 및 사용처 추적
- 빌드 시간: ~20ms (17 features, 31 code files, 24 terms)

#### 5. 옵션

- \`-p, --project <path>\`: 프로젝트 디렉토리 경로 (기본값: 현재 디렉토리)
- \`-m, --markdown\`: 마크다운 리포트 생성 (tasks-v2/MIGRATION_REPORT.md, migration 전용)

## 프로젝트 구조

\`\`\`
edgedoc/
├── src/
│   ├── cli.ts              # CLI 진입점 (Commander.js)
│   ├── index.ts            # MCP 서버 (개발 중)
│   ├── tools/
│   │   ├── validate.ts     # 마이그레이션 검증
│   │   ├── naming.ts       # 네이밍 컨벤션 검증
│   │   ├── orphans.ts      # 고아 파일 검증
│   │   └── sync.ts         # 동기화 로직 (개발 중)
│   └── shared/
│       ├── types.ts        # 타입 정의
│       └── utils.ts        # 유틸리티 함수
├── docs/
│   ├── MCP_SPEC.md         # MCP 서버 사양
│   ├── MIGRATION_SPEC.md   # 마이그레이션 스펙
│   ├── SHARED_TYPES.md     # 공용 타입 컨벤션
│   ├── SHARED_TYPE_PRINCIPLES.md  # 공유 타입 생성 원칙
│   ├── VALIDATION.md       # 검증 시스템 문서
│   ├── WORKFLOWS.md        # 워크플로우 가이드
│   ├── TASKS_README.md     # Tasks 디렉토리 가이드
│   └── TOOLS_README.md     # 도구 사용 가이드
├── instructions/           # 🆕 AI 에이전트 지침 문서
│   ├── AGENT_INSTRUCTIONS.md  # 에이전트 사용 지침
│   └── README.md           # 지침 문서 가이드
├── llms.txt                # 🆕 최적화된 LLM 참조 문서
├── dist/                   # 빌드 결과물
├── package.json
├── tsconfig.json
└── bunfig.toml
\`\`\`

## 문서

### 🚀 Quick Start (AI 에이전트용)
- [llms.txt](./llms.txt) - **LLM 최적화 참조 문서** ⭐ (AI 에이전트 시작점)
- [instructions/AGENT_INSTRUCTIONS.md](./instructions/AGENT_INSTRUCTIONS.md) - **AI 에이전트 사용 지침** ⭐ (상세 워크플로우)
- [instructions/README.md](./instructions/README.md) - 지침 문서 재사용 가이드

### 📋 Authority Document (SSOT)
- **[tasks/SHARED_TYPES.md](../tasks/SHARED_TYPES.md)** - **공유 타입 원칙의 단일 진실 원천** ⭐⭐⭐

### 컨벤션
- [docs/SHARED_TYPES.md](./docs/SHARED_TYPES.md) - 공용 타입 및 네이밍 컨벤션
- [docs/MIGRATION_SPEC.md](./docs/MIGRATION_SPEC.md) - 마이그레이션 검증 스펙

### 검증 시스템
- [docs/VALIDATION.md](./docs/VALIDATION.md) - 검증 시스템 상세

### 가이드
- [docs/WORKFLOWS.md](./docs/WORKFLOWS.md) - **워크플로우 가이드** ⭐ (추천 시작점)
- [docs/SHARED_TYPE_PRINCIPLES.md](./docs/SHARED_TYPE_PRINCIPLES.md) - 공유 타입 생성 원칙 (deprecated: tasks/SHARED_TYPES.md 참조)
- [docs/TASKS_README.md](./docs/TASKS_README.md) - Tasks 디렉토리 가이드
- [docs/TOOLS_README.md](./docs/TOOLS_README.md) - 도구 사용 가이드

### MCP 서버
- [docs/MCP_SPEC.md](./docs/MCP_SPEC.md) - MCP 서버 사양 및 API 문서

## 로드맵

### Phase 1: CLI 도구 (완료)
- [x] 프로젝트 구조 생성
- [x] CLI 프레임워크 (Commander.js)
- [x] 검증 로직 포팅 (Python → TypeScript)
- [x] 프로젝트 경로 파라미터 지원
- [x] 마크다운 리포트 생성
- [x] 네이밍 컨벤션 검증
- [x] 전체 검증 명령어
- [x] 바이너리 빌드

### Phase 2: MCP 서버 (개발 중)
- [ ] MCP 서버 구현
- [ ] AI 에이전트 통합
- [ ] 도구 노출 (validate, sync)

### Phase 3: 추가 기능 (예정)
- [ ] 코드 참조 동기화
- [ ] details 블록 관리
- [ ] CI/CD 통합

## 기술 스택

- **런타임**: Bun
- **언어**: TypeScript
- **CLI**: Commander.js
- **검증**: Zod
- **MCP**: @modelcontextprotocol/sdk

## 라이센스

MIT

## 버전

1.0.0

---

**작성일**: 2025-10-23
**상태**: CLI 완성, MCP 개발 중
