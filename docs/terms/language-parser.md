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
