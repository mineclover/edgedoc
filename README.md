# edgedoc

Edge-based Documentation Validation & Sync Tool (CLI + MCP)

## 소개

`edgedoc`는 edge 기반 양방향 참조 체계를 사용하는 문서 검증 및 동기화 도구입니다. 문서 간 관계를 그래프 구조로 관리하며, 점진적 마이그레이션과 문서 일관성을 검증합니다. TypeScript로 작성되었으며 Node.js 런타임을 사용합니다.

### 주요 기능

- ✅ **마이그레이션 검증**: `tasks/` → `tasks-v2/` 점진적 마이그레이션 지원
- ✅ **네이밍 컨벤션 검증**: 인터페이스 및 공유 타입 파일명 규칙 강제
- ✅ **고아 파일 검증**: 문서화되지 않고 사용되지 않는 파일 탐지
- ✅ **SSOT 검증**: Single Source of Truth 원칙 준수 확인
- ✅ **섹션 검증**: 문서 섹션 누락 감지
- ✅ **타입 검증**: TypeScript 타입 정의 누락 감지
- ✅ **리포트 생성**: 마크다운 형식 검증 리포트
- ✅ **다국어 지원**: TypeScript, JavaScript, Python 파일 자동 파싱
- ✅ **참조 그래프**: 양방향 참조 인덱스 (feature↔code↔term)
- ✅ **용어 관리**: 용어 정의 및 사용 추적
- ✅ **MCP 서버**: AI 에이전트 통합 (Claude Desktop)

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

- [Node.js](https://nodejs.org) >= 18.0
- npm >= 9.0 (Node.js와 함께 설치됨)

### 의존성 설치

\`\`\`bash
cd edgedoc
npm install
\`\`\`

## Configuration (mdoc.config.json)

Create `mdoc.config.json` in your project root to customize validation rules:

```json
{
  "language": "en",
  "docs": {
    "baseDir": "edgedoc",
    "features": "features",
    "interfaces": "interfaces",
    "shared": "shared"
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
```

### Configuration Options

#### docs (문서 디렉토리 구조)
- **baseDir**: 문서 저장 루트 디렉토리 (기본: `edgedoc`)
  - **Type**: `string`
  - **예시**: `edgedoc`, `tasks`, `docs/specs`, `specs` 등
- **features**: 기능 문서 하위 디렉토리 (기본: `features`)
- **interfaces**: 인터페이스 문서 하위 디렉토리 (기본: `interfaces`)
- **shared**: 공용 타입 문서 하위 디렉토리 (기본: `shared`)

**기본 디렉토리 구조**:
```
edgedoc/
├── features/        # 기능 문서 (1_Feature.md)
├── interfaces/      # 인터페이스 (A--B.md)
└── shared/          # 공용 타입 (A--B_C--D.md)
```

**기존 tasks/ 프로젝트로 설정**:
```json
{
  "docs": {
    "baseDir": "tasks"
  }
}
```

**완전한 커스텀 구조**:
```json
{
  "docs": {
    "baseDir": "specs",
    "features": "features",
    "interfaces": "api-interfaces",
    "shared": "common-types"
  }
}
```

#### language
- **Type**: `"en"` | `"ko"`
- **Default**: `"en"`
- **Description**: 명령어 출력 언어
  - `"en"` - English (기본값)
  - `"ko"` - Korean (한국어)

```json
{
  "language": "ko"
}
```

#### validation.sharedTypes
- **maxPairs**: 공유 타입 파일명에 허용되는 최대 쌍 개수 (기본: 12)
- **warnAtPairs**: 경고를 표시할 쌍 개수 (기본: 8)
- **규칙**:
  - 8개 쌍 이상: ⚠️ 경고 (Global type 고려 권장)
  - 12개 쌍 이상: ❌ 에러 (파일명이 너무 길어지므로 Global type으로 격상 필수)
- **Global type 권장 사례**: `LayerNode.md`, `ImageAsset.md` 등 의미 있는 이름 사용

```json
{
  "validation": {
    "sharedTypes": {
      "maxPairs": 15,
      "warnAtPairs": 10
    }
  }
}
```

#### terminology.globalScopePaths
- **Type**: `string[]`
- **Description**: 전역 범위로 취급할 용어 정의 경로
- **기본값**: `["docs/GLOSSARY.md", "docs/terms/"]`
- **용도**: 이 경로들의 용어 정의는 프로젝트 전역에서 참조 가능

```json
{
  "terminology": {
    "globalScopePaths": [
      "docs/GLOSSARY.md",
      "docs/terms/",
      "tasks/syntax/"
    ]
  }
}
```

### 마이그레이션 검증

마이그레이션 검증은 **자동으로 감지**됩니다:
- `tasks-v2/` 디렉토리가 **존재하면** → 마이그레이션 검증 실행
- `tasks-v2/` 디렉토리가 **없으면** → 마이그레이션 검증 스킵

별도의 설정이나 플래그가 필요하지 않습니다!

## 사용법

### 개발 모드

\`\`\`bash
# 소스 코드 직접 실행
npm run dev validate migration --help
\`\`\`

### CLI 빌드

\`\`\`bash
# JavaScript 번들 빌드
npm run build

# 실행 가능한 바이너리 빌드
npm run build:binary
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

#### 5. Tasks 관리

**모든 feature task 목록 조회**:
```bash
edgedoc tasks list
```

**출력 예시**:
```
📋 전체 Tasks (12개)

[#01] validate-migration (feature) ████████████████████ 100% (14/14)
  Status: active | Priority: high
  File: tasks/features/01_ValidateMigration.md
  Title: Validate Migration Progress

[#02] validate-naming (feature) ██████████████████░░ 85% (11/13)
  Status: active | Priority: medium
  File: tasks/features/02_ValidateNaming.md
  Title: Interface & Shared Type Naming Convention Validation
```

**특정 feature 상세 조회**:
```bash
edgedoc tasks get mcp-server
```

**전체 진행 현황 대시보드**:
```bash
edgedoc tasks progress
```

**출력 예시**:
```
📊 Tasks Progress Dashboard

📝 Total Tasks: 12

Status Distribution:
  ✅ active: 8 (67%)
  🔄 in_progress: 2 (17%)
  📋 planned: 2 (17%)

Overall Progress:
  Total Checkboxes: 156
  Checked: 89
  Progress: ████████████░░░░░░░░ 57%
```

**코드 파일로 역참조 조회**:
```bash
# 특정 코드 파일이 어떤 feature에 문서화되어 있는지 + 해당 feature의 tasks 조회
edgedoc tasks list --code src/tools/validate-naming.ts

# 미완료 tasks만 필터링
edgedoc tasks list --code src/tools/validate-naming.ts --incomplete
```

**인터페이스로 역참조 조회**:
```bash
# 특정 인터페이스를 제공하거나 사용하는 feature의 tasks 조회
edgedoc tasks list --interface validation/naming

# 미완료만
edgedoc tasks list --interface validation/naming --incomplete
```

**용어로 역참조 조회**:
```bash
# 특정 용어를 정의한 feature의 tasks 조회
edgedoc tasks list --term interface-naming
```

**미완료 tasks만 필터링**:
```bash
edgedoc tasks list --incomplete
```

**주요 기능**:
- 체크박스 기반 진행도 계산 (`[x]` vs `[ ]`)
- 상태별/타입별/우선순위별 분류
- 역참조: Code → Feature → Tasks
- 역참조: Interface → Feature → Tasks
- 역참조: Term → Feature → Tasks
- 미완료 필터링으로 집중 워크플로우 지원

#### 6. 인터페이스 검증

**양방향 링크 및 Sibling Coverage 검증**:
```bash
edgedoc validate interfaces
```

**출력 예시**:
```
🔍 Validating interface links...

✅ Bidirectional Links: OK
   - All used interfaces have providers
   - No unused interfaces found

⚠️  Sibling Coverage Issues (2):

  Namespace: api
  Feature: api-client
  Provided: api/client, api/request (2/4 siblings)
  Missing: api/response, api/websocket

💡 When documenting interfaces in a namespace, consider documenting all siblings
   to maintain complete "field of view" coverage.
```

**특정 feature만 검증**:
```bash
edgedoc validate interfaces --feature api-client
```

**특정 namespace만 검증**:
```bash
edgedoc validate interfaces --namespace api
```

**상세 출력**:
```bash
edgedoc validate interfaces --verbose
```

**검증 항목**:
- **Bidirectional Links**: `provides` ↔ `uses` 관계 일치 여부
  - Missing Providers: 사용되지만 제공되지 않는 인터페이스
  - Unused Interfaces: 제공되지만 사용되지 않는 인터페이스
- **Sibling Coverage** (Field of View): 네임스페이스 내 부분 문서화 감지
  - 한 feature가 `auth/login`을 문서화하면 `auth/logout`, `auth/refresh` 등 sibling도 문서화해야 함

#### 7. Details 블록 관리

**마크다운 파일의 details 블록 목록 조회**:
```bash
edgedoc docs list tasks/features/01_ValidateMigration.md
```

**출력 예시**:
```
📄 File: tasks/features/01_ValidateMigration.md

Total <details> blocks: 3

[0] ⬇️  Implementation Details (closed)
    Lines: 45-89

[1] ⬆️  Example Output (open)
    Lines: 95-128

[2] ⬇️  Technical Notes (closed)
    Lines: 142-167
```

**특정 블록 열기**:
```bash
edgedoc docs open tasks/features/01_ValidateMigration.md --index 0 2
```

**모든 블록 열기**:
```bash
edgedoc docs open tasks/features/01_ValidateMigration.md --all
```

**모든 블록 닫기**:
```bash
edgedoc docs close tasks/features/01_ValidateMigration.md --all
```

**주요 기능**:
- `<details>` 태그 파싱 (단일/다중 라인 summary 지원)
- 인덱스 기반 선택적 토글
- 일괄 열기/닫기
- 변경 사항 자동 저장

#### 8. 옵션

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
├── package-lock.json
├── tsconfig.json
└── build.mjs
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
- [docs/MCP_SETUP.md](./docs/MCP_SETUP.md) - **MCP 서버 설정 가이드** ⭐ (Claude Desktop 연동)
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

### Phase 2: MCP 서버 ✅ (완료)
- [x] MCP 서버 구현
- [x] AI 에이전트 통합
- [x] 검증 도구 노출 (validate migration, naming, orphans, interfaces)
- [x] 그래프 도구 노출 (graph build, query)
- [x] 용어 도구 노출 (terms validate, list, find)
- [x] Tasks 관리 도구 (list, get, progress, 역참조)
- [x] Docs 관리 도구 (list, open, close details 블록)
- [x] 동적 리소스 제공 (reference index, features, terms)
- [x] 개별 feature/term/code 조회
- [x] **총 18개 MCP 도구 완료**

### Phase 3: 추가 기능 (일부 완료)
- [x] Tasks 관리 시스템 (체크박스 기반 진행도)
- [x] 역참조 조회 (Code/Interface/Term → Feature → Tasks)
- [x] 인터페이스 양방향 검증
- [x] Sibling Coverage 검증 (Field of View)
- [x] Details 블록 관리 (단일/다중라인 summary)
- [ ] 코드 참조 자동 동기화
- [ ] CI/CD 통합
- [ ] 테스트 커버리지

## 기술 스택

- **런타임**: Node.js
- **언어**: TypeScript
- **빌드**: esbuild
- **CLI**: Commander.js
- **검증**: Zod
- **MCP**: @modelcontextprotocol/sdk
- **파싱**: tree-sitter (TypeScript, JavaScript, Python, Markdown)

## 라이센스

MIT

## 버전

1.3.0

---

**작성일**: 2025-10-23 (최종 수정: 2025-10-26)
**상태**: CLI + MCP 완성 (18개 도구), Node.js 마이그레이션 완료
