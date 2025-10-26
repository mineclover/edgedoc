---
feature: "08_Config"
entry_point: "src/utils/config.ts"
type: "configuration"
status: "implemented"
related_features:
  - 10_Internationalization
code_references:
  - "mdoc.config.example.json"
  - "src/shared/i18n.ts"
  - "src/types/config.ts"
  - "src/utils/config.ts"
---

# 08_Config - 설정 시스템

## 개요

mdoc-tools의 설정 시스템을 관리합니다. `mdoc.config.json` 파일을 통해 검증 규칙을 커스터마이징할 수 있습니다.

## 설정 파일

**위치**: 프로젝트 루트의 `mdoc.config.json`

**예시**: `mdoc.config.example.json`

```json
{
  "$schema": "./schema/mdoc-config.schema.json",
  "language": "en",
  "validation": {
    "sharedTypes": {
      "maxPairs": 12,
      "warnAtPairs": 8
    }
  },
  "terminology": {
    "globalScopePaths": [
      "docs/GLOSSARY.md",
      "tasks/syntax/"
    ]
  }
}
```

## 주요 기능

### 1. 설정 타입

**파일**: `src/types/config.ts:1-40`

```typescript
export interface MdocConfig {
  language?: 'en' | 'ko';  // Default: 'en'
  migration?: {
    sourceDir: string;
    targetDir: string;
    description?: string;
  };
  validation?: {
    sharedTypes?: {
      maxPairs: number;
      warnAtPairs: number;
      description?: string;
    };
  };
  tasks?: {
    baseDir: string;
    features: string;
    interfaces: string;
    shared: string;
  };
  terminology?: {
    globalScopePaths?: string[];  // Paths for global-scoped terms
    description?: string;
  };
}
```

### 2. 기본 설정

**파일**: `src/types/config.ts:22-39`

```typescript
export const DEFAULT_CONFIG: MdocConfig = {
  language: 'en',  // English by default
  migration: {
    sourceDir: 'tasks',
    targetDir: 'tasks-v2',
  },
  validation: {
    sharedTypes: {
      maxPairs: 12,
      warnAtPairs: 8,
    },
  },
  tasks: {
    baseDir: 'tasks',
    features: 'features',
    interfaces: 'interfaces',
    shared: 'shared',
  },
  terminology: {
    globalScopePaths: [
      'docs/GLOSSARY.md',    // Main glossary
      'tasks/syntax/',       // Syntax term definitions
    ],
  },
};
```

### 3. 설정 로딩

**파일**: `src/utils/config.ts:7-52`

- `mdoc.config.json` 존재 확인
- JSON 파싱
- 기본 설정과 Deep Merge
- 언어 설정 적용 (`setLanguage`)
- 에러 처리 (파싱 실패 시 기본 설정 사용)

### 4. 자동 감지

**마이그레이션 검증**:
- `tasks-v2/` 디렉토리 존재 → 검증 실행
- `tasks-v2/` 디렉토리 없음 → 검증 스킵

별도의 설정 플래그가 필요 없습니다!

## 설정 적용

### Language (언어)

**규칙**:
- `en`: English (default)
- `ko`: Korean

**적용**: `src/utils/config.ts` (loadConfig 함수)
- 전역 i18n 시스템에 자동 적용
- 모든 CLI 출력 메시지에 영향

### Shared Types 복잡도

**규칙**:
- 8개 쌍 이상: ⚠️ 경고 (Global type 고려 권장)
- 12개 쌍 이상: ❌ 에러 (Global type으로 격상 필수)

**적용**: `src/tools/structure.ts` (validateStructure 함수)

### Terminology Global Scope Paths

**규칙**:
- 지정된 경로의 용어 정의는 `global` scope로 자동 인식
- 다른 경로의 용어는 `document` scope (파일 내부에서만 유효)

**기본값**:
- `docs/GLOSSARY.md`: 프로젝트 전체 용어집
- `tasks/syntax/`: Syntax Term 정의 (문법 용어)

**적용**: `src/parsers/TermParser.ts` (extractDefinitions 함수)

**사용 예시**:
```json
{
  "terminology": {
    "globalScopePaths": [
      "docs/GLOSSARY.md",
      "tasks/syntax/",
      "docs/architecture/terms.md"  // 커스텀 경로 추가
    ]
  }
}
```

**효과**:
- `docs/GLOSSARY.md`의 `## [[Entry Point]]` → global scope
- `tasks/syntax/Component-Definition.md`의 `# [[Component Definition]]` → global scope
- `tasks/features/13_ValidateTerms.md`의 `### [[Local Term]]` → document scope

## 구현 상태

- ✅ 타입 정의
- ✅ 기본 설정
- ✅ 설정 로딩 (Deep Merge)
- ✅ 언어 설정 (i18n 통합)
- ✅ 에러 처리
- ✅ Shared Types 복잡도 검증
- ✅ 마이그레이션 자동 감지

## 관련 기능

- **10_Internationalization**: 언어 설정을 통한 다국어 지원
