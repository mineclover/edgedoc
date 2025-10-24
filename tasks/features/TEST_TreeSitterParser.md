---
type: test
status: active
feature: tree-sitter-parser-test
test_type: manual
entry_point: "tests/manual/tree-sitter-parser.test.ts"
test_files:
  - "tests/manual/tree-sitter-parser.test.ts"
related_features:
  - 03_ValidateOrphans
  - 05_ValidateSpecOrphans
  - 07_Sync
  - 09_MultiLanguageParser
code_references:
  - "src/parsers/ILanguageParser.ts"
  - "src/parsers/PythonParser.ts"
  - "src/parsers/TypeScriptParser.ts"
  - "tests/manual/tree-sitter-parser.test.ts"
---

# TEST: Multi-Language Parser

## 목적

Tree-sitter 기반 다국어 파서(TypeScript, Python)의 정확성을 수동 테스트합니다.

## 테스트 항목

### TypeScript/JavaScript Parser (Tests 1-7)

#### 1. Import 파싱
- [x] Named imports: `import { A, B } from './foo'`
- [x] Default imports: `import Foo from './bar'`
- [x] Namespace imports: `import * as Utils from './utils'`
- [x] Type-only imports: `import type { Type } from './types'`
- [x] Import with .js extension: `import { func } from './file.js'`

#### 2. Export 파싱
- [x] Named exports: `export interface Foo {}`
- [x] Function exports: `export function bar() {}`
- [x] Class exports: `export class Baz {}`
- [x] Const exports: `export const VALUE = 1`
- [x] Type alias exports: `export type Status = 'active' | 'inactive'`

#### 3. TSX 지원
- [x] TSX 파일 파싱 (isTsx=true)
- [x] JSX elements 무시

### Python Parser (Tests 8-10)

#### 4. Python Import 파싱
- [x] Simple imports: `import os`
- [x] From imports: `from typing import List, Dict`
- [x] Relative imports: `from . import utils`

#### 5. Python Export 파싱
- [x] Function definitions: `def hello_world():`
- [x] Class definitions: `class MyClass:`
- [x] Top-level variables: `VERSION = "1.0.0"`
- [x] Private name filtering: `_private` excluded

#### 6. Complex Python Example
- [x] Mixed imports and exports
- [x] Typing module usage
- [x] Dataclass decorators

## 테스트 방법

```bash
# Manual test script
bun tests/manual/tree-sitter-parser.test.ts
```

## 관련 기능

이 테스트는 다음 기능들의 핵심 구성요소를 검증합니다:
- **09_MultiLanguageParser**: 다국어 파서 시스템 전체
- **03_ValidateOrphans**: Import 그래프 구축
- **05_ValidateSpecOrphans**: Export 추출
- **07_Sync**: 의존성 추적

## 테스트 커버리지

| 파서 | 테스트 수 | 통과 | 상태 |
|------|----------|------|------|
| TypeScript | 7 | 7 | ✅ |
| Python | 3 | 3 | ✅ |
| **Total** | **10** | **10** | **✅** |

## 테스트 파일

- `tests/manual/tree-sitter-parser.test.ts` - 수동 테스트 스크립트 (10 tests)

## 구현 파일

- `src/parsers/ILanguageParser.ts` - 공통 인터페이스
- `src/parsers/ParserFactory.ts` - 파서 팩토리
- `src/parsers/TypeScriptParser.ts` - TypeScript/JavaScript 파서
- `src/parsers/PythonParser.ts` - Python 파서
