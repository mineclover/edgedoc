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
