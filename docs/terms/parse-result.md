## [[Parse Result]]

**Type**: entity
**Scope**: global
**Aliases**: 파싱 결과
**Related**: [[Language Parser]], [[Tree-sitter]]

소스 코드 파싱의 결과를 담는 데이터 구조를 의미한다.

**구조**:
```typescript
interface ParseResult {
  imports: ImportInfo[];   // Import 문 목록
  exports: ExportInfo[];   // Export 문 목록
}
```

**포함 정보**:
- **Imports**: 어떤 모듈에서 무엇을 import했는지
- **Exports**: 어떤 interface/class/function을 export했는지

**사용처**:
- Dependency graph 구축
- Export 분석
- Orphan detection
