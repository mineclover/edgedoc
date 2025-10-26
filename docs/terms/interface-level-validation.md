## [[Interface-level Validation]]

**Type**: process
**Scope**: global
**Aliases**: 인터페이스 수준 검증
**Related**: [[File-level Validation]], [[Validation]], [[Orphan Detection]]
**Contrast**: [[File-level Validation]]

개별 코드 인터페이스 단위로 문서화 여부를 검증하는 프로세스를 의미한다.

**검증 대상**:
- [[Entry Point Module]]의 모든 [[Top-Level Interface]]
- 각 interface가 문서에 명시되었는지 확인
- Method-level 추적 (선택적)

**검증 방법**:
1. [[Entry Point Module]]에서 모든 exported interface 추출
2. [[Interface Graph]]를 사용하여 interface 사용 관계 구축
3. 각 public interface가 문서화되었는지 확인
4. Orphan interface (exported but undocumented) 보고

**File-level과의 차이**:
- 더 세밀한 단위 (file → interface)
- False positive 감소 (파일 내 일부만 문서화된 경우 감지)
- Method 수준 추적 가능
