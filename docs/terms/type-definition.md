## [[Type Definition]]

**Type**: concept
**Scope**: global
**Aliases**: 타입 정의
**Related**: [[Code Interface]]
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
