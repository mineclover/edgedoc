## [[Validation]]

**Type**: process
**Scope**: global
**Aliases**: 검증
**Related**: [[Interface-level Validation]], [[File-level Validation]]

문서와 코드의 일관성을 확인하는 프로세스를 의미한다.

**검증 항목**:
1. **Migration**: tasks → tasks-v2 마이그레이션 상태
2. **Naming**: 네이밍 컨벤션 준수 (interface, shared type)
3. **Structure**: 문서 구조 (순환 의존성, frontmatter)
4. **Orphans**: 고아 파일 (문서화/사용 안 됨)
5. **Spec Orphans**: 스펙 고아 (export되었지만 미문서화)
6. **Terms**: 용어 일관성 (정의/참조)

**관련 명령어**:
```bash
edgedoc validate all           # 전체 검증
edgedoc validate naming        # 네이밍만
edgedoc validate orphans       # 고아 파일만
edgedoc validate terms         # 용어만
```
