---
type: test
status: active
feature: tree-sitter-parser-test
test_type: manual
entry_point: "src/parsers/TypeScriptParser.ts"
test_files:
  - "tests/manual/tree-sitter-parser.test.ts"
related_features:
  - 03_ValidateOrphans
  - 05_ValidateSpecOrphans
  - 07_Sync
code_references:
  - "src/parsers/TypeScriptParser.ts"
---

# TEST: TypeScript Parser

## 목적

Tree-sitter 기반 TypeScript 파서의 정확성을 수동 테스트합니다.

## 테스트 항목

### 1. Import 파싱
- [x] Named imports: `import { A, B } from './foo'`
- [x] Default imports: `import Foo from './bar'`
- [x] Namespace imports: `import * as Utils from './utils'`
- [x] Type-only imports: `import type { Type } from './types'`
- [x] Import with .js extension: `import { func } from './file.js'`

### 2. Export 파싱
- [x] Named exports: `export interface Foo {}`
- [x] Function exports: `export function bar() {}`
- [x] Class exports: `export class Baz {}`
- [x] Const exports: `export const VALUE = 1`
- [x] Type alias exports: `export type Status = 'active' | 'inactive'`

### 3. TSX 지원
- [x] TSX 파일 파싱 (isTsx=true)
- [x] JSX elements 무시

## 테스트 방법

```bash
# Manual test script
bun tests/manual/tree-sitter-parser.test.ts
```

## 관련 기능

이 파서는 다음 기능들에서 사용됩니다:
- **03_ValidateOrphans**: Import 그래프 구축
- **05_ValidateSpecOrphans**: Export 추출
- **07_Sync**: 의존성 추적

## 테스트 파일 위치

- `tests/manual/tree-sitter-parser.test.ts` - 수동 테스트 스크립트
