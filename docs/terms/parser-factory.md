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
