## [[Code References]]

**Type**: attribute
**Scope**: global
**Aliases**: 코드 참조
**Related**: [[Synchronization]]

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
