---
feature: "00_Init"
entry_point: "src/cli.ts"
code_references:
  - "src/cli.ts"
  - "src/shared/types.ts"
  - "src/shared/utils.ts"
  - "src/index.ts"
interfaces:
  - "00--01"
  - "00--02"
  - "00--03"
  - "00--04"
  - "00--05"
  - "00--06"
  - "00--07"
type: "initialization"
status: "implemented"
---

# 00_Init - CLI 초기화

## 개요

mdoc-tools의 CLI 진입점으로, Commander.js를 사용하여 명령어 라우팅을 처리합니다.

## 엔트리 포인트

**파일**: `src/cli.ts:1-13`

```typescript
#!/usr/bin/env bun
import { Command } from 'commander';
```

## 주요 기능

### 1. CLI 프로그램 초기화

Commander.js를 사용하여 CLI 애플리케이션을 설정합니다.

**코드**: `src/cli.ts:11-13`

```typescript
const program = new Command();
program.name('mdoc').version('1.0.0').description('문서 검증 및 동기화 도구');
```

### 2. 명령어 그룹 정의

- `validate` - 문서 검증 관련 명령어 그룹
- `sync` - 코드 참조 동기화
- `docs` - 문서 도구 (개발 중)

## 연결된 기능

- **01_ValidateMigration** - 마이그레이션 검증
- **02_ValidateNaming** - 네이밍 컨벤션 검증
- **03_ValidateOrphans** - 고아 파일 검증
- **04_ValidateStructure** - 문서 구조 검증
- **05_ValidateSpecOrphans** - 스펙 고아 코드 검증
- **06_ValidateAll** - 전체 검증
- **07_Sync** - 코드 참조 동기화

## 구현 상태

- ✅ CLI 프레임워크 설정
- ✅ 명령어 라우팅
- ✅ 버전 및 설명 설정
- ✅ 에러 처리
