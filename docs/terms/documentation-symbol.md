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
