## [[Interface Graph]]

**Type**: entity
**Scope**: global
**Aliases**: 인터페이스 그래프
**Related**: [[Code Interface]], [[Top-Level Interface]], [[Export Analyzer]]

[[Code Interface]] 간의 사용 관계를 추적하는 그래프 자료구조를 의미한다. [[Export Analyzer]]로 추출한 인터페이스 정보를 기반으로 구성된다.

**구성 요소**:
- **Nodes**: 각 [[Code Interface]]
- **Edges**: interface 간 사용 관계 (imports, extends, implements)
- **Metadata**: 각 interface의 사용 횟수, 문서화 여부

**주요 기능**:
- Interface 의존성 추적
- Orphan interface 탐지 (사용되지 않는 interface)
- Transitive dependency 분석
- 순환 의존성 감지

**구현 위치** (예정): `src/analyzers/InterfaceGraph.ts`
