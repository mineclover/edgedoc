## [[Export Analyzer]]

**Type**: entity
**Scope**: global
**Aliases**: 익스포트 분석기
**Related**: [[Code Interface]], [[Top-Level Interface]]

코드 파일에서 export된 [[Code Interface]]를 추출하고 분석하는 컴포넌트를 의미한다.

**주요 기능**:
- 파일에서 모든 exported interface, class, function, type 추출
- Method 및 property 정보 추출 (class의 경우)
- JSDoc 주석 파싱
- `@internal`, `@deprecated` 마커 인식

**입력**: 소스 코드 파일 경로
**출력**: `InterfaceDefinition[]` (interface 정의 배열)

**구현 위치** (예정): `src/analyzers/ExportAnalyzer.ts`
