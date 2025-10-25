---
type: feature
status: active
feature: tasks-management
priority: high
entry_point: "src/cli.ts"
related_features:
  - 14_ReverseReferenceIndex
  - 13_ValidateTerms
code_references:
  - "src/tools/tasks-list.ts"
---

# Tasks Management

**Command**: `edgedoc tasks list`, `edgedoc tasks get`, `edgedoc tasks progress`

## Purpose

체크박스 기반 작업 관리를 통해 feature 구현 진행률을 추적하고, 다음 할 일을 명확히 보여준다.

## Problem

현재 feature 문서에 체크박스가 있지만:

1. **진행률 파악 어려움**
   - 문서 열어서 일일이 체크박스 세야 함
   - 전체 프로젝트 진행률 알 수 없음

2. **다음 할 일 찾기 어려움**
   - `status: pending` feature 중 어떤 걸 할지 판단 어려움
   - 우선순위와 의존성 고려해야 함

3. **컨텍스트 복귀 느림**
   - 일주일 후 돌아오면 "뭐하고 있었지?" 찾기
   - 여러 파일 열어서 확인

4. **참조된 대상 추적 불가**
   - 코드 파일이 어떤 feature에서 참조되는지
   - Interface가 어떤 feature를 연결하는지
   - Term이 어디서 사용되는지

## Solution

CLI 명령어로 작업 관리 및 참조 추적을 제공한다.

### 핵심 기능

1. **작업 목록**: 전체 feature 상태 한눈에 보기
2. **상세 보기**: 체크박스 진행률 + 다음 할 일
3. **진행률 대시보드**: 전체/개별 진행률 시각화
4. **참조 추적**: 역방향 참조로 "누가 나를 참조하나" 확인

## Architecture

### Components

- [ ] **TaskParser** (`src/parsers/TaskParser.ts`)
  - [ ] Frontmatter 파싱 (status, priority, feature)
  - [ ] 체크박스 추출 및 카운팅
  - [ ] Task 계층 구조 파싱
  - [ ] 다음 미완료 항목 찾기

- [ ] **TaskManager** (`src/tools/tasks-manager.ts`)
  - [ ] Task 목록 수집
  - [ ] 필터링 (status, priority, type)
  - [ ] 정렬 (priority, progress, date)
  - [ ] 진행률 계산

- [ ] **TasksCommand** (`src/cli.ts`)
  - [ ] `edgedoc tasks list` 명령어
  - [ ] `edgedoc tasks get <feature-id>` 명령어
  - [ ] `edgedoc tasks progress` 명령어
  - [ ] `edgedoc tasks next` 명령어 (optional)

- [ ] **ReferenceTracker** (14_ReverseReferenceIndex 활용)
  - [ ] 코드 → Features 역방향 조회
  - [ ] Interface → Features 연결
  - [ ] Term → Documents 사용처

### Data Schema

```typescript
// src/types/tasks.ts
export interface Task {
  id: string;                    // feature ID (e.g., "14_ReverseReferenceIndex")
  file: string;                  // 파일 경로
  title: string;                 // 문서 제목

  // Frontmatter
  type: 'feature' | 'test' | 'interface' | 'shared';
  status: 'planned' | 'in_progress' | 'active' | 'deprecated';
  priority?: 'high' | 'medium' | 'low';
  feature: string;

  // References
  entry_point?: string;
  code_references: string[];
  related_features: string[];
  test_files?: string[];

  // Progress
  checkboxes: {
    total: number;
    checked: number;
    percentage: number;
  };

  // Task structure
  tasks: TaskItem[];
}

export interface TaskItem {
  level: number;                 // 계층 (Task 1, 2, 3...)
  title: string;                 // Task 제목
  checked: boolean;
  children: TaskCheckbox[];      // 하위 체크박스
}

export interface TaskCheckbox {
  text: string;
  checked: boolean;
  line: number;                  // 문서 내 라인 번호
}

export interface TaskSummary {
  total: number;
  by_status: {
    planned: number;
    in_progress: number;
    active: number;
    deprecated: number;
  };
  by_type: {
    feature: number;
    test: number;
    interface: number;
    shared: number;
  };
  overall_progress: {
    total_checkboxes: number;
    checked_checkboxes: number;
    percentage: number;
  };
}

export interface ReferenceInfo {
  type: 'code' | 'feature' | 'interface' | 'term';
  target: string;                // 참조 대상
  referenced_in: Array<{
    task: string;                // Task ID
    context: string;             // 참조 컨텍스트
  }>;
}
```

## Implementation Tasks

### Task 1: Type Definitions
- [x] `src/types/tasks.ts` 작성 (TaskInfo, TasksListOptions in tasks-list.ts)
- [x] `Task`, `TaskItem`, `TaskCheckbox` 타입 (simplified as TaskInfo)
- [x] `TaskSummary`, `ReferenceInfo` 타입 (ProgressSummary)

### Task 2: Task Parser
- [x] Task parsing logic (in tasks-list.ts)
- [x] `parseTaskDocument()` 함수 (parseFrontmatter, extractTitle)
- [x] Frontmatter 파싱
- [x] 체크박스 정규식: `- [ ]` vs `- [x]` (countCheckboxes)
- [ ] Task 계층 구조 파싱 (헤딩 레벨) - simplified to flat count

### Task 3: Checkbox Counter
- [x] `countCheckboxes()` 함수
- [x] Task별 체크박스 그룹화 (per feature)
- [x] 진행률 계산 (checked/total)
- [x] 다음 미완료 항목 찾기 (filterIncompleteTasks)

### Task 4: Task Manager Core
- [x] Task management (in tasks-list.ts, no separate file)
- [x] `loadAllTasks()` 함수 (listTasks)
- [x] `filterTasks()` 함수 (status, priority filters + filterIncompleteTasks)
- [x] `sortTasks()` 함수 (by priority, progress)
- [x] `calculateSummary()` 함수 (calculateProgress)

### Task 5: tasks list Command
- [x] `edgedoc tasks list` CLI 명령어
- [x] 기본 출력: 전체 feature 목록
- [x] `--status` 필터 (planned, in_progress, active)
- [x] `--priority` 필터 (high, medium, low)
- [x] `--type` 필터 (feature, test, interface) - via status
- [x] Progress bar 표시
- [ ] 색상 지원 (chalk) - using emojis instead

### Task 6: tasks get Command
- [x] `edgedoc tasks get <feature-id>` CLI 명령어
- [x] Feature 상세 정보 출력
- [ ] Task 계층 구조 표시 (들여쓰기) - simplified
- [x] 체크박스 상태 표시 (✅ ⬜)
- [ ] "다음 할 일" 하이라이트 - not implemented
- [x] 관련 참조 정보 (code, features, terms) - via reverse lookup

### Task 7: tasks progress Command
- [x] `edgedoc tasks progress` CLI 명령어
- [x] 전체 프로젝트 진행률 대시보드
- [x] 타입별 통계 (feature, test, interface)
- [x] 상태별 통계 (planned, in_progress, active)
- [ ] 최근 완료 항목 (git log 활용) - not implemented
- [x] Progress bar visualization

### Task 8: tasks next Command (Optional)
- [ ] `edgedoc tasks next` CLI 명령어 - not needed
- [x] Alternative: `--incomplete` filter for context-specific workflow
- [x] Filter by code/interface/term + incomplete

### Task 9: Reference Tracking Integration
- [x] 14_ReverseReferenceIndex와 통합
- [x] Reverse lookup: 참조 정보 표시
- [x] 코드 파일 → 어떤 feature가 사용? (--code)
- [x] Feature → 어떤 interface 제공? (--interface)
- [x] Term → 어떤 문서에서 사용? (--term)

### Task 10: Testing
- [ ] Unit tests for TaskParser
- [ ] Unit tests for TaskManager
- [ ] Integration tests for CLI commands
- [ ] Test with actual project docs
- [ ] Edge cases: 중첩 체크박스, 빈 파일

### Task 11: Documentation
- [ ] README에 tasks 명령어 사용법 추가
- [ ] SYNTAX_GUIDE에 체크박스 작성 규칙 추가
- [ ] 예시 스크린샷

## Usage Examples

### List All Tasks

```bash
# 전체 feature 목록
edgedoc tasks list

# 출력:
# 📋 Features (14)
#
# ✅ 00_Init                      [active]    ████████████████████ 100%
# ✅ 01_ValidateMigration         [active]    ████████████████████ 100%
# ✅ 02_ValidateNaming            [active]    ████████████████████ 100%
# ...
# ✅ 13_ValidateTerms             [active]    ████████████████████ 100%
# 🔄 14_ReverseReferenceIndex     [planned]   ███░░░░░░░░░░░░░░░░░   6%
# ⬜ 15_TasksManagement           [planned]   ░░░░░░░░░░░░░░░░░░░░   0%
```

### List by Status

```bash
# 진행 중인 작업만
edgedoc tasks list --status in_progress

# 출력:
# 🔄 진행 중인 작업 (1)
#
# 14_ReverseReferenceIndex (3/50 완료 - 6%)
#   우선순위: high
#   다음: Task 3 Feature Indexing
```

### List by Priority

```bash
# 우선순위 높은 작업
edgedoc tasks list --status pending --priority high

# 출력:
# 🎯 우선순위 높은 대기 작업 (2)
#
# 1. 14_ReverseReferenceIndex (6% 완료)
#    - 관련: 13_ValidateTerms, 03_ValidateOrphans
#    - 다음: Task 3 Feature Indexing
#
# 2. 15_TasksManagement (0% 완료)
#    - Blocked by: 14_ReverseReferenceIndex
```

### Get Task Details

```bash
# 특정 feature 상세 보기
edgedoc tasks get 14_ReverseReferenceIndex

# 출력:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📦 14_ReverseReferenceIndex
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Status: planned
# Priority: high
# Entry Point: src/tools/build-reference-index.ts
#
# 진행률: 3/50 (6%)
# ████░░░░░░░░░░░░░░░░░░░░░░░░░░
#
# ━━━ Tasks ━━━
#
# ✅ Task 1: Type Definitions (5/5)
#   ✅ ReferenceIndex 타입
#   ✅ FeatureIndex 타입
#   ✅ CodeIndex 타입
#   ✅ InterfaceIndex 타입
#   ✅ TermIndex 타입
#
# ✅ Task 2: Index Builder Core (2/2)
#   ✅ buildReferenceIndex() 함수
#   ✅ Frontmatter 파싱 로직
#
# ⬜ Task 3: Feature Indexing (0/4)
#   ⬜ extractFeatureReferences() 함수   ← 다음 할 일
#   ⬜ code_references 추출
#   ⬜ related_features 추출
#   ⬜ interfaces 필드 추출
#
# ...
#
# ━━━ References ━━━
#
# Uses Code:
#   - src/tools/build-reference-index.ts
#   - src/types/reference-index.ts
#
# Related Features:
#   - 13_ValidateTerms ✅
#   - 03_ValidateOrphans ✅
#
# Blocks:
#   - 15_TasksManagement (대기 중)
```

### Progress Dashboard

```bash
# 전체 진행률 대시보드
edgedoc tasks progress

# 출력:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 Project Progress Dashboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Overall Progress
# ████████████████████████████░░ 93%
#
# Features: 15개
#   ✅ Active: 13개 (87%)
#   🔄 In Progress: 1개 (7%)
#   ⬜ Planned: 1개 (7%)
#
# Checkboxes: 653개
#   ✅ Completed: 603개 (92%)
#   ⬜ Remaining: 50개 (8%)
#
# ━━━ By Type ━━━
#   Features: 14개
#   Tests: 1개
#   Interfaces: 0개
#
# ━━━ By Priority ━━━
#   High: 5개 (4 완료, 1 진행중)
#   Medium: 3개 (3 완료)
#   Low: 2개 (2 완료)
#   None: 5개 (5 완료)
#
# ━━━ Recent Activity ━━━
#   2025-10-24: 13_ValidateTerms ✅
#   2025-10-24: 12_AnalyzeEntryPoints ✅
#   2025-10-23: 11_MCPServer 🔄
#
# ━━━ Next Recommended ━━━
#   🎯 14_ReverseReferenceIndex (6% 완료)
#      Reason: High priority, dependencies met
```

### Get Next Task

```bash
# 다음 할 일 추천
edgedoc tasks next

# 출력:
# 🎯 추천: 14_ReverseReferenceIndex
#
# 이유:
#   ✅ 우선순위: high
#   ✅ 의존성 해결됨 (13_ValidateTerms, 03_ValidateOrphans 완료)
#   ✅ 이미 시작됨 (6% 완료)
#
# 다음 할 일:
#   Task 3: Feature Indexing
#   - extractFeatureReferences() 함수 구현
#
# 예상 시간: 2-3 hours
#
# 시작하기:
#   code tasks/features/14_ReverseReferenceIndex.md
```

### Reference Tracking

```bash
# 코드 파일이 어디서 참조되는지
edgedoc tasks get --code src/parsers/TermParser.ts

# 출력:
# 📄 Code: src/parsers/TermParser.ts
#
# Referenced In:
#   - 13_ValidateTerms
#     Context: term definition and reference extraction
#
# Used By:
#   - src/tools/validate-terms.ts
#   - src/tools/term-commands.ts
```

```bash
# Interface가 어떤 feature를 연결하는지
edgedoc tasks get --interface 00--01

# 출력:
# 🔗 Interface: 00--01
#
# Connection:
#   From: 00_Init
#   To: 01_ValidateMigration
#   Type: command
#
# Shared Types:
#   - 00--01_00--02_00--03_00--04_00--05
```

```bash
# Term이 어디서 사용되는지
edgedoc tasks get --term "Entry Point Module"

# 출력:
# 📚 Term: Entry Point Module
#
# Defined In:
#   - docs/GLOSSARY.md:11 (global scope)
#
# Referenced In:
#   - tasks/features/12_AnalyzeEntryPoints.md
#   - tasks/features/13_ValidateTerms.md
#   - docs/SYNTAX_GUIDE.md
```

## Integration Points

### With 14_ReverseReferenceIndex
- [ ] 인덱스 로드하여 역방향 참조 조회
- [ ] `--references` 옵션으로 참조 정보 표시
- [ ] Feature → Code, Feature → Feature 양방향

### With Validation Commands
- [ ] `edgedoc validate all`에 tasks progress 포함
- [ ] 완료되지 않은 planned feature 경고

### With Git
- [ ] 최근 완료 항목 (git log 파싱)
- [ ] 커밋 메시지에서 feature ID 추출
- [ ] 마지막 수정 날짜

## Output Formatting

### Progress Bar
```
████████████████████░░░░░░░░░░ 65%
```

### Status Icons
```
✅ active/completed
🔄 in_progress
⬜ planned
⚠️  deprecated
```

### Priority Colors (chalk)
```
🔴 high
🟡 medium
🟢 low
⚪ none
```

## Performance

### Load Time
- **Small project** (~15 features): < 0.5s
- **Medium project** (~50 features): < 2s
- **Large project** (~200 features): < 10s

### Caching
- [ ] 파일 변경 감지 (mtime)
- [ ] 캐시 파일: `.edgedoc/tasks-cache.json`
- [ ] 변경된 파일만 다시 파싱

## Future Enhancements

### Phase 2: Interactive Mode
- [ ] `edgedoc tasks check`: 대화형 체크박스 토글
- [ ] Watch mode: 파일 변경 시 자동 갱신
- [ ] TUI (Terminal UI): 키보드로 탐색

### Phase 3: Analytics
- [ ] 평균 완료 시간
- [ ] Velocity (주당 완료 task 수)
- [ ] Burndown chart (ASCII art)

### Phase 4: AI Integration
- [ ] Task 분해 제안 ("이 task 너무 커 보임")
- [ ] 예상 시간 추정
- [ ] 의존성 자동 감지

## Related

- [[Validation]]: 전체 검증 시스템
- [[Code References]]: Frontmatter 필드
- 14_ReverseReferenceIndex: 참조 인덱스
- docs/REFERENCE_SYSTEM_ANALYSIS.md: 참조 시스템 분석

## Test Cases

### Test 1: Basic List
```bash
# Given: 3 features (1 active, 1 in_progress, 1 planned)
# When: edgedoc tasks list
# Then: Shows all 3 with correct status and progress
```

### Test 2: Checkbox Counting
```bash
# Given: Feature with nested checkboxes
#   - [x] Task 1
#     - [x] Item 1
#     - [ ] Item 2
# When: edgedoc tasks get <feature>
# Then: Shows 2/3 (67%)
```

### Test 3: Progress Calculation
```bash
# Given: 10 features, 8 완료, 1 진행중 (50%), 1 대기
# When: edgedoc tasks progress
# Then: Overall = (800 + 50 + 0) / 1000 = 85%
```

### Test 4: Filtering
```bash
# Given: Mix of statuses and priorities
# When: edgedoc tasks list --status pending --priority high
# Then: Shows only high-priority pending tasks
```

### Test 5: Reference Lookup
```bash
# Given: Code file referenced in 2 features
# When: edgedoc tasks get --code <file>
# Then: Shows both features
```

### Test 6: Next Task Recommendation
```bash
# Given: 1 high priority (deps met), 1 high priority (blocked)
# When: edgedoc tasks next
# Then: Recommends the unblocked one
```
