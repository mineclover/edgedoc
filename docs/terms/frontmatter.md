## [[Frontmatter]]

**Type**: entity
**Scope**: global
**Aliases**: 프론트매터
**Related**: [[Code References]], [[Entry Point Module]]

마크다운 파일 상단의 YAML 메타데이터 블록을 의미한다.

**형식**:
```yaml
---
type: feature
status: active
entry_point: "src/cli.ts"
code_references:
  - "src/tools/init.ts"
---
```

**주요 필드**:
- `type`: 문서 타입 (feature, design, guide 등)
- `status`: 상태 (active, deprecated 등)
- `entry_point`: [[Entry Point Module]] 경로
- `code_references`: [[Code References]] 목록
- `related_features`: 관련 기능 문서
- `public_interfaces`: [[Top-Level Interface]] 목록 (향후)

**용도**:
- 문서 메타데이터 관리
- 검증 도구의 입력 데이터
- 문서 간 관계 추적
