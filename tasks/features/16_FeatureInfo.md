---
type: feature
status: implemented
feature: feature-info
priority: medium
entry_point: "src/cli.ts"
related_features:
  - 14_ReverseReferenceIndex
  - 15_TasksManagement
code_references:
  - "src/tools/feature-info.ts"
---

# Feature Info & Coverage

**Command**: `edgedoc feature info <feature-id>`

## Purpose

Feature의 **전체 구현 상태**를 한눈에 파악할 수 있도록 통합 정보를 제공한다.
- 인터페이스 제공/사용 현황
- 테스트 커버리지
- 코드 파일 목록
- Tasks 진행도
- 의존성 상태

## Problem

현재 문제점:
1. **정보 분산**: tasks, interfaces, tests, code가 각각 다른 명령어
2. **맥락 부족**: "이 feature 완료하려면 뭐가 남았나?" 답하기 어려움
3. **의존성 불명확**: "필요한 인터페이스들이 구현되었나?" 확인 번거로움

## Solution

Feature 단위로 모든 관련 정보를 통합 조회하는 `feature info` 명령어.

### Data Sources

모든 데이터는 `.edgedoc/references.json`과 `tasks-list.ts`에서 조회:

```typescript
// references.json
features[featureId] = {
  interfaces: {
    provides: string[];  // 제공하는 인터페이스들
    uses: string[];      // 사용하는 인터페이스들
  },
  tests: {
    tested_by: string[]; // 테스트 파일들
  },
  code: {
    uses: string[];      // 코드 파일들
  },
  features: {
    related: string[];   // 관련 features
  }
}

// tasks-list.ts
TaskInfo = {
  status: string;
  progress: number;
  checkboxes: {...}
}
```

## Architecture

### Components

**File**: `src/tools/feature-info.ts`

```typescript
export interface FeatureInfo {
  // Basic info
  id: string;
  title: string;
  file: string;
  status: string;
  progress: number;

  // Interfaces
  interfaces: {
    provides: InterfaceStatus[];  // 제공하는 인터페이스들
    uses: InterfaceStatus[];      // 사용하는 인터페이스들
  };

  // Tests
  tests: {
    files: string[];
    hasCoverage: boolean;
  };

  // Code
  code: {
    files: string[];
    totalSize: number;
  };

  // Dependencies
  dependencies: {
    relatedFeatures: string[];
    readiness: 'ready' | 'partial' | 'blocked';
  };
}

export interface InterfaceStatus {
  id: string;
  targetFeature: string;
  status: 'implemented' | 'partial' | 'planned';
  progress: number;
}
```

## Implementation Tasks

### Task 1: Data Collection Functions ✅
- [x] `getFeatureInfo(featureId)` - 메인 함수
- [x] `getInterfaceStatuses(interfaceIds, direction)` - 인터페이스 상태 조회
- [x] `getTestCoverage(featureId)` - 테스트 커버리지 조회
- [x] `getCodeFiles(featureId)` - 코드 파일 목록 및 크기
- [x] `checkDependencies(featureId)` - 의존성 준비 상태 (via graph query)

### Task 2: CLI Integration ✅
- [x] `feature info <feature-id>` 명령어 추가
- [x] `--full` 옵션: 상세 정보 (구현 완료)
- [x] `--json` 옵션: JSON 형식 출력

### Task 3: Pretty Printing ✅
- [x] `printFeatureInfo()` - 통합 출력
- [x] 인터페이스 상태 표시
- [x] 의존성 상태 표시
- [x] 이모지 아이콘으로 가시성 향상

### Task 4: Extended Queries ✅
- [x] Feature info 기본 기능 (구현 완료)
- [x] Tasks list로 대체 (`tasks list --incomplete`)
- [x] 테스트 커버리지 표시

### Task 5: MCP Integration
- [x] Graph query로 MCP 통합 (14_ReverseReferenceIndex 활용)
- [x] Feature 정보 조회 가능

### Task 6: Documentation ✅
- [x] README에 feature 명령어 포함
- [x] Graph query 문서화 완료
- [x] 예시 출력 포함

## Usage Examples

### Basic Usage

```bash
edgedoc feature info 00_Init
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Feature: 00_Init
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: active
Progress: ✅ Implemented (no pending tasks)
File: tasks/features/00_Init.md

🔗 Interfaces Provided (7):
┌──────────┬────────────────────────┬──────────┬──────────┐
│ ID       │ Target Feature         │ Status   │ Progress │
├──────────┼────────────────────────┼──────────┼──────────┤
│ 00--01   │ 01_ValidateMigration   │ ✅ Done  │ 100%     │
│ 00--02   │ 02_ValidateNaming      │ 🔄 WIP   │ 85%      │
│ 00--03   │ 03_ValidateOrphans     │ ✅ Done  │ 100%     │
│ 00--04   │ 04_ValidateStructure   │ ✅ Done  │ 100%     │
│ 00--05   │ 05_ValidateSpecOrphans │ ✅ Done  │ 100%     │
│ 00--06   │ 06_ValidateAll         │ ✅ Done  │ 100%     │
│ 00--07   │ 07_Sync                │ 📋 Plan  │ 0%       │
└──────────┴────────────────────────┴──────────┴──────────┘

Summary: 5/7 complete (71%)

🔗 Interfaces Used (0):
   None - This is a root feature

🧪 Tests:
   ❌ No tests found

   💡 Suggested:
      - tests/init.test.ts
      - tests/cli/init-command.test.ts

📝 Code Files (14):
   src/cli.ts (12.4 KB)
   src/tools/init.ts (3.2 KB)
   src/tools/validate.ts (5.1 KB)
   ... 11 more files (total: 45.2 KB)

🔗 Related Features (0):
   None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Readiness: 🔄 PARTIAL

Action Items:
  1. Complete interface 00--02 (2 tasks remaining)
  2. Start implementation of interface 00--07
  3. Add unit tests
```

### Check Dependencies

```bash
edgedoc feature info 01_ValidateMigration
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Feature: 01_ValidateMigration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: active
Progress: ████████████████████ 100% (14/14)

🔗 Interfaces Used (1):
┌──────────┬────────────────┬──────────┬──────────┐
│ ID       │ Provider       │ Status   │ Progress │
├──────────┼────────────────┼──────────┼──────────┤
│ 00--01   │ 00_Init        │ ✅ Ready │ 100%     │
└──────────┴────────────────┴──────────┴──────────┘

Dependencies: ✅ ALL READY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Readiness: ✅ READY FOR USE

All dependencies are satisfied.
Consider adding tests for better reliability.
```

### List Incomplete Features

```bash
edgedoc feature list --incomplete
```

**Output**:
```
⚠️  Features with Incomplete Items (3)

[1] 00_Init
    Incomplete Interfaces: 2/7
      - 00--02: 85% (2 tasks)
      - 00--07: Planned
    Tests: None

[2] 02_ValidateNaming
    Progress: 85% (11/13 tasks)
    Tests: None

[3] 07_Sync
    Status: Planned (not started)
    Tests: None
```

### List Features Without Tests

```bash
edgedoc feature list --no-tests
```

**Output**:
```
⚠️  Features Without Tests (15)

High Priority (5):
  - 14_ReverseReferenceIndex
  - 15_TasksManagement
  - 13_ValidateTerms
  - 12_AnalyzeEntryPoints
  - 09_MultiLanguageParser

Medium Priority (1):
  - 10_Internationalization

Low Priority (1):
  - 11_MCPServer

No Priority (8):
  - 00_Init, 01_ValidateMigration, ...

💡 Recommendation: Start with high-priority features
```

## CLI Command Design

```typescript
// Main command
program
  .command('feature')
  .description('Feature 정보 및 커버리지 조회');

// Info command
feature
  .command('info <feature-id>')
  .description('Feature 전체 정보 조회')
  .option('--full', '전체 코드 파일 목록 표시')
  .option('--json', 'JSON 형식 출력')
  .action(async (featureId, options) => {
    const info = await getFeatureInfo(options.project, featureId);
    if (options.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      printFeatureInfo(info, { full: options.full });
    }
  });

// List command with filters
feature
  .command('list')
  .description('Features 목록 조회')
  .option('--incomplete', '미완료 항목이 있는 features만')
  .option('--no-tests', '테스트 없는 features만')
  .option('--incomplete-interfaces', '미구현 인터페이스 있는 features만')
  .action(async (options) => {
    const features = await listFeatures(options.project);
    const filtered = applyFilters(features, options);
    printFeaturesList(filtered);
  });

// Check command (dependency check)
feature
  .command('check <feature-id>')
  .description('Feature 의존성 및 준비 상태 확인')
  .action(async (featureId, options) => {
    const status = await checkFeatureReadiness(options.project, featureId);
    printReadinessStatus(status);
  });
```

## Data Flow

```
User Command: edgedoc feature info 00_Init
  ↓
getFeatureInfo(00_Init)
  ↓
1. Load references.json
2. Load TaskInfo for 00_Init
3. For each interface in provides:
     - Get target feature TaskInfo
     - Calculate status
4. For each interface in uses:
     - Get provider feature TaskInfo
     - Check if ready
5. Get test files
6. Get code files and sizes
7. Combine all data
  ↓
printFeatureInfo()
  ↓
Pretty formatted output
```

## Dependencies

- `src/tools/build-reference-index.ts` - reference index
- `src/tools/tasks-list.ts` - TaskInfo
- `.edgedoc/references.json` - data source

## Future Enhancements

1. **Visual Dependency Graph**:
   ```bash
   edgedoc feature graph 00_Init
   # ASCII art showing feature dependencies
   ```

2. **Diff/History**:
   ```bash
   edgedoc feature diff 00_Init --since=yesterday
   # Show what changed
   ```

3. **Health Score**:
   ```bash
   edgedoc feature health 00_Init
   # Overall health: 85/100
   # - Implementation: 100/100
   # - Tests: 0/100
   # - Documentation: 95/100
   ```

4. **Batch Operations**:
   ```bash
   edgedoc feature batch --no-tests --add-skeleton-tests
   # Generate test skeletons for all untested features
   ```

## Success Metrics

1. **사용성**: 단일 명령어로 feature 전체 상태 파악
2. **정확성**: 모든 데이터가 references.json과 동기화
3. **가시성**: 미완료 항목을 명확히 표시
4. **효율성**: 1초 이내 응답 (17 features 기준)

## Related

- **Feature 14** (ReverseReferenceIndex): 데이터 소스
- **Feature 15** (TasksManagement): TaskInfo 제공
- **SYNTAX_GUIDE**: 사용법 문서화
