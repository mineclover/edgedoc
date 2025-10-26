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
