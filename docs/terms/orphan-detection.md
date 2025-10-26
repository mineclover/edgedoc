## [[Orphan Detection]]

**Type**: process
**Scope**: global
**Aliases**: 고아 탐지
**Related**: [[Spec Orphan]]

문서화되지 않았고 사용되지도 않는 코드나 파일을 탐지하는 프로세스를 의미한다.

**탐지 대상**:
- 문서에 참조되지 않은 파일
- 다른 코드에서 import되지 않은 파일
- Export되었지만 사용되지 않는 interface

**검증 방법**:
1. 문서에서 참조된 파일 수집
2. Import 의존성 그래프 구축
3. 문서화되지도 않고 사용되지도 않는 파일 식별

**관련 명령어**:
```bash
edgedoc validate orphans
```
