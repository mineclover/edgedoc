---
feature: "08_Config"
entry_point: "src/utils/config.ts"
code_references:
  - "src/types/config.ts"
  - "src/utils/config.ts"
  - "mdoc.config.example.json"
type: "configuration"
status: "implemented"
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
  "validation": {
    "sharedTypes": {
      "maxPairs": 12,
      "warnAtPairs": 8
    }
  }
}
```

## 주요 기능

### 1. 설정 타입

**파일**: `src/types/config.ts:1-40`

```typescript
export interface MdocConfig {
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
}
```

### 2. 기본 설정

**파일**: `src/types/config.ts:22-39`

```typescript
export const DEFAULT_CONFIG: MdocConfig = {
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
};
```

### 3. 설정 로딩

**파일**: `src/utils/config.ts:7-36`

- `mdoc.config.json` 존재 확인
- JSON 파싱
- 기본 설정과 Deep Merge
- 에러 처리 (파싱 실패 시 기본 설정 사용)

### 4. 자동 감지

**마이그레이션 검증**:
- `tasks-v2/` 디렉토리 존재 → 검증 실행
- `tasks-v2/` 디렉토리 없음 → 검증 스킵

별도의 설정 플래그가 필요 없습니다!

## 설정 적용

### Shared Types 복잡도

**규칙**:
- 8개 쌍 이상: ⚠️ 경고 (Global type 고려 권장)
- 12개 쌍 이상: ❌ 에러 (Global type으로 격상 필수)

**적용**: `src/tools/structure.ts` (validateStructure 함수)

## 구현 상태

- ✅ 타입 정의
- ✅ 기본 설정
- ✅ 설정 로딩 (Deep Merge)
- ✅ 에러 처리
- ✅ Shared Types 복잡도 검증
- ✅ 마이그레이션 자동 감지
