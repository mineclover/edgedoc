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
