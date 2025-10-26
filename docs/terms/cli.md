## [[CLI]]

**Type**: abbreviation
**Scope**: global
**Full Form**: Command Line Interface
**Aliases**: 커맨드라인 인터페이스, 명령줄 인터페이스
**Related**: [[MCP]], [[Entry Point Module]]

터미널 또는 명령 프롬프트에서 텍스트 명령으로 실행되는 사용자 인터페이스를 의미한다.

**이 프로젝트의 CLI**:
```bash
edgedoc init                    # 프로젝트 초기화
edgedoc validate all            # 전체 검증
edgedoc sync                    # 동기화
edgedoc analyze entry-points    # 진입점 분석
```

**구현 위치**: `src/cli.ts`
