## [[Tree-sitter]]

**Type**: entity
**Scope**: global
**Aliases**: 트리시터
**Related**: [[Language Parser]], [[Parser Factory]]

점진적(incremental) 파싱을 지원하는 파서 생성 라이브러리를 의미한다.

**특징**:
- 다양한 프로그래밍 언어 지원
- AST (Abstract Syntax Tree) 생성
- 점진적 파싱 (코드 수정 시 일부만 재파싱)
- 에러 복구 (syntax error가 있어도 파싱 계속)

**사용처**:
- TypeScript Parser 구현
- Python Parser 구현
- 소스 코드 분석

**외부 라이브러리**:
- `tree-sitter`
- `tree-sitter-typescript`
- `tree-sitter-python`
