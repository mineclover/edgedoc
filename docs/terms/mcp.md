## [[MCP]]

**Type**: abbreviation
**Scope**: global
**Full Form**: Model Context Protocol
**Aliases**: 모델 컨텍스트 프로토콜
**Related**: [[CLI]], [[Tree-sitter]]

LLM(Large Language Model)이 외부 도구 및 데이터 소스와 상호작용하기 위한 표준 프로토콜을 의미한다.

**구성 요소**:
- **Tools**: LLM이 호출할 수 있는 함수
- **Resources**: LLM이 접근할 수 있는 데이터
- **Prompts**: 재사용 가능한 프롬프트 템플릿

**이 프로젝트에서의 사용**:
- `src/index.ts`: MCP 서버 구현
- edgedoc을 MCP 도구로 노출
