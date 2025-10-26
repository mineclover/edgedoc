## [[Synchronization]]

**Type**: process
**Scope**: global
**Aliases**: 동기화, sync
**Related**: [[Code References]]

문서의 `code_references` 필드를 코드의 실제 의존성과 동기화하는 프로세스를 의미한다.

**동작 방식**:
1. 문서의 `entry_point` 또는 `code_references` 읽기
2. 해당 파일들의 import 의존성 분석
3. Transitive dependencies 추적
4. 문서의 `code_references` 필드 업데이트

**모드** (향후 계획):
- `file`: 파일 수준 동기화 (현재)
- `interface`: Interface 수준 동기화
- `hybrid`: 두 가지 모두

**관련 명령어**:
```bash
edgedoc sync                   # 동기화 실행
edgedoc sync --dry-run         # 시뮬레이션만
```
