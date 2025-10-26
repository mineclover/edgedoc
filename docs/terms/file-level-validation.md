## [[File-level Validation]]

**Type**: process
**Scope**: global
**Aliases**: 파일 수준 검증
**Related**: [[Interface-level Validation]], [[Validation]], [[Orphan Detection]]
**Contrast**: [[Interface-level Validation]]

파일 단위로 문서화 여부를 검증하는 프로세스를 의미한다 (현재 시스템).

**검증 방법**:
1. 파일이 문서의 `code_references`에 포함되었는지 확인
2. 포함되었다면, 해당 파일의 **모든** export가 문서화된 것으로 간주

**한계**:
- 파일이 문서화되면 내부 모든 export가 문서화된 것으로 간주
- 일부 export만 실제로 사용/문서화된 경우 감지 불가
- Interface 단위 추적 불가능
