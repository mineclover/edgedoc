# Validation Guide

**Last Updated**: 2025-10-25
**Version**: 2.0 (Recursive Validation)

edgedoc의 검증 시스템을 실제로 사용하는 방법을 설명합니다.

---

## Overview

edgedoc는 **2단계 검증 시스템**을 제공합니다:

### Phase 1: Individual Validations (개별 검증)
- 각 검증이 독립적으로 실행
- 파일, 구조, 네이밍 등 기본 검증

### Phase 2: Cross Validations (재귀 검증) ✨ NEW
- 여러 검증 결과를 연결하여 재귀적으로 분석
- Feature 간 의존성, 진행도-품질 교차 검증
- 인터페이스 영향 분석, 용어 우선순위 검증

---

## Quick Start

### 전체 검증 (권장)

```bash
edgedoc validate all
```

**Output**:
```
🔄 전체 검증 실행...

━━━ Phase 1: Individual Validations ━━━

마이그레이션: ✅ 통과
네이밍 컨벤션: ✅ 통과
구조 검증: ✅ 통과
고아 파일: ✅ 통과
스펙 고아 코드: ✅ 통과
인터페이스: ✅ 통과
용어: ✅ 통과

━━━ Phase 2: Cross Validations (Recursive) ━━━

━━━ Dependency Readiness ━━━

✅ Ready Features: 18

━━━ Progress-Quality Check ━━━

✅ Safe to Use: 18

━━━ Interface Impact Analysis ━━━

✅ No high-impact issues found

━━━ Recursive Term Validation ━━━

✅ No critical term issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 전체 검증 요약

Individual Validations:
  마이그레이션: ✅ 통과
  네이밍 컨벤션: ✅ 통과
  구조 검증: ✅ 통과
  고아 파일: ✅ 통과
  스펙 고아 코드: ✅ 통과
  인터페이스: ✅ 통과
  용어: ✅ 통과

Cross Validations:
  의존성 준비도: ✅ 통과
  진행도-품질: ✅ 통과
  인터페이스 영향: ✅ 통과
  재귀 용어: ✅ 통과

✅ 모든 검증 통과
```

### 재귀 검증 스킵

```bash
# Phase 1만 실행 (기존 동작)
edgedoc validate all --skip-cross
```

---

## Individual Validations (Phase 1)

### 1. 마이그레이션 검증

```bash
edgedoc validate migration
```

**목적**: tasks → tasks-v2 마이그레이션 시 섹션/타입 누락 검증

**사용 시점**:
- 마이그레이션 작업 중
- 문서 리팩토링 후

### 2. 네이밍 컨벤션 검증

```bash
edgedoc validate naming
```

**목적**: 인터페이스/공용 타입 네이밍 규칙 준수 검증

**규칙**:
- 인터페이스: `NN--NN.md` (예: `00--01.md`)
- 공용 타입: `NN--NN_NN--NN.md` (예: `00--01_00--02.md`)

### 3. 구조 검증

```bash
edgedoc validate structure
```

**목적**:
- 순환 의존성 감지
- Frontmatter 필수 필드 확인
- 인터페이스 일관성 검증

### 4. 고아 파일 검증

```bash
edgedoc validate orphans
```

**목적**: 문서에서 참조되지 않는 파일 찾기

**Output**:
```
⚠️  Orphan files found (2):
   .edgedoc/references.json (41.5 KB)
   temp/debug.log (1.2 KB)
```

### 5. 스펙 고아 코드 검증

```bash
edgedoc validate spec-orphans
```

**목적**: 문서화되지 않은 export 찾기

### 6. 인터페이스 검증

```bash
edgedoc validate interfaces

# 특정 feature만
edgedoc validate interfaces --feature 00_Init

# 특정 namespace만
edgedoc validate interfaces --namespace 00
```

**목적**:
- 양방향 링크 검증 (provides ↔ uses)
- Sibling coverage 검증

### 7. 용어 검증

```bash
edgedoc validate terms
```

**목적**:
- 정의되지 않은 용어 찾기
- 미사용 정의 찾기
- 순환 참조 감지

---

## Cross Validations (Phase 2) ✨ NEW

### 1. 의존성 준비 상태 검증

```bash
# 전체 features
edgedoc validate dependencies

# 특정 feature
edgedoc validate dependencies 02_ValidateNaming
```

**목적**: Feature가 사용하는 인터페이스의 provider가 준비되었는지 재귀적으로 확인

**Output**:
```
━━━ Dependency Readiness ━━━

❌ Blocked Features (1):

   02_ValidateNaming (85%)
   Status: active
   Dependencies not ready:
     - 00--02 (00_Init: 60%)

⚠️  Partial Ready Features (2):
   07_Sync: 1 dependencies not ready
   14_ReverseReferenceIndex: 2 dependencies not ready

✅ Ready Features: 15
```

**해석**:
- `02_ValidateNaming`은 `00--02` 인터페이스를 사용
- `00--02`의 provider인 `00_Init`이 60% 완료 (80% 미만 → not ready)
- `02_ValidateNaming`은 **blocked** 상태

**사용 시점**:
- Feature 개발 시작 전 의존성 확인
- 진행도 계획 수립 시
- 릴리즈 준비 상태 확인

**예시 워크플로우**:
```bash
# Feature 14 시작 전 의존성 확인
$ edgedoc validate dependencies 14_ReverseReferenceIndex

━━━ Dependency Readiness ━━━

⚠️  Partial Ready Features (1):

   14_ReverseReferenceIndex (44%)
   Status: active
   Dependencies not ready:
     - 14--01 (14_ReverseReferenceIndex: 44%)
     - 14--02 (14_ReverseReferenceIndex: 44%)

# 의사결정: 의존성이 자기 자신이므로 진행 가능
```

### 2. 진행도-품질 교차 검증

```bash
# 전체 features
edgedoc validate quality

# 특정 feature
edgedoc validate quality 00_Init
```

**목적**: 진행도가 높은데 테스트가 없거나 용어가 미정의된 경우 경고

**Output**:
```
━━━ Progress-Quality Check ━━━

❌ Not Ready (3):

   13_ValidateTerms (100%)
     - 5 undefined terms

⚠️  Use With Caution (8):

   00_Init: no_tests
   01_ValidateMigration: no_tests
   02_ValidateNaming: no_tests
   03_ValidateOrphans: no_tests
   04_ValidateStructure: no_tests
   05_ValidateSpecOrphans: no_tests
   07_Sync: no_tests
   06_ValidateAll: no_tests

✅ Safe to Use: 7
```

**해석**:
- `13_ValidateTerms`: 100% 완료인데 미정의 용어 5개 → **not_ready**
- `00_Init` 등 8개: 테스트 없음 → **use_with_caution**
- 나머지 7개: 품질 이슈 없음 → **safe_to_use**

**사용 시점**:
- Feature 완료 전 품질 확인
- 릴리즈 전 품질 게이트
- PR 리뷰 시 체크리스트

**예시 워크플로우**:
```bash
# Feature 16 완료 후 품질 확인
$ edgedoc validate quality 16_FeatureInfo

━━━ Progress-Quality Check ━━━

⚠️  Use With Caution (1):

   16_FeatureInfo: no_tests

# 의사결정: 테스트 추가 후 머지
```

### 3. 인터페이스 영향 분석

```bash
# 전체 interfaces
edgedoc validate impact

# 특정 interface
edgedoc validate impact 00--02
```

**목적**: 인터페이스 제공자의 진행도가 낮은데 소비자가 active인 경우 감지

**Output**:
```
━━━ Interface Impact Analysis ━━━

⚠️  High Impact Interfaces (2):

   00--02
     Provider: 00_Init (60%)
     Consumers: 2
     ❌ Blocked: 1
     ⚠️  At Risk: 1

   14--01
     Provider: 14_ReverseReferenceIndex (44%)
     Consumers: 3
     ⚠️  At Risk: 2
```

**해석**:
- `00--02`: provider 60% 완료, consumer 1개 blocked, 1개 at risk
- `14--01`: provider 44% 완료, consumer 2개 at risk

**사용 시점**:
- 인터페이스 변경 전 영향도 파악
- Provider 우선순위 결정
- 블로킹 이슈 조기 발견

**예시 워크플로우**:
```bash
# 00--02 인터페이스 변경 전 영향 확인
$ edgedoc validate impact 00--02

⚠️  High Impact Interfaces (1):

   00--02
     Provider: 00_Init (60%)
     Consumers: 2
     ❌ Blocked: 1 (02_ValidateNaming)
     ⚠️  At Risk: 1 (06_ValidateAll)

# 의사결정: 00_Init을 먼저 80% 이상 완료 후 변경
```

### 4. 재귀 용어 검증

```bash
edgedoc validate terms-recursive
```

**목적**: 미정의 용어를 사용하는 feature의 우선순위 기반 심각도 판단

**Output**:
```
━━━ Recursive Term Validation ━━━

❌ Critical (high-priority features) (3):

   "MigrationMetadata" used in:
     - 01_ValidateMigration (100%)

   "ParserHierarchy" used in:
     - 09_MultiLanguageParser (85%)

   "TaskCheckbox" used in:
     - 15_TasksManagement (42%)

⚠️  High Priority (5):

   "EditorIntegration" used in 2 files

✅ Low Priority: 12
```

**해석**:
- `MigrationMetadata`: 100% 완료 feature에서 사용 → **critical**
- `ParserHierarchy`: 85% 완료 feature에서 사용 → **critical**
- `EditorIntegration`: 50%+ 완료 feature에서 사용 → **high**

**사용 시점**:
- 용어 정의 우선순위 결정
- High-priority feature 작업 시 용어 정의 강제
- 릴리즈 전 용어 일관성 확인

**예시 워크플로우**:
```bash
# 릴리즈 전 용어 검증
$ edgedoc validate terms-recursive

❌ Critical (high-priority features) (1):

   "MigrationMetadata" used in:
     - 01_ValidateMigration (100%)

# 의사결정: GLOSSARY.md에 MigrationMetadata 정의 추가
$ vim docs/GLOSSARY.md

# 재검증
$ edgedoc validate terms-recursive

✅ No critical term issues
```

---

## Workflows

### Workflow 1: Feature 개발 시작 전

```bash
# Step 1: 의존성 확인
edgedoc validate dependencies <feature-id>

# Step 2: 의존 인터페이스 영향 확인
edgedoc validate impact <interface-id>

# Step 3: 의사결정
# - Ready: 개발 시작
# - Partial/Blocked: Provider 완료 후 시작
```

**예시**:
```bash
$ edgedoc validate dependencies 02_ValidateNaming

❌ Blocked: 00--02 (00_Init: 60%)

$ edgedoc validate impact 00--02

Provider: 00_Init (60%)
Consumers: 2 (including 02_ValidateNaming)

# 의사결정: 00_Init을 먼저 완료
```

### Workflow 2: Feature 완료 전 품질 확인

```bash
# Step 1: 진행도 확인
edgedoc tasks get <feature-id>

# Step 2: 품질 검증
edgedoc validate quality <feature-id>

# Step 3: 용어 검증 (high priority인 경우)
edgedoc validate terms-recursive

# Step 4: 의사결정
# - Safe to use: 머지 가능
# - Use with caution: 테스트 추가 후 머지
# - Not ready: 품질 이슈 해결 후 머지
```

**예시**:
```bash
$ edgedoc tasks get 16_FeatureInfo

Progress: 35% (7/20)

$ edgedoc validate quality 16_FeatureInfo

⚠️  Use With Caution:
   16_FeatureInfo: no_tests

# 의사결정: 테스트 추가 후 머지
```

### Workflow 3: 인터페이스 변경 전

```bash
# Step 1: 영향 분석
edgedoc validate impact <interface-id>

# Step 2: 의사결정
# - No impact: 변경 진행
# - High impact: Consumer 팀에 알림 후 변경
```

**예시**:
```bash
$ edgedoc validate impact 00--02

⚠️  High Impact:
   Blocked: 1
   At Risk: 1

# 의사결정: Consumer 팀에 알림 후 변경 일정 조율
```

### Workflow 4: 릴리즈 준비

```bash
# Step 1: 전체 검증
edgedoc validate all

# Step 2: 진행도 확인
edgedoc tasks progress

# Step 3: 블로킹 이슈 확인
edgedoc validate dependencies | grep "Blocked"
edgedoc validate quality | grep "Not Ready"
edgedoc validate terms-recursive | grep "Critical"

# Step 4: 의사결정
# - No blockers + 진행도 > 80%: 릴리즈 진행
# - Blockers 있음: 해결 후 재검증
```

**예시**:
```bash
$ edgedoc validate all

Individual Validations: ✅ All passed
Cross Validations:
  의존성 준비도: ❌ 1개 blocked
  진행도-품질: ⚠️  3개 not ready
  인터페이스 영향: ✅ 통과
  재귀 용어: ❌ 1개 critical

# 의사결정: 블로킹 이슈 해결 후 릴리즈
```

---

## Best Practices

### 1. 검증 실행 타이밍

**일일**:
```bash
edgedoc validate dependencies <current-feature>
edgedoc validate quality <current-feature>
```

**주간**:
```bash
edgedoc validate all
edgedoc tasks progress
```

**릴리즈 전**:
```bash
edgedoc validate all
edgedoc tasks progress
edgedoc feature list --incomplete
```

### 2. CI/CD 통합

**GitHub Actions 예시**:
```yaml
name: Validation Check

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: bun install
      - name: Build reference index
        run: bun run src/cli.ts graph build
      - name: Run comprehensive validation
        run: bun run src/cli.ts validate all
```

### 3. 검증 실패 시 대응

#### Dependency Blocked
```bash
# 확인
$ edgedoc validate dependencies <feature-id>

# 대응
1. Provider feature 우선 완료 (80% 이상)
2. 또는 해당 인터페이스 제거 (필요 없는 경우)
```

#### Quality Not Ready
```bash
# 확인
$ edgedoc validate quality <feature-id>

# 대응
1. 미정의 용어 → GLOSSARY.md에 추가
2. 테스트 없음 → tests/<feature>.test.ts 추가
```

#### High Impact Interface
```bash
# 확인
$ edgedoc validate impact <interface-id>

# 대응
1. Provider 우선순위 상향
2. Consumer 팀에 알림
3. 변경 일정 조율
```

#### Critical Terms
```bash
# 확인
$ edgedoc validate terms-recursive

# 대응
1. GLOSSARY.md에 용어 정의 추가
2. 또는 다른 용어로 대체
```

---

## Troubleshooting

### Q1: "Reference index not found" 에러

**원인**: `.edgedoc/references.json` 파일 없음

**해결**:
```bash
edgedoc graph build
```

### Q2: 재귀 검증이 너무 오래 걸림

**원인**: Feature가 많거나 용어 검증이 느림

**해결**:
```bash
# Phase 1만 실행
edgedoc validate all --skip-cross

# 또는 개별 검증
edgedoc validate dependencies
edgedoc validate quality
```

### Q3: "dependency readiness" 결과가 예상과 다름

**원인**: Task 진행도가 업데이트되지 않음

**해결**:
```bash
# Reference index 재생성
edgedoc graph build

# 재검증
edgedoc validate dependencies
```

### Q4: False positive (잘못된 경고)

**예시**: 자기 참조 인터페이스가 blocked로 표시

**해결**: 이는 정상입니다. Feature가 자신의 인터페이스를 제공하면서 사용하는 경우, 진행도에 따라 blocked/partial로 표시될 수 있습니다.

---

## Summary

**핵심 명령어**:
1. `edgedoc validate all` - 전체 검증 (권장)
2. `edgedoc validate dependencies [feature]` - 의존성 준비도
3. `edgedoc validate quality [feature]` - 진행도-품질
4. `edgedoc validate impact [interface]` - 인터페이스 영향
5. `edgedoc validate terms-recursive` - 재귀 용어

**워크플로우**:
1. Feature 시작 전: 의존성 확인
2. Feature 완료 전: 품질 확인
3. 인터페이스 변경 전: 영향 분석
4. 릴리즈 전: 전체 검증 + 블로킹 이슈 확인

**CI/CD 통합**:
- PR 시 `validate all` 실행
- 실패 시 머지 방지
- 주기적으로 진행도 리포트

---

**Last Updated**: 2025-10-25
**edgedoc Version**: 2.0 (Recursive Validation)
**Author**: Claude Code 🤖
