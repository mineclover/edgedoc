# Progress Tracking Guide

**Last Updated**: 2025-10-25

이 가이드는 edgedoc의 진행도 추적 기능을 실제로 사용하는 방법을 설명합니다.

---

## Overview

edgedoc는 **체크박스 기반 진행도 추적**을 제공합니다:
- Feature 문서의 `- [ ]` / `- [x]` 체크박스로 tasks 관리
- 전체 프로젝트 진행도 대시보드
- Feature별 상세 정보 조회
- 역참조: 코드/인터페이스/용어에서 관련 tasks 찾기

---

## Quick Start

### 1. 전체 진행도 확인

```bash
edgedoc tasks progress
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Project Progress Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Progress
█████████████░░░░░░░░░░░░░░░░░ 46%

Features: 18

━━━ By Status ━━━
  ✅ Implemented: 8
  ✅ Active: 8
  ⬜ Planned: 2

━━━ Checkboxes ━━━
  Total: 218
  ✅ Completed: 101 (46%)
  ⬜ Remaining: 117
```

**해석**:
- 전체 프로젝트는 46% 완료
- 18개 features 중 8개 구현 완료
- 218개 tasks 중 101개 완료

---

## Core Workflows

### Workflow 1: 무엇을 할지 찾기

#### 1.1 미완료 tasks 보기

```bash
edgedoc tasks list --incomplete
```

**Output**:
```
📋 Tasks (9 total)

✅ 14_ReverseReferenceIndex [HIGH]
   Reverse Reference Index
   Progress: ████░░░░░░ 32/72 (44%)
   Status: active

⬜ 16_FeatureInfo [MEDIUM]
   Feature Info & Coverage
   Progress: ███░░░░░░░ 7/20 (30%)
   Status: planned

✅ 11_MCPServer [LOW]
   MCP Server Integration
   Progress: ██████░░░░ 9/13 (69%)
   Status: active
```

**해석**:
- High priority: ReverseReferenceIndex (44% 완료, 40/72 tasks 남음)
- Medium priority: FeatureInfo (30% 완료, 13/20 tasks 남음)
- Low priority: MCPServer (69% 완료, 4/13 tasks 남음)

**의사결정**: High priority부터 진행하는 것이 일반적

#### 1.2 특정 feature 상세 보기

```bash
edgedoc tasks get 14_ReverseReferenceIndex
```

**Output**:
```
📦 Task: 14_ReverseReferenceIndex

Title: Reverse Reference Index
Status: active
Priority: high
File: tasks/features/14_ReverseReferenceIndex.md

📊 Progress:
   ████░░░░░░ 32/72 (44%)
```

**다음 단계**: feature 파일을 열어서 미완료 체크박스 확인

```bash
# macOS
open tasks/features/14_ReverseReferenceIndex.md

# Linux
xdg-open tasks/features/14_ReverseReferenceIndex.md
```

---

### Workflow 2: 코드 수정 시 관련 tasks 확인

**시나리오**: `src/tools/validate-terms.ts` 파일을 수정 중

#### 2.1 이 코드가 어떤 features에 속하는지 확인

```bash
edgedoc tasks list --code src/tools/validate-terms.ts
```

**Output**:
```
🔍 Code: src/tools/validate-terms.ts

📚 Documented in 1 feature(s):
  - validate-terms

📋 Related Tasks (1개)

✅ 13_ValidateTerms [HIGH]
   Term Validation & Management
   ✅ Implemented (no pending tasks)
   Status: active
```

**해석**: 이 코드는 validate-terms feature에 속하며, 이미 구현 완료

#### 2.2 미완료 tasks만 보기

```bash
edgedoc tasks list --code src/tools/validate-terms.ts --incomplete
```

**Output**:
```
No tasks found.
```

**해석**: 이 feature는 완료되었으므로 추가 작업 없음

---

### Workflow 3: 인터페이스 구현 시 진행도 확인

**시나리오**: `00--07` 인터페이스 (Sync 명령) 구현 중

#### 3.1 인터페이스가 어떤 feature에 속하는지 확인

```bash
edgedoc tasks list --interface 00--07
```

**Output**:
```
🔍 Interface: 00--07

📚 Related Features:
  - 00_Init (provides)
  - 07_Sync (uses)

📋 Related Tasks (2개)

✅ 00_Init
   ✅ Implemented (no pending tasks)
   Status: implemented

⬜ 07_Sync
   📋 Planned (no implementation yet)
   Status: planned
```

**해석**:
- Provider (00_Init)는 구현 완료
- Consumer (07_Sync)는 아직 계획 단계
- 07_Sync feature를 시작해야 함

#### 3.2 Feature 상세 정보 확인

```bash
edgedoc feature info 07_Sync
```

**Output**:
```
📦 Feature: 07_Sync
   Title: 07_Sync - 코드 참조 동기화
   Status: planned

🔗 Interfaces Provided: 0
🔗 Interfaces Used: 1
🧪 Tests: ❌ None
📝 Code Files: 14
```

**다음 단계**:
1. `tasks/features/07_Sync.md` 열기
2. Implementation 체크박스 확인
3. 구현 시작

---

### Workflow 4: Feature 완료 후 체크박스 업데이트

**시나리오**: Feature 16 (FeatureInfo)의 Task 1, 2를 완료함

#### 4.1 현재 진행도 확인

```bash
edgedoc tasks get 16_FeatureInfo
```

**Before**:
```
📦 Task: 16_FeatureInfo
Progress: ░░░░░░░░░░ 0/20 (0%)
```

#### 4.2 Feature 파일 수정

```bash
vim tasks/features/16_FeatureInfo.md
```

**변경 내용**:
```markdown
### Task 1: Data Collection Functions ✅
- [x] `getFeatureInfo(featureId)` - 메인 함수
- [x] `getInterfaceStatuses(interfaceIds, direction)` - 인터페이스 상태 조회
- [x] `getTestCoverage(featureId)` - 테스트 커버리지 조회
- [x] `getCodeFiles(featureId)` - 코드 파일 목록 및 크기
- [ ] `checkDependencies(featureId)` - 의존성 준비 상태

### Task 2: CLI Integration ✅
- [x] `feature info <feature-id>` 명령어 추가
- [ ] `--full` 옵션: 상세 정보
- [x] `--json` 옵션: JSON 형식 출력
```

#### 4.3 Reference index 재생성

```bash
edgedoc graph build
```

**Output**:
```
🔨 Building reference index...
✅ Index saved: .edgedoc/references.json
```

#### 4.4 진행도 재확인

```bash
edgedoc tasks get 16_FeatureInfo
```

**After**:
```
📦 Task: 16_FeatureInfo
Progress: ███░░░░░░░ 7/20 (35%)
```

**결과**: 0% → 35% (7개 체크박스 완료)

---

### Workflow 5: 전체 프로젝트 상태 리뷰

**시나리오**: 주간 리뷰 또는 릴리즈 준비

#### 5.1 전체 진행도 확인

```bash
edgedoc tasks progress
```

#### 5.2 미완료 high-priority tasks 확인

```bash
edgedoc tasks list --incomplete | grep HIGH
```

**Output**:
```
✅ 14_ReverseReferenceIndex [HIGH]
   Progress: ████░░░░░░ 32/72 (44%)

✅ 15_TasksManagement [HIGH]
   Progress: ████░░░░░░ 38/91 (42%)
```

#### 5.3 테스트 커버리지 확인

```bash
edgedoc tasks list --incomplete | grep "Tests: ❌"
```

**Output**: 테스트 없는 features 목록

**다음 단계**: High-priority features의 테스트 추가 우선순위 결정

---

## Advanced Usage

### Feature Info 활용

#### Feature 전체 정보 조회

```bash
edgedoc feature info 00_Init
```

**Output**:
```
📦 Feature: 00_Init
   Title: 00_Init - CLI 초기화
   Status: implemented

🔗 Interfaces Provided: 14
🔗 Interfaces Used: 0
🧪 Tests: ❌ None
📝 Code Files: 14
```

**해석**:
- 구현 완료
- 14개 인터페이스 제공 (다른 features가 사용)
- 테스트 없음 (개선 필요)
- 14개 코드 파일 사용

#### JSON 형식으로 상세 정보

```bash
edgedoc feature info 00_Init --json > feature_00_init.json
```

**사용 예**:
- CI/CD 파이프라인에서 자동 분석
- 스크립트로 미완료 항목 추출
- 대시보드 생성

---

## Best Practices

### 1. 체크박스 작성 규칙

**Good**:
```markdown
### Task 1: Core Implementation ✅
- [x] Basic function
- [x] Error handling
- [x] Unit tests
- [ ] Integration tests (next sprint)

### Task 2: Documentation
- [ ] API documentation
- [ ] Usage examples
```

**Bad**:
```markdown
### Task 1
- [ ] Do everything
- [ ] And more things
```

**이유**:
- 구체적이고 측정 가능한 tasks
- 완료 여부를 명확히 판단 가능
- 진행도 의미가 명확함

### 2. Reference Index 재생성 타이밍

**자동 재생성이 필요한 경우**:
- Feature 파일 추가/수정 후
- 체크박스 상태 변경 후
- code_references 변경 후

**명령어**:
```bash
edgedoc graph build
```

**팁**: Git pre-commit hook으로 자동화 가능

### 3. 진행도 측정 주기

**권장 주기**:
- 일일: `edgedoc tasks list --incomplete`
- 주간: `edgedoc tasks progress`
- 릴리즈 전: `edgedoc validate all` + `edgedoc tasks progress`

### 4. 체크박스 없는 Features 처리

**시나리오**: 일부 features는 체크박스 없이 구현 완료

**Output**:
```
✅ 13_ValidateTerms [HIGH]
   ✅ Implemented (no pending tasks)
   Status: active
```

**해석**:
- 구현은 완료되었으나 체크박스로 추적하지 않음
- 테스트 추가 등 개선 가능
- `status: implemented`로 변경 권장

---

## Troubleshooting

### Q1: 체크박스 변경했는데 진행도가 안 바뀜

**원인**: Reference index가 재생성되지 않음

**해결**:
```bash
edgedoc graph build
edgedoc tasks get <feature-id>
```

### Q2: Feature info에서 "not found" 에러

**원인**: Feature ID가 reference index에 없음

**해결**:
1. Feature 파일이 `tasks/features/` 에 있는지 확인
2. Frontmatter에 `feature: feature-id` 있는지 확인
3. `edgedoc graph build` 실행

**예시**:
```yaml
---
feature: "my-new-feature"  # ← 이것이 ID
---
```

### Q3: 진행도가 예상과 다름

**원인**: 체크박스 형식 오류

**올바른 형식**:
```markdown
- [x] Completed task
- [ ] Pending task
```

**잘못된 형식**:
```markdown
- [X] Completed (X 대문자 - 인식 안됨)
-[x] No space (공백 없음 - 인식 안됨)
* [x] Asterisk (dash 아님 - 인식 안됨)
```

---

## Real-World Examples

### Example 1: 새 Feature 시작

```bash
# 1. 미완료 tasks 확인
edgedoc tasks list --incomplete

# 2. Feature 16을 선택
edgedoc tasks get 16_FeatureInfo

# 3. Feature 파일 열기
open tasks/features/16_FeatureInfo.md

# 4. Task 1 구현 시작
# ... coding ...

# 5. 완료 후 체크박스 업데이트
vim tasks/features/16_FeatureInfo.md
# - [x] Task 1-1
# - [x] Task 1-2

# 6. Index 재생성 및 확인
edgedoc graph build
edgedoc tasks get 16_FeatureInfo
# Progress: 10% → 30% ✅
```

### Example 2: 코드 리뷰 시 진행도 확인

```bash
# 1. 변경된 파일 확인
git diff --name-only main

# 2. 각 파일의 feature 확인
edgedoc tasks list --code src/tools/feature-info.ts

# 3. Feature 진행도 확인
edgedoc feature info feature-info

# 4. 미완료 tasks 확인
edgedoc tasks get 16_FeatureInfo
```

### Example 3: 릴리즈 준비

```bash
# 1. 전체 진행도 확인
edgedoc tasks progress

# 2. 미완료 high-priority tasks
edgedoc tasks list --incomplete | grep HIGH

# 3. 각 feature 상세 확인
edgedoc feature info 14_ReverseReferenceIndex
edgedoc feature info 15_TasksManagement

# 4. 전체 검증
edgedoc validate all

# 5. 의사결정
# - 44% 미만이면 릴리즈 연기
# - Critical features (HIGH)가 100%이면 릴리즈
```

---

## Integration with Development Workflow

### Git Workflow

**Commit message에 진행도 포함**:
```bash
git commit -m "feat: implement feature info command

Completed Task 1 & 2 of Feature 16
Progress: 0% → 35% (7/20 tasks)
"
```

**PR 설명에 진행도 포함**:
```markdown
## Changes
- Implemented `edgedoc feature info` command
- Added interface status mapping

## Progress
- Feature 16: 0% → 35%
- Overall: 44% → 46%

## Remaining
- [ ] Pretty table printing
- [ ] List commands
- [ ] MCP integration
```

### CI/CD Integration

**GitHub Actions 예시**:
```yaml
name: Progress Check

on: [pull_request]

jobs:
  check-progress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Check progress
        run: |
          npm install
          npm run dev graph build
          npm run dev tasks progress

      - name: Fail if progress decreased
        run: |
          # Compare with main branch
          # Fail if overall progress < previous
```

---

## Summary

**핵심 명령어**:
1. `edgedoc tasks progress` - 전체 진행도
2. `edgedoc tasks list --incomplete` - 미완료 tasks
3. `edgedoc tasks get <feature-id>` - Feature 상세
4. `edgedoc feature info <feature-id>` - Feature 전체 정보
5. `edgedoc graph build` - Index 재생성

**워크플로우**:
1. 미완료 tasks 확인
2. Feature 파일 열기
3. 구현
4. 체크박스 업데이트
5. Index 재생성
6. 진행도 확인

**체크박스 규칙**:
- `- [x]` = 완료
- `- [ ]` = 미완료
- Dash + space + 대괄호
- 구체적이고 측정 가능한 tasks

---

**Last Updated**: 2025-10-25
**edgedoc Version**: 1.0.0
**Author**: Claude Code 🤖
