# Project Glossary

**Type**: glossary
**Language**: bilingual (English/Korean)
**Last Updated**: 2025-10-24

edgedoc [[CLI]]는 [[MCP]]를 통해 [[Tree-sitter]] 기반 코드 분석을 수행하고, [[Validation]] 기능을 제공합니다. 각 용어는 [[Documentation Symbol]]로 정의되어 프로젝트 전체에서 일관되게 사용됩니다.

---

## [[Entry Point Module]]

**Type**: concept
**Scope**: global
**Aliases**: 진입점 모듈, entry point
**Related**: [[Top-Level Interface]], [[Public API]]

외부 사용자가 접근할 수 있는 최상위 public API 모듈을 의미한다.

**특징**:
- CLI entry point, library export, API endpoint 등의 역할을 수행
- package.json의 main, bin, exports 필드에 명시
- 문서의 `entry_point` frontmatter로 표시

**타입**:
- `cli`: 커맨드라인 인터페이스 진입점
- `library`: 라이브러리 public export
- `api`: API 모듈 진입점

**예시**:
- `src/cli.ts` - CLI 진입점
- `src/parsers/ParserFactory.ts` - Parser 시스템 API
- `src/shared/i18n.ts` - Internationalization API

---

## [[Code Interface]]

**Type**: entity
**Scope**: global
**Aliases**: 코드 인터페이스
**Not to Confuse**: [[User Interface]]

TypeScript의 interface, class, type 등 코드 수준에서 정의된 인터페이스를 의미한다.

**예시**:
```typescript
export interface ILanguageParser { }  // Code Interface
export class ParserFactory { }        // Code Interface
export type ParseResult = { }         // Code Interface
```

**포함 범위**:
- TypeScript interface 선언
- 클래스 (class) 선언
- 타입 별칭 (type alias)
- 함수 시그니처

---

## [[Top-Level Interface]]

**Type**: concept
**Scope**: global
**Aliases**: 최상위 인터페이스
**Parent**: [[Code Interface]]
**Related**: [[Entry Point Module]], [[Public API]]

[[Entry Point Module]]에서 직접 export되어 외부 사용자가 접근 가능한 [[Code Interface]]를 의미한다.

**정의 조건**:
- Entry point module에서 `export` 키워드로 노출
- 외부에서 `import`하여 사용 가능
- Public API의 일부를 구성

**예시**:
```typescript
// src/parsers/ParserFactory.ts (Entry Point Module)
export class ParserFactory { }        // ✅ Top-Level Interface
export interface ILanguageParser { }  // ✅ Top-Level Interface

class InternalHelper { }              // ❌ Not exported
```

**제외 대상**:
- `export` 없이 선언된 내부 클래스/인터페이스
- `@internal` JSDoc으로 표시된 내부 API
- Private 또는 protected 멤버

---

## [[Public API]]

**Type**: concept
**Scope**: global
**Aliases**: 공개 API
**Related**: [[Entry Point Module]], [[Top-Level Interface]]

외부 사용자가 사용할 수 있도록 의도적으로 노출된 모든 인터페이스, 함수, 클래스의 집합을 의미한다.

**구성 요소**:
- [[Entry Point Module]]에서 export된 [[Top-Level Interface]]
- 문서화되고 안정적인 API
- Breaking change 시 버전 관리 대상

**제외 대상**:
- `@internal`로 표시된 구현 세부사항
- 테스트 전용 유틸리티
- 문서화되지 않은 experimental API

---

## [[Interface-level Validation]]

**Type**: process
**Scope**: global
**Aliases**: 인터페이스 수준 검증
**Contrast**: [[File-level Validation]]
**Related**: [[Top-Level Interface]], [[Orphan Detection]]

개별 [[Code Interface]] 단위로 문서화 여부를 검증하는 프로세스를 의미한다.

**검증 대상**:
- [[Entry Point Module]]의 모든 [[Top-Level Interface]]
- 각 interface가 문서에 명시되었는지 확인
- Method-level 추적 (선택적)

**검증 방법**:
1. [[Entry Point Module]]에서 모든 exported interface 추출
2. [[Interface Graph]]를 사용하여 interface 사용 관계 구축
3. 각 public interface가 문서화되었는지 확인
4. Orphan interface (exported but undocumented) 보고

**File-level과의 차이**:
- 더 세밀한 단위 (file → interface)
- False positive 감소 (파일 내 일부만 문서화된 경우 감지)
- Method 수준 추적 가능

---

## [[File-level Validation]]

**Type**: process
**Scope**: global
**Aliases**: 파일 수준 검증
**Contrast**: [[Interface-level Validation]]

파일 단위로 문서화 여부를 검증하는 프로세스를 의미한다 (현재 시스템).

**검증 방법**:
1. 파일이 문서의 `code_references`에 포함되었는지 확인
2. 포함되었다면, 해당 파일의 **모든** export가 문서화된 것으로 간주

**한계**:
- 파일이 문서화되면 내부 모든 export가 문서화된 것으로 간주
- 일부 export만 실제로 사용/문서화된 경우 감지 불가
- Interface 단위 추적 불가능

---

## [[Orphan Detection]]

**Type**: process
**Scope**: global
**Aliases**: 고아 탐지
**Related**: [[Spec Orphan]], [[Interface-level Validation]]

문서화되지 않았고 사용되지도 않는 코드나 파일을 탐지하는 프로세스를 의미한다.

**탐지 대상**:
- 문서에 참조되지 않은 파일
- 다른 코드에서 import되지 않은 파일
- Export되었지만 사용되지 않는 interface

**검증 방법**:
1. 문서에서 참조된 파일 수집
2. Import 의존성 그래프 구축
3. 문서화되지도 않고 사용되지도 않는 파일 식별

**관련 명령어**:
```bash
edgedoc validate orphans
```

---

## [[Spec Orphan]]

**Type**: concept
**Scope**: global
**Aliases**: 스펙 고아, 명세 고아
**Parent**: [[Orphan Detection]]
**Related**: [[Public API]]

문서화되지 않은 public export (interface, class, function)를 의미한다.

**정의 조건**:
- 파일이 문서화됨 (code_references에 포함)
- 그러나 특정 export는 문서에 언급되지 않음
- Public API이지만 명세 누락

**예시**:
```typescript
// src/utils/config.ts (문서화됨)
export function loadConfig() { }      // ✅ 문서화됨
export function validateConfig() { }  // ❌ Spec Orphan (언급 없음)
```

**검증 방법**:
1. 문서화된 파일에서 모든 export 추출
2. 각 export가 문서에 언급되었는지 확인
3. 언급되지 않은 export를 Spec Orphan으로 보고

**관련 명령어**:
```bash
edgedoc validate spec-orphans
```

---

## [[Export Analyzer]]

**Type**: entity
**Scope**: global
**Aliases**: 익스포트 분석기
**Related**: [[Code Interface]], [[Top-Level Interface]]

코드 파일에서 export된 [[Code Interface]]를 추출하고 분석하는 컴포넌트를 의미한다.

**주요 기능**:
- 파일에서 모든 exported interface, class, function, type 추출
- Method 및 property 정보 추출 (class의 경우)
- JSDoc 주석 파싱
- `@internal`, `@deprecated` 마커 인식

**입력**: 소스 코드 파일 경로
**출력**: `InterfaceDefinition[]` (interface 정의 배열)

**구현 위치** (예정): `src/analyzers/ExportAnalyzer.ts`

---

## [[Interface Graph]]

**Type**: entity
**Scope**: global
**Aliases**: 인터페이스 그래프
**Related**: [[Code Interface]], [[Top-Level Interface]], [[Export Analyzer]]

[[Code Interface]] 간의 사용 관계를 추적하는 그래프 자료구조를 의미한다. [[Export Analyzer]]로 추출한 인터페이스 정보를 기반으로 구성된다.

**구성 요소**:
- **Nodes**: 각 [[Code Interface]]
- **Edges**: interface 간 사용 관계 (imports, extends, implements)
- **Metadata**: 각 interface의 사용 횟수, 문서화 여부

**주요 기능**:
- Interface 의존성 추적
- Orphan interface 탐지 (사용되지 않는 interface)
- Transitive dependency 분석
- 순환 의존성 감지

**구현 위치** (예정): `src/analyzers/InterfaceGraph.ts`

---

## [[Parser Factory]]

**Type**: entity
**Scope**: global
**Aliases**: 파서 팩토리
**Related**: [[Language Parser]]

언어별 파서를 관리하고 제공하는 중앙 레지스트리 클래스를 의미한다.

**주요 메서드**:
- `getParser(filePath: string): ILanguageParser | null` - 파일 확장자 기반 파서 반환
- `register(ext: string, parser: ILanguageParser): void` - 새 파서 등록
- `getSupportedExtensions(): string[]` - 지원 확장자 목록
- `reset(): void` - 레지스트리 초기화 (테스트용, `@internal`)

**구현 위치**: `src/parsers/ParserFactory.ts`

**지원 언어**:
- TypeScript/JavaScript (.ts, .tsx, .js, .jsx)
- Python (.py)

---

## [[Language Parser]]

**Type**: entity
**Scope**: global
**Aliases**: 언어 파서, ILanguageParser
**Related**: [[Parser Factory]], [[Parse Result]]

특정 프로그래밍 언어의 소스 코드를 파싱하는 인터페이스를 의미한다.

**필수 메서드**:
- `parse(sourceCode: string, filePath: string): ParseResult` - 코드 파싱
- `canParse(filePath: string): boolean` - 파싱 가능 여부 확인

**필수 프로퍼티**:
- `supportedExtensions: string[]` - 지원하는 파일 확장자 목록
- `languageName: string` - 언어 이름

**구현체**:
- `TypeScriptParser` - TypeScript/JavaScript 파서
- `PythonParser` - Python 파서

**구현 위치**: `src/parsers/ILanguageParser.ts`

---

## [[Parse Result]]

**Type**: entity
**Scope**: global
**Aliases**: 파싱 결과
**Related**: [[Language Parser]]

소스 코드 파싱의 결과를 담는 데이터 구조를 의미한다.

**구조**:
```typescript
interface ParseResult {
  imports: ImportInfo[];   // Import 문 목록
  exports: ExportInfo[];   // Export 문 목록
}
```

**포함 정보**:
- **Imports**: 어떤 모듈에서 무엇을 import했는지
- **Exports**: 어떤 interface/class/function을 export했는지

**사용처**:
- Dependency graph 구축
- Export 분석
- Orphan detection

---

## [[Validation]]

**Type**: process
**Scope**: global
**Aliases**: 검증
**Related**: [[Interface-level Validation]], [[File-level Validation]]

문서와 코드의 일관성을 확인하는 프로세스를 의미한다.

**검증 항목**:
1. **Migration**: tasks → tasks-v2 마이그레이션 상태
2. **Naming**: 네이밍 컨벤션 준수 (interface, shared type)
3. **Structure**: 문서 구조 (순환 의존성, frontmatter)
4. **Orphans**: 고아 파일 (문서화/사용 안 됨)
5. **Spec Orphans**: 스펙 고아 (export되었지만 미문서화)
6. **Terms**: 용어 일관성 (정의/참조)

**관련 명령어**:
```bash
edgedoc validate all           # 전체 검증
edgedoc validate naming        # 네이밍만
edgedoc validate orphans       # 고아 파일만
edgedoc validate terms         # 용어만
```

---

## [[Synchronization]]

**Type**: process
**Scope**: global
**Aliases**: 동기화, sync
**Related**: [[Code References]]

문서의 `code_references` 필드를 코드의 실제 의존성과 동기화하는 프로세스를 의미한다.

**동작 방식**:
1. 문서의 `entry_point` 또는 `code_references` 읽기
2. 해당 파일들의 import 의존성 분석
3. Transitive dependencies 추적
4. 문서의 `code_references` 필드 업데이트

**모드** (향후 계획):
- `file`: 파일 수준 동기화 (현재)
- `interface`: Interface 수준 동기화
- `hybrid`: 두 가지 모두

**관련 명령어**:
```bash
edgedoc sync                   # 동기화 실행
edgedoc sync --dry-run         # 시뮬레이션만
```

---

## [[Code References]]

**Type**: attribute
**Scope**: global
**Aliases**: 코드 참조
**Related**: [[Entry Point Module]], [[Synchronization]]

문서 frontmatter에서 해당 문서가 참조하는 소스 코드 파일 목록을 의미한다.

**형식**:
```yaml
---
code_references:
  - "src/parsers/ParserFactory.ts"
  - "src/parsers/ILanguageParser.ts"
  - "src/types/parser.ts"
---
```

**용도**:
- [[Orphan Detection]]에서 문서화된 파일 식별
- [[Synchronization]]의 동기화 대상
- 문서-코드 연결 추적

**유지 방법**:
- 수동 작성
- `edgedoc sync` 명령으로 자동 업데이트

---

## [[Frontmatter]]

**Type**: entity
**Scope**: global
**Aliases**: 프론트매터
**Related**: [[Code References]], [[Entry Point Module]]

마크다운 파일 상단의 YAML 메타데이터 블록을 의미한다.

**형식**:
```yaml
---
type: feature
status: active
entry_point: "src/cli.ts"
code_references:
  - "src/tools/init.ts"
---
```

**주요 필드**:
- `type`: 문서 타입 (feature, design, guide 등)
- `status`: 상태 (active, deprecated 등)
- `entry_point`: [[Entry Point Module]] 경로
- `code_references`: [[Code References]] 목록
- `related_features`: 관련 기능 문서
- `public_interfaces`: [[Top-Level Interface]] 목록 (향후)

**용도**:
- 문서 메타데이터 관리
- 검증 도구의 입력 데이터
- 문서 간 관계 추적

---

## [[Tree-sitter]]

**Type**: entity
**Scope**: global
**Aliases**: 트리시터
**Related**: [[Language Parser]], [[Parser Factory]]

점진적(incremental) 파싱을 지원하는 파서 생성 라이브러리를 의미한다.

**특징**:
- 다양한 프로그래밍 언어 지원
- AST (Abstract Syntax Tree) 생성
- 점진적 파싱 (코드 수정 시 일부만 재파싱)
- 에러 복구 (syntax error가 있어도 파싱 계속)

**사용처**:
- TypeScript Parser 구현
- Python Parser 구현
- 소스 코드 분석

**외부 라이브러리**:
- `tree-sitter`
- `tree-sitter-typescript`
- `tree-sitter-python`

---

## [[Type Definition]]

**Type**: concept
**Scope**: global
**Aliases**: 타입 정의
**Not to Confuse**: [[Term Definition]]

코드에서 TypeScript 타입을 정의하는 것을 의미한다.

**예시**:
```typescript
// Type Definition
type ParseResult = {
  imports: ImportInfo[];
  exports: ExportInfo[];
};

interface ILanguageParser {
  parse(code: string): ParseResult;
}
```

**vs [[Term Definition]]**:
- Type Definition: 코드의 타입 정의
- Term Definition: 문서의 용어 정의

---

## [[Term Definition]]

**Type**: concept
**Scope**: global
**Aliases**: 용어 정의
**Not to Confuse**: [[Type Definition]]

문서에서 용어를 정의하는 것을 의미한다.

**문법**:
```markdown
## [[Term Name]]

명확한 정의문...
```

**구성 요소**:
- **Term**: 용어명 (canonical name)
- **Definition**: 정의문 (what it means)
- **Aliases**: 동의어, 다국어 표현
- **Type**: 용어 타입 (concept, entity, process 등)
- **Scope**: 적용 범위 (global, document)
- **Related**: 관련 용어

**vs [[Type Definition]]**:
- Term Definition: 문서의 용어 정의
- Type Definition: 코드의 타입 정의

---

## [[Documentation Symbol]]

**Type**: concept
**Scope**: global
**Aliases**: 문서 심볼
**Related**: [[Term Definition]], [[Code Interface]]

문서에서 정의된 용어를 코드의 심볼처럼 취급하는 개념을 의미한다.

**특징**:
- 명시적 정의 필요 (`## [[Term]]`)
- 고유 식별자 (term name)
- 타입 정보 (concept, entity, process)
- 스코프 (global, document)
- 참조 추적 가능 (`[[Term]]`)

**vs Code Symbol**:
- Code Symbol: `export class Foo { }` (컴파일러가 강제)
- Documentation Symbol: `## [[Foo]]` (검증 도구가 강제)

**목적**:
- 문서 간 용어 충돌 방지
- 용어 일관성 보장
- 정의되지 않은 용어 사용 방지

---

## [[MCP]]

**Type**: abbreviation
**Scope**: global
**Full Form**: Model Context Protocol
**Aliases**: 모델 컨텍스트 프로토콜

LLM(Large Language Model)이 외부 도구 및 데이터 소스와 상호작용하기 위한 표준 프로토콜을 의미한다.

**구성 요소**:
- **Tools**: LLM이 호출할 수 있는 함수
- **Resources**: LLM이 접근할 수 있는 데이터
- **Prompts**: 재사용 가능한 프롬프트 템플릿

**이 프로젝트에서의 사용**:
- `src/index.ts`: MCP 서버 구현
- edgedoc을 MCP 도구로 노출

---

## [[CLI]]

**Type**: abbreviation
**Scope**: global
**Full Form**: Command Line Interface
**Aliases**: 커맨드라인 인터페이스, 명령줄 인터페이스

터미널 또는 명령 프롬프트에서 텍스트 명령으로 실행되는 사용자 인터페이스를 의미한다.

**이 프로젝트의 CLI**:
```bash
edgedoc init                    # 프로젝트 초기화
edgedoc validate all            # 전체 검증
edgedoc sync                    # 동기화
edgedoc analyze entry-points    # 진입점 분석
```

**구현 위치**: `src/cli.ts`

---

## [[User Interface]]

**Type**: entity
**Scope**: global
**Aliases**: UI, 사용자 인터페이스
**Not to Confuse**: [[Code Interface]]

사용자와 소프트웨어가 상호작용하는 시각적/텍스트 인터페이스를 의미한다.

**타입**:
- CLI (Command Line Interface) - 텍스트 기반
- GUI (Graphical User Interface) - 그래픽 기반
- Web UI - 웹 브라우저 기반

**vs [[Code Interface]]**:
- User Interface: 사용자와의 상호작용 화면
- Code Interface: 코드 수준의 TypeScript interface

---

**Document Status**: ✅ Complete
**Total Terms**: 28
**Last Updated**: 2025-10-24
