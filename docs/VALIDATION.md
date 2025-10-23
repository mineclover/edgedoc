# 검증 시스템 (Validation System)

## 목적

tasks/ 디렉토리 내 인터페이스 및 공용 타입 문서의 일관성, 정확성, 완전성을 자동으로 검증하여 문서 품질을 유지합니다.

**핵심 검증 항목:**
- **단일 진실 원천 (SSOT)**: 공용 타입이 `shared/`에서만 정의되고 다른 곳에서는 참조만 하는지 확인
- **중복 정의 방지**: 같은 타입이 여러 곳에서 정의되지 않았는지 확인
- **양방향 참조 일관성**: 공용 타입과 인터페이스 간 참조가 일치하는지 확인

## 검증 도구

### 1. validate.sh - 구조 검증 (필수)

인터페이스 및 공용 타입 문서의 구조적 일관성을 검증합니다.

#### 검증 항목

**1️⃣ 순환 의존성 검사**
- 인터페이스 간 순환 참조 감지
- A→B→C→A 같은 패턴 탐지

**2️⃣ 인터페이스 일관성 검사**
- from/to 필드 일관성
- 인터페이스 파일명과 내용 매칭

**3️⃣ Frontmatter 필수 필드 검사**
- 인터페이스: `from`, `to`, `type`, `status`
- 공용 타입: `interfaces`, `type`, `status`
- 필드 누락 감지

**4️⃣ 예시 코드 금지 검사**
- 예시 코드 블록 존재 여부
- 실제 타입 정의만 허용

**5️⃣ 공용 타입 검증 (SSOT 핵심)**

**5-1. 단일 진실 원천 (SSOT) 검증**
- 공용 타입이 `shared/` 디렉토리에만 존재하는지 확인
- `features/`, `interfaces/`에서 공용 타입을 직접 정의하지 않았는지 확인
- 참조 링크 (🔗) 존재 확인

**5-2. 파일명 검증**
- `_` 구분자 포함 여부
- `XX--YY` 형식 확인 (정규식: `^[0-9]{2}--[0-9]{2}$`)
- 중복 쌍 감지 (예: `01--02_01--02`)
- 알파벳순 정렬 확인
- interfaces 개수와 파일명 쌍 개수 일치
- interfaces 배열 정렬 확인

**5-3. 양방향 참조 검증**
- 인터페이스 → 공용 타입: `shared_types` 필드 확인
- 공용 타입 → 인터페이스: `interfaces` 필드 확인
- 참조 링크 (🔗) 존재 확인

**5-4. 역방향 참조 확인**
- 공용 타입에 명시된 인터페이스 파일 존재
- 해당 인터페이스가 공용 타입을 실제로 참조하는지 확인

**5-5. 문서 구조 검증**
- "타입 정의" 섹션 존재
- "사용 인터페이스" 섹션 존재

#### 실행 방법

```bash
cd tasks
bash validate.sh
```

#### 출력 예시

```bash
🔍 Tasks 인터페이스 검증
========================

1️⃣  순환 의존성 검사...
✅ 순환 의존성 없음

2️⃣   인터페이스 일관성 검사...
✅ 인터페이스 일관성 확인

3️⃣  Frontmatter 필수 필드 검사...
✅ Frontmatter 필드 완전

4️⃣  예시 코드 금지 검사...
✅ 예시 코드 없음

5️⃣   공용 타입 검증...
✅ 공용 타입 검증 통과

========================
✅ 모든 검증 통과
```

#### 오류 예시

```bash
# 파일명 정렬 오류
❌ 02--03_01--02: 쌍이 정렬되지 않음 (정렬 후: 01--02_02--03)

# 양방향 참조 불일치
❌ 01--02: 02--03_02--05.md의 interfaces에 01--02 없음 (양방향 참조 불일치)

# 중복 쌍
❌ 01--02_01--02_02--03: 중복된 쌍 존재

# 경고 (치명적이지 않음)
⚠️  01--02_02--03_02--05: interfaces가 정렬되지 않음
```

### 2. validate-types.sh - 타입 일관성 검증 (권장)

공용 타입이 실제로 인터페이스에서 올바르게 사용되는지 의미적 검증을 수행합니다.

#### 검증 항목

**1️⃣ 공용 타입 일관성 검증**
- 공용 타입 파일에서 타입명 추출
- 해당 타입이 interfaces에 명시된 파일에서 사용되는지 확인
- `Pick<>`, `Omit<>`, `Partial<>` 등 TypeScript 유틸리티 타입 감지

**2️⃣ 고아 공용 타입 검사**
- frontmatter에는 interfaces가 있지만 실제 참조가 없는 경우
- 어떤 인터페이스도 `shared_types`에서 참조하지 않는 공용 타입 파일

**3️⃣ 중복 타입 정의 검사 (SSOT 핵심)**
- 여러 인터페이스/기능 문서에서 동일한 이름의 타입이 정의되었는지 확인
- 중복 발견 시 공용 타입으로 추출할 것을 제안
- **특히 주의**: `features/`, `interfaces/`에서 공용 타입과 동일한 이름의 타입 정의 감지

#### 실행 방법

```bash
cd tasks
bash validate-types.sh
```

#### 출력 예시

```bash
🔍 공용 타입 일관성 검증...

1️⃣  공용 타입 일관성 검증
  검증 중: 01--02_02--03_02--05
    타입명: ImageAsset
    ✅ 01--02: ImageAsset 사용 확인
    ✅ 02--03: ImageAsset 선택적 사용 확인
    ✅ 02--05: ImageAsset 사용 확인

2️⃣  고아 공용 타입 검사

3️⃣  중복 타입 정의 검사
  중복 타입 정의 검사...
  ⚠️  타입 'LayerNode'이 여러 파일에서 정의됨: 03--04,06--05
      → 공용 타입으로 추출 고려

✅ 타입 일관성 검증 완료
```

## 검증 워크플로우

### 개발 중 검증

```bash
# 1. 구조 검증 (필수)
cd tasks && bash validate.sh

# 2. 타입 일관성 검증 (권장)
cd tasks && bash validate-types.sh
```

### 커밋 전 검증

```bash
# 모든 검증을 한 번에 실행
cd tasks && bash validate.sh && bash validate-types.sh
```

### CI/CD 통합

```yaml
# .github/workflows/validate.yml 예시
name: Validate Tasks

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run structure validation
        run: cd tasks && bash validate.sh
      - name: Run type consistency validation
        run: cd tasks && bash validate-types.sh
```

## 검증 규칙 세부사항

### 단일 진실 원천 (SSOT) 검증

공용 타입의 단일 진실 원천 원칙을 검증합니다.

#### 규칙 1: 정의 위치 제한
- ✅ **허용**: `shared/` 디렉토리에서만 타입 정의
- ❌ **금지**: `features/`, `interfaces/`에서 공용 타입 정의

**검증 방법:**
```bash
# 공용 타입명 추출
shared_types=$(grep "^interface " shared/*.md | sed 's/.*interface \([^ {]*\).*/\1/')

# features/interfaces에서 동일한 타입 정의 검색
for type in $shared_types; do
  if grep -r "^interface $type" features/ interfaces/; then
    echo "❌ SSOT 위반: $type이 shared/ 외부에서 정의됨"
  fi
done
```

#### 규칙 2: 참조 방식 강제
- ✅ **허용**: Frontmatter `shared_types` + 참조 링크 (🔗)
- ❌ **금지**: 타입 전체 복사

**검증 방법:**
```bash
# shared_types에 명시된 타입이 실제로 참조만 하는지 확인
# 참조 링크 (🔗) 존재 확인
```

#### 규칙 3: 중복 정의 방지
- validate-types.sh가 자동으로 중복 타입 정의 검출
- 중복 발견 시 경고와 함께 공용 타입 추출 제안

**예시 출력:**
```bash
⚠️  타입 'LayerNode'이 여러 파일에서 정의됨: 03--04,04--03,06--05
    → shared/03--04_06--05.md로 공용 타입 추출 권장
```

### 공용 타입 파일명 규칙

**형식:** `{A}--{B}_{C}--{D}.md`

**검증 항목:**
1. `_` 포함 여부 (공용 타입 식별자)
2. 각 쌍이 `XX--YY` 형식 (X, Y는 2자리 숫자)
3. 쌍의 중복 없음
4. 알파벳순 정렬

**예시:**
```bash
# ✅ 올바른 형식
01--02_02--03_02--05.md

# ❌ 잘못된 형식
02--03_01--02.md          # 정렬 안 됨
01--02_01--02.md          # 중복 쌍
1--2_2--3.md              # 형식 오류 (2자리 필요)
01-02_02-03.md            # -- 대신 - 사용
```

### Frontmatter 검증

**인터페이스 파일 (`interfaces/*.md`):**
```yaml
---
from: "01_ProjectManagement"           # 필수
to: "02_ImageLibrary"                  # 필수
type: "service"                        # 필수
status: "defined"                      # 필수
shared_types:                          # 선택 (있으면 검증)
  - "01--02_02--03_02--05"
---
```

**공용 타입 파일 (`shared/*.md`):**
```yaml
---
interfaces:                            # 필수 (배열, 정렬됨)
  - "01--02"
  - "02--03"
  - "02--05"
type: "shared"                         # 필수 (반드시 "shared")
status: "defined"                      # 필수
---
```

### 양방향 참조 일관성

공용 타입과 인터페이스는 서로를 참조해야 합니다:

**공용 타입 → 인터페이스:**
```yaml
# shared/01--02_02--03_02--05.md
interfaces:
  - "01--02"    # interfaces/01--02.md 존재해야 함
  - "02--03"    # interfaces/02--03.md 존재해야 함
  - "02--05"    # interfaces/02--05.md 존재해야 함
```

**인터페이스 → 공용 타입:**
```yaml
# interfaces/01--02.md
shared_types:
  - "01--02_02--03_02--05"    # shared/01--02_02--03_02--05.md 존재해야 함
```

**교차 검증:**
- `01--02.md`의 `shared_types`에 `"01--02_02--03_02--05"` 있음
- `01--02_02--03_02--05.md`의 `interfaces`에 `"01--02"` 있음
- 양방향 일치 필수

## 오류 처리

### 치명적 오류 (❌)

검증 실패 시 `exit 1` 반환:
- 순환 의존성 발견
- 필수 frontmatter 필드 누락
- 파일명 형식 오류
- 양방향 참조 불일치
- 참조하는 파일 존재하지 않음

### 경고 (⚠️)

검증 통과하지만 주의 필요:
- interfaces 정렬 안 됨 (기능적으로 문제없으나 컨벤션 위반)
- 문서 섹션 누락 (타입 정의, 사용 인터페이스)
- 고아 공용 타입 (참조 없음)
- 중복 타입 정의 (공용 타입 추출 후보)

## 검증 스크립트 유지보수

### validate.sh 수정 시 주의사항

1. **에러 카운트 일관성**
   - `ERRORS` 변수 증가 시 `((ERRORS++))`
   - `SHARED_ERRORS` 변수는 공용 타입 전용

2. **파일 존재 확인**
   - `[ ! -f "$file" ] && continue` 패턴 사용
   - 디렉토리는 `[ -d "$dir" ]`

3. **정규식 사용**
   - Bash 정규식: `[[ "$var" =~ ^pattern$ ]]`
   - 특수문자 이스케이프 필요

4. **배열 정렬**
   - `sorted=($(printf '%s\n' "${array[@]}" | sort))`
   - 공백 처리: `tr -d ' '`

### validate-types.sh 수정 시 주의사항

1. **Bash 3.x 호환성**
   - 연관 배열 (`declare -A`) 사용 금지
   - 임시 파일 (`mktemp`) 사용

2. **타입 추출**
   - `grep "^interface " file | sed 's/interface \([^ {]*\).*/\1/'`
   - 마크다운 코드 블록 내에서만 추출

3. **정리 (Cleanup)**
   - 임시 파일 삭제: `rm -f "$tmpfile"`
   - `trap` 사용 권장: `trap "rm -f $tmpfile" EXIT`

## 문제 해결 (Troubleshooting)

### 문제 1: "interfaces가 정렬되지 않음" 경고

**원인:** frontmatter의 interfaces 배열이 알파벳순이 아님

**해결:**
```yaml
# ❌ 잘못된 순서
interfaces:
  - "02--03"
  - "01--02"
  - "02--05"

# ✅ 올바른 순서
interfaces:
  - "01--02"
  - "02--03"
  - "02--05"
```

### 문제 2: "양방향 참조 불일치"

**원인:** 공용 타입과 인터페이스의 참조가 일치하지 않음

**해결:**
```bash
# 1. shared/01--02_02--03.md 확인
interfaces:
  - "01--02"
  - "02--03"

# 2. interfaces/01--02.md 확인
shared_types:
  - "01--02_02--03"  # 추가

# 3. interfaces/02--03.md 확인
shared_types:
  - "01--02_02--03"  # 추가
```

### 문제 3: "타입 사용 확인 불가"

**원인:** validate-types.sh가 타입 사용을 찾지 못함

**해결:**
```typescript
// ❌ 타입 사용이 암시적
const asset = { id: '123', name: 'image' };

// ✅ 타입 사용이 명시적
const asset: ImageAsset = { ... };

// ✅ 또는 Pick 사용
const asset: Pick<ImageAsset, 'id' | 'name'> = { ... };
```

### 문제 4: 중복 타입 경고 (SSOT 위반)

**원인:** 여러 인터페이스에서 같은 타입 정의

**해결:**
1. 공용 타입 파일 생성: `shared/03--04_06--05.md`
2. 타입을 공용 타입으로 이동
3. 각 인터페이스에서 참조로 변경
4. validate.sh 실행하여 확인

**예시:**
```bash
# 문제: LayerNode가 3곳에서 정의됨
⚠️  타입 'LayerNode'이 여러 파일에서 정의됨:
    - features/03_Canvas.md
    - features/04_LayerPanel.md
    - features/06_CanvasData.md

# 해결:
1. shared/03--04_06--05.md 생성
2. LayerNode 완전 정의 이동
3. 3개 파일에서 정의 삭제하고 참조로 변경:
   ---
   shared_types:
     - "03--04_06--05"
   ---
   > 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md] 참조
```

### 문제 5: SSOT 위반 - shared/ 외부에서 공용 타입 정의

**원인:** `features/` 또는 `interfaces/`에서 공용 타입을 직접 정의

**해결:**
1. 해당 타입 정의를 `shared/`로 이동
2. 원래 위치에서는 참조로 변경
3. Frontmatter에 `shared_types` 추가
4. 검증 실행

**예시:**
```bash
# ❌ 잘못된 패턴
# features/03_Canvas.md
interface LayerNode {
  // ...
}

# ✅ 올바른 패턴
# shared/03--04_06--05.md에 정의
# features/03_Canvas.md에서는 참조만
---
shared_types:
  - "03--04_06--05"
---
> 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md] 참조
```

## 베스트 프랙티스

### 1. 커밋 전 항상 검증 (SSOT 확인 필수)

```bash
# git hook 추가 (.git/hooks/pre-commit)
#!/bin/bash
cd tasks
if ! bash validate.sh; then
    echo "❌ 구조 검증 실패 (SSOT 위반 가능). 커밋 취소."
    exit 1
fi
if ! bash validate-types.sh; then
    echo "⚠️  타입 일관성 경고 발견 (중복 타입 정의 가능). 확인 권장."
    # 경고는 커밋 차단하지 않음
fi
```

### 2. 새 인터페이스 추가 시 (SSOT 준수)

```bash
# 1. 인터페이스 파일 생성
# interfaces/07--08.md

# 2. 타입 정의 전에: 기존 공용 타입 확인
ls shared/ | grep "07--08"

# 3. 새 타입이 다른 곳에서 사용되는지 확인
grep -r "interface MyNewType" features/ interfaces/ shared/

# 4. 검증 실행
bash validate.sh

# 5. 중복 타입 확인
bash validate-types.sh

# 6. 중복 발견 시 공용 타입으로 추출
# 7. 단독 사용 시 인터페이스에 정의
```

### 3. 공용 타입 수정 시 (SSOT 영향 분석 필수)

```bash
# 1. 영향받는 모든 파일 확인 (features, interfaces)
grep -r "01--02_02--03_02--05" features/ interfaces/

# 2. 타입명으로 실제 사용처 확인
grep -r "ImageAsset" features/ interfaces/ | grep -v "🔗"

# 3. 공용 타입 수정 (shared/에서만!)
# shared/01--02_02--03_02--05.md

# 4. 검증 실행
bash validate.sh && bash validate-types.sh

# 5. 모든 참조 인터페이스/기능 문서 업데이트 확인
# 6. 타입 변경이 호환성을 깨뜨리는지 확인
```

### 4. 정기적 검증

```bash
# 주간 또는 릴리즈 전
cd tasks
bash validate.sh && bash validate-types.sh

# 중복 타입 리포트 검토
# 공용 타입 추출 고려
```

## 확장 가능성

### 향후 추가 가능한 검증

1. **타입 호환성 검증**
   - TypeScript 컴파일러 API 사용
   - Pick<> 필드가 실제로 원본 타입에 존재하는지 확인

2. **문서 품질 검증**
   - 주석 충실도 검사
   - 예제 코드 검증 (TypeScript 컴파일)

3. **의존성 그래프 시각화**
   - GraphViz로 인터페이스 관계도 생성
   - 공용 타입 사용 현황 차트

4. **자동 수정 기능**
   - `--fix` 플래그로 정렬 자동 수정
   - frontmatter 자동 생성

5. **성능 최적화**
   - 병렬 처리 (GNU parallel)
   - 증분 검증 (변경된 파일만)

## 참고 자료

- [SHARED_TYPES.md](./SHARED_TYPES.md) - 공용 타입 컨벤션
- [INTERFACE_SPEC.md](./INTERFACE_SPEC.md) - 인터페이스 명세
- validate.sh - 구조 검증 스크립트
- validate-types.sh - 타입 일관성 검증 스크립트
