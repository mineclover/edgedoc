## [[Code Interface]]

**Type**: entity
**Scope**: global
**Aliases**: 코드 인터페이스
**Related**: [[Top-Level Interface]], [[Type Definition]]
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
