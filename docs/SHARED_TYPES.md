# 공용 타입 (Shared Types)

## 목적

여러 인터페이스에서 동일한 타입 정의를 공유할 때, 중복을 제거하고 일관성을 유지하기 위한 공용 타입 관리 체계.

## 원칙

### 1. **단일 진실 원천 (Single Source of Truth, SSOT)**

공용 타입은 **shared/** 디렉토리에서만 정의하며, 기능(features/) 및 인터페이스(interfaces/) 문서는 **참조만** 해야 합니다.

**핵심 규칙:**
- ✅ **정의 (Definition)**: `shared/` 디렉토리에서만 타입 정의 허용
- ✅ **참조 (Reference)**: `features/`, `interfaces/` 문서에서는 참조 링크만 사용
- ❌ **중복 정의 금지**: 같은 타입을 여러 곳에서 정의하면 안 됨

**참조 방법:**
```markdown
---
shared_types:
  - "03--04_06--05"
---

## 타입 정의

> 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조
```

### 2. **참조 기반 공유**

공용 타입이라 해서 모든 곳에서 사용하는 것이 아니라, 명시적으로 참조하는 인터페이스만 사용

### 3. **동일 원천 데이터 (Same Source Data)**

완전히 동일한 타입 구조뿐 아니라, 같은 원천에서 파생된 데이터도 공용 타입으로 관리
- 전체 필드 사용: `ImageAsset` 전체 사용
- 선택적 필드 사용: `Pick<ImageAsset, 'id' | 'name'>` 형태로 일부만 사용
- **핵심**: 원천이 같으면 공용 타입, 필드 개수는 무관

### 4. **양방향 참조 일관성**

공용 타입과 인터페이스는 서로를 참조해야 함
- 공용 타입 → 인터페이스: `interfaces` 필드에 명시
- 인터페이스 → 공용 타입: `shared_types` 필드에 명시

### 5. **불변성 유지**

공용 타입 변경 시 모든 참조 인터페이스 영향 분석 필수

## 명명 규칙

### 기본 형식
```
{A}--{B}_{B}--{C}.md
```

- `_` (underscore): 쉼표(`,`)를 대체하는 구분자
- 두 개 이상의 `{X}--{Y}` 쌍이 `_`로 연결됨
- `_`가 포함된 파일명으로 공용 타입 문서임을 식별

### 정렬 규칙
공용 타입은 AND 구조이므로, 구성 요소의 순서는 상관없음. 따라서 알파벳/숫자 순으로 정렬:

```
# 올바른 예시
01--02_02--03.md  (O)
02--03_01--02.md  (X) - 정렬되지 않음

# 동일한 구성
01--02_01--03.md
01--03_01--02.md  (X) - 위와 동일하므로 01--02_01--03.md 사용
```

### 정렬 알고리즘
1. 각 `{A}--{B}` 쌍을 추출
2. 각 쌍을 사전순으로 정렬
3. 정렬된 쌍들을 `_`로 연결

### 예시

```
# Case 1: 두 인터페이스가 공통 타입 공유
01--02.md와 02--03.md가 동일한 타입을 공유
→ 01--02_02--03.md

# Case 2: 세 인터페이스가 공통 타입 공유
01--02.md, 02--03.md, 03--04.md가 동일한 타입을 공유
→ 01--02_02--03_03--04.md

# Case 3: A가 B, C와 각각 다른 공통 타입 공유
01--02.md와 01--03.md가 Type1 공유 → 01--02_01--03.md (Type1)
01--02.md와 02--03.md가 Type2 공유 → 01--02_02--03.md (Type2)
이 둘은 별도 문서!

# Case 4: 선택적 필드 사용 (Same Source Data)
01--02.md: ImageAsset 전체 사용
02--03.md: Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'> 사용
02--05.md: ImageAsset 전체 사용
→ 01--02_02--03_02--05.md (동일 원천 데이터)

# Case 5: 유사하지만 다른 원천 (별도 타입)
03--04.md: { id: string; name: string; } (LayerNode에서 파생)
05--06.md: { id: string; name: string; } (CanvasElement에서 파생)
→ 별도 문서 유지 (원천이 다름)
```

## 파일 구조

### 위치
```
tasks/
├── shared/              # 공용 타입 문서들
│   ├── 01--02_02--03.md
│   └── 01--05_02--05.md
├── interfaces/          # 개별 인터페이스
│   ├── 01--02.md
│   ├── 02--03.md
│   └── ...
└── features/
```

### Frontmatter 형식

```markdown
---
interfaces:
  - "01--02"
  - "02--03"
type: "shared"
status: "defined"
---
```

**필수 필드:**
- `interfaces`: 이 공용 타입을 사용하는 인터페이스 목록 (정렬됨)
- `type`: 항상 "shared"
- `status`: "defined" | "deprecated"

## 문서 내용 구조

```markdown
---
interfaces:
  - "01--02"
  - "02--03"
  - "02--05"
type: "shared"
status: "defined"
---

# Shared Type: [타입명]

## 사용 인터페이스
- **01--02** (ProjectManagement → ImageLibrary): 전체 필드 사용
- **02--03** (ImageLibrary → Canvas): 선택적 필드 사용 (`id`, `name`, `width`, `height`, `blob`)
- **02--05** (ImageLibrary → Database): 전체 필드 사용

## 타입 정의

\`\`\`typescript
interface ImageAsset {
  id: string;           // 고유 식별자 (UUID v4)
  projectId: string;    // 프로젝트 참조
  name: string;         // 파일명
  path: string;         // 원본 경로
  blob: Blob;           // 이미지 데이터
  width: number;        // 이미지 너비 (px)
  height: number;       // 이미지 높이 (px)
  thumbnail: Blob;      // 썸네일 (200x200 이하)
}
\`\`\`

### 선택적 필드 사용 (02--03)
`02--03` (ImageLibrary → Canvas)은 드래그 이벤트에서 **선택적으로 일부 필드만 사용**:

**사용 필드:**
- `id`: 레이어와 연결하기 위한 식별자
- `name`: 레이어명 자동 생성
- `width`, `height`: 초기 캔버스 크기 설정
- `blob`: 이미지 렌더링

**미사용 필드:**
- `projectId`: Canvas는 이미 프로젝트 컨텍스트 내에 있음
- `path`: Canvas는 원본 경로 불필요
- `thumbnail`: Canvas는 원본 이미지 사용

**동일 원천 원칙**: 모두 `ImageAsset`에서 파생되므로 공용 타입으로 관리.

## 불변 규칙
- `id`는 UUID v4 형식
- `width`, `height` > 0
- `thumbnail`은 200x200 이하
- `blob`과 `thumbnail`은 Blob 타입

## 검증 조건
- `blob.type`은 image/* 형식 (PNG, JPG, JPEG, GIF, WebP, SVG)
- `projectId`는 유효한 Project.id
- `name`은 빈 문자열 불가
- `path`는 원본 파일 경로 (ZIP: 상대경로, Folder: 절대경로)

## 변경 이력
- 2025-01-22: 02--03 선택적 필드 사용 명시 추가
- 2025-01-22: 초기 정의 (01--02, 02--05)
```

## 인터페이스 문서 수정

공용 타입 생성 후, 해당 타입을 사용하는 인터페이스 문서에 참조 추가:

```markdown
---
from: "01_ProjectManagement"
to: "02_ImageLibrary"
type: "service"
status: "defined"
shared_types:
  - "01--02_02--03"  # 참조하는 공용 타입
---

# ProjectManagement → ImageLibrary

## 타입 정의

> 🔗 **공용 타입**: `ImageAsset`은 [01--02_02--03.md](../shared/01--02_02--03.md) 참조

\`\`\`typescript
// 간소화된 타입 참조만 표시
type ImageSource = { type: 'zip'; file: File } | { type: 'folder'; handle: FileSystemDirectoryHandle };
\`\`\`
```

## 생성 프로세스

### 1. 타입 중복 및 원천 식별
```bash
# 단계 1-1: 구조적 동일성 검사
# ImageAsset이 01--02와 02--05에서 100% 동일하게 정의됨

# 단계 1-2: 동일 원천 데이터 검사
# 02--03에서 ImageAsset의 일부 필드만 사용
# → Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>
# → 원천이 같으므로 공용 타입 후보
```

### 2. 공용 타입 후보 검증
**필수 조건 (OR 관계):**
- **조건 A**: 타입 구조가 100% 일치
  - 필드명, 타입, 개수가 모두 동일
  - 불변 규칙과 검증 조건이 동일
- **조건 B**: 동일 원천에서 파생 (Same Source Data)
  - 같은 타입을 참조하되 일부 필드만 사용
  - TypeScript의 `Pick<T>`, `Omit<T>` 등으로 표현 가능
  - 의미적으로 동일한 개념

**제외 조건:**
- 우연히 구조가 같지만 의미가 다른 타입
- 원천이 다른 타입 (예: LayerNode vs CanvasElement)

### 3. 공용 타입 문서 생성
```bash
# 3-1. 파일명 생성 (정렬 규칙 적용)
# 인터페이스: 01--02, 02--03, 02--05
# 정렬: 01--02, 02--03, 02--05 (이미 정렬됨)
# 파일명: 01--02_02--03_02--05.md

# 3-2. shared/ 디렉토리에 생성
# tasks/shared/01--02_02--03_02--05.md

# 3-3. 타입 정의 및 규칙 작성
# - frontmatter: interfaces, type, status
# - 사용 인터페이스: 각 인터페이스별 사용 방식 명시
# - 타입 정의: 전체 타입 + 주석
# - 선택적 필드 사용: Pick 사용 인터페이스 설명
# - 불변 규칙 및 검증 조건
```

### 4. 참조 업데이트
```bash
# 4-1. 인터페이스 문서 frontmatter에 shared_types 추가
# interfaces/01--02.md
# shared_types:
#   - "01--02_02--03_02--05"

# 4-2. 타입 정의 섹션에 참조 링크 추가
# > 🔗 **공용 타입**: `ImageAsset`은 [01--02_02--03_02--05.md](../shared/01--02_02--03_02--05.md) 참조

# 4-3. 중복 정의 제거
# interface ImageAsset { ... } 삭제

# 4-4. 선택적 사용 인터페이스는 Pick 명시
# interfaces/02--03.md
# > **선택적 사용**: `id`, `name`, `width`, `height`, `blob` 필드만 사용
# imageAsset: Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>
```

### 5. 양방향 참조 검증
```bash
# 5-1. 공용 타입 → 인터페이스 확인
# shared/01--02_02--03_02--05.md의 interfaces에 01--02, 02--03, 02--05 포함

# 5-2. 인터페이스 → 공용 타입 확인
# interfaces/01--02.md의 shared_types에 "01--02_02--03_02--05" 포함
# interfaces/02--03.md의 shared_types에 "01--02_02--03_02--05" 포함
# interfaces/02--05.md의 shared_types에 "01--02_02--03_02--05" 포함
```

## 검증 규칙

### validate.sh 확장

#### 5-1. 공용 타입 파일명 검증
```bash
# 기본 형식 검증
- _ 포함 여부 확인 (공용 타입 식별자)
- 각 쌍이 XX--YY 형식인지 확인 (정규식: ^[0-9]{2}--[0-9]{2}$)
- 중복 쌍 확인 (예: 01--02_01--02)
- 정렬 순서 확인 (알파벳순)

# Frontmatter 검증
- interfaces 필드 존재 확인
- interfaces 개수와 파일명 쌍 개수 일치 확인
- 파일명의 각 쌍이 interfaces에 존재 확인
- interfaces 배열이 정렬되어 있는지 확인
- type이 "shared"인지 확인
- status 필드 존재 확인

# 문서 구조 검증
- "타입 정의" 섹션 존재 확인
- "사용 인터페이스" 섹션 존재 확인
```

#### 5-2. 인터페이스의 shared_types 참조 검증
```bash
# 양방향 참조 검증
- shared_types에 명시된 파일 존재 확인
- 해당 공용 타입의 interfaces에 현재 인터페이스 포함 확인
- 공용 타입 참조 링크 (🔗 emoji) 존재 확인
```

#### 5-3. 역방향 참조 확인
```bash
# 공용 타입 → 인터페이스 검증
- 공용 타입의 interfaces에 명시된 인터페이스 파일 존재 확인
- 해당 인터페이스가 공용 타입을 shared_types에서 참조하는지 확인
```

### validate-types.sh (타입 일관성 검증)

공용 타입이 실제로 인터페이스에서 일관되게 사용되는지 검증:

```bash
# 1. 공용 타입 일관성 검증
- 공용 타입 파일에서 타입명 추출
- 해당 타입이 interfaces에 명시된 인터페이스에서 사용되는지 확인
- Pick<>, Omit<> 등 선택적 사용도 감지

# 2. 고아 공용 타입 검사
- 어떤 인터페이스도 참조하지 않는 공용 타입 파일 감지
- frontmatter에는 interfaces가 있지만 실제 참조가 없는 경우

# 3. 중복 타입 정의 검사
- 여러 인터페이스에서 동일한 이름의 타입이 정의되었는지 확인
- 공용 타입으로 추출할 후보 제안
```

### 검증 예시

#### validate.sh (구조 검증)
```bash
# 올바른 예시
$ cd tasks && bash validate.sh
5️⃣  공용 타입 검증...
✅ 공용 타입 검증 통과

# 오류 예시 1: 파일명 정렬 오류
❌ 02--03_01--02: 쌍이 정렬되지 않음 (정렬 후: 01--02_02--03)

# 오류 예시 2: 양방향 참조 불일치
❌ 01--02: 02--03_02--05.md의 interfaces에 01--02 없음 (양방향 참조 불일치)

# 오류 예시 3: 중복 쌍
❌ 01--02_01--02_02--03: 중복된 쌍 존재

# 경고 예시: interfaces 정렬
⚠️  01--02_02--03_02--05: interfaces가 정렬되지 않음
```

#### validate-types.sh (타입 일관성 검증)
```bash
$ cd tasks && bash validate-types.sh

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

✅ 타입 일관성 검증 완료
```

### 통합 검증 워크플로우

```bash
# 단계별 검증
cd tasks

# 1. 구조 검증 (필수)
bash validate.sh

# 2. 타입 일관성 검증 (권장)
bash validate-types.sh

# 3. 모든 검증 통합 실행
bash validate.sh && bash validate-types.sh
```

## 확장 시나리오

### 기존 공용 타입에 인터페이스 추가
```
# 기존: 01--02_02--03.md (ImageAsset)
# 새로 추가: 03--04도 ImageAsset 사용

# 파일명 변경: 01--02_02--03_03--04.md
# frontmatter 업데이트:
interfaces:
  - "01--02"
  - "02--03"
  - "03--04"
```

### 공용 타입 분리
```
# 기존: 01--02_02--03.md (ImageAsset + CanvasConfig)
# 분리 필요: ImageAsset만 공유, CanvasConfig는 02--03 전용

# 새로 생성: 01--02_02--03.md (ImageAsset만)
# 02--03.md: CanvasConfig는 개별 정의로 복원
```

## 예시

### 실제 프로젝트 적용

**Case 1: ImageAsset**
```
사용처:
- 01--02 (ProjectManagement → ImageLibrary): extractAndSaveImages 반환
- 02--03 (ImageLibrary → Canvas): 드래그 데이터
- 02--05 (ImageLibrary → Database): 저장 데이터

→ 01--02_02--03_02--05.md 생성
```

**Case 2: LayerNode** (실제 구현됨)
```
사용처:
- 03--04 (Canvas → LayerPanel): 레이어 구조 전달
- 04--03 (LayerPanel → Canvas): 레이어 업데이트
- 06--05 (CanvasData → Database): 레이어 저장

→ 03--04_06--05.md 생성됨 (2025-10-22)

타입 정의:
interface LayerNode {
  id: string;           // UUID v4
  type: LayerType;      // 'image' | 'group'
  name: string;
  visible: boolean;
  locked: boolean;
  style: ElementStyle;
  imageRef?: string;    // ImageAsset ID 참조
  parent?: string;      // 부모 레이어 ID
  children: string[];   // 자식 레이어 ID 배열
}

참조 방법:
- features/03_Canvas.md: shared_types: ["03--04_06--05"]
- features/04_LayerPanel.md: shared_types: ["03--04_06--05"]
- features/06_CanvasData.md: shared_types: ["03--04_06--05"]
- interfaces/03--04.md: shared_types: ["03--04_06--05"]
- interfaces/04--03.md: shared_types: ["03--04_06--05"]
- interfaces/06--05.md: shared_types: ["03--04_06--05"]
```

## 단일 진실 원천 (SSOT) 적용 가이드

### 개요

공용 타입은 **단 하나의 장소**에서만 정의되어야 합니다. 이를 통해:
- 타입 변경 시 단일 지점만 수정
- 문서 간 불일치 방지
- 유지보수 부담 감소
- 검증 스크립트로 일관성 자동 확인

### 정의와 참조의 구분

**정의 (Definition):**
- **위치**: `shared/` 디렉토리에서만
- **내용**: 완전한 TypeScript 타입 정의 + 주석 + 검증 규칙
- **예시**: `shared/03--04_06--05.md`에서 LayerNode 완전 정의

**참조 (Reference):**
- **위치**: `features/`, `interfaces/` 디렉토리에서
- **내용**: Frontmatter `shared_types` + 링크 (`🔗`)
- **예시**: `features/03_Canvas.md`에서 LayerNode 참조

### 올바른 참조 패턴

#### 1. Frontmatter 설정
```markdown
---
shared_types:
  - "03--04_06--05"
---
```

#### 2. 문서 내 참조 링크
```markdown
## 타입 정의

> 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조
```

#### 3. 인터페이스 특화 타입만 정의
```typescript
// ✅ 올바른 패턴: 인터페이스 특화 타입만 정의
interface CanvasConfig {
  width: number;
  height: number;
  zoom: number;
}

// LayerNode는 참조만 (정의 X)
```

### 잘못된 패턴과 수정

#### ❌ 패턴 1: 중복 정의
```markdown
<!-- features/03_Canvas.md -->
## 타입 정의

```typescript
interface LayerNode {
  id: string;
  type: LayerType;
  // ...
}
```
```

**문제**: LayerNode가 `shared/03--04_06--05.md`에도 정의됨 → 중복

**수정**:
```markdown
<!-- features/03_Canvas.md -->
---
shared_types:
  - "03--04_06--05"
---

## 타입 정의

> 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조

### Canvas 특화 타입
```typescript
interface CanvasConfig {
  // Canvas만의 타입
}
```
```

#### ❌ 패턴 2: 부분 정의
```markdown
<!-- interfaces/03--04.md -->
```typescript
// 간단한 LayerNode 정의
interface LayerNode {
  id: string;
  name: string;
}
```
```

**문제**: 공용 타입의 일부만 복사 → 불완전

**수정**: 전체를 참조로 대체

#### ❌ 패턴 3: Frontmatter 누락
```markdown
<!-- features/04_LayerPanel.md -->
<!-- shared_types 없음 -->

## 타입 정의

LayerNode를 사용합니다.
```

**문제**: 기계 가독 참조 없음 → 검증 스크립트 실패

**수정**: Frontmatter 추가

### 기존 중복 제거 프로세스

**상황**: LayerNode가 3개 파일에 중복 정의됨
- `features/03_Canvas.md`
- `features/04_LayerPanel.md`
- `features/06_CanvasData.md`

**단계:**

1. **공용 타입 파일 생성**
   ```bash
   # shared/03--04_06--05.md 생성
   ```

2. **타입 정의 이동**
   - 가장 완전한 정의를 `shared/03--04_06--05.md`로 복사
   - Frontmatter에 interfaces 명시
   - 사용 인터페이스, 불변 규칙 등 문서화

3. **기능 문서 업데이트**
   ```markdown
   <!-- features/03_Canvas.md -->
   ---
   shared_types:
     - "03--04_06--05"
   ---

   > 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조

   <!-- LayerNode 정의 삭제 -->
   ```

4. **인터페이스 문서 업데이트**
   ```markdown
   <!-- interfaces/03--04.md -->
   ---
   shared_types:
     - "03--04_06--05"
   ---

   > 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조

   <!-- LayerNode 정의 삭제 -->
   ```

5. **검증**
   ```bash
   cd tasks
   bash validate.sh
   bash validate-types.sh
   ```

### 검증 규칙

**validate.sh가 확인하는 사항:**
- Frontmatter `shared_types` 존재 여부
- 참조 파일 실제 존재
- 양방향 참조 일관성 (공용 타입 ↔ 인터페이스)
- 🔗 참조 링크 존재

**validate-types.sh가 확인하는 사항:**
- 중복 타입 정의 감지
- 공용 타입 실제 사용 확인
- 고아 공용 타입 검사

### 예외 상황

#### 1. 타입 확장이 필요한 경우
```typescript
// ✅ 올바른 패턴
// shared/03--04_06--05.md의 LayerNode 참조
type ExtendedLayerNode = LayerNode & {
  customMetadata: string;
};
```
→ 기본 타입은 공용, 확장은 개별 문서에서 정의

#### 2. 인터페이스 특화 타입
```typescript
// ✅ 올바른 패턴
// 03--04.md에서만 사용하는 타입
interface DragStartEvent {
  imageAsset: Pick<ImageAsset, 'id' | 'name'>;  // 공용 타입 참조
  position: { x: number; y: number };            // 인터페이스 특화
}
```
→ 공용 타입은 참조, 인터페이스만의 타입은 정의

### 체크리스트

공용 타입 생성 시:
- [ ] `shared/` 디렉토리에 파일 생성
- [ ] 완전한 타입 정의 작성
- [ ] Frontmatter에 `interfaces` 명시
- [ ] 사용 인터페이스 섹션 작성
- [ ] 불변 규칙 및 검증 조건 작성

참조 추가 시:
- [ ] Frontmatter에 `shared_types` 추가
- [ ] 🔗 참조 링크 추가
- [ ] 기존 타입 정의 제거
- [ ] validate.sh 실행
- [ ] validate-types.sh 실행

## 엣지 케이스 및 해결 방법

### Case 1: 타입 확장 (Extension)
**상황**: 인터페이스 A는 `ImageAsset` 전체 사용, 인터페이스 B는 `ImageAsset & { metadata: string }` 사용

**해결**: 공용 타입은 기본 `ImageAsset`만 관리, 확장 타입은 각 인터페이스에서 개별 정의
```typescript
// shared/01--02_02--05.md
interface ImageAsset { ... }

// interfaces/03--04.md
type ExtendedImageAsset = ImageAsset & { metadata: string };
```

### Case 2: 타입 변환 (Transformation)
**상황**: 인터페이스 A는 `ImageAsset` 사용, 인터페이스 B는 `Omit<ImageAsset, 'blob'> & { url: string }` 사용

**해결**: 원천이 같지만 변환이 있으므로 별도 타입으로 관리
```typescript
// interfaces/04--05.md
// ImageAsset을 변환하여 사용하지만, 별도 타입으로 정의
interface SerializedImageAsset {
  id: string;
  projectId: string;
  // ... blob 제외
  url: string;  // blob → url 변환
}
```

### Case 3: 부분 집합의 부분 집합
**상황**:
- 01--02: `ImageAsset` 전체 사용
- 02--03: `Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>` 사용
- 03--04: `Pick<ImageAsset, 'id' | 'name'>` 사용 (02--03의 부분 집합)

**해결**: 모두 동일 원천이므로 하나의 공용 타입으로 관리
```markdown
# shared/01--02_02--03_03--04.md

## 사용 인터페이스
- **01--02**: 전체 필드 사용
- **02--03**: 선택적 필드 (`id`, `name`, `width`, `height`, `blob`)
- **03--04**: 최소 필드 (`id`, `name`)
```

### Case 4: 순환 참조 가능성
**상황**: A→B, B→C, C→A 형태로 인터페이스가 순환 참조하며 공용 타입 공유

**해결**: 공용 타입은 순환 참조와 무관. 각 인터페이스 쌍이 독립적으로 타입 공유
```markdown
# A→B와 B→C가 Type1 공유, C→A와 A→B가 Type2 공유 가능
# shared/01--02_02--03.md (Type1)
# shared/01--02_03--01.md (Type2)
```

### Case 5: 다중 공용 타입 참조
**상황**: 하나의 인터페이스가 여러 공용 타입 참조

**해결**: `shared_types` 배열에 모두 명시
```markdown
---
shared_types:
  - "01--02_02--03_02--05"  # ImageAsset
  - "01--03_03--04"         # LayerNode
---
```

## 타입 이름 중복 처리

### 원칙: 같은 이름, 다른 원천 = 이름 변경 필수

동일한 타입명이 여러 인터페이스에서 발견되었을 때:

**1. 동일 원천 확인 (공용 타입으로 추출)**
```typescript
// 03--04.md
interface LayerNode {
  id: string;
  type: 'image' | 'group';
  name: string;
  // ...
}

// 06--05.md (완전히 동일)
interface LayerNode {
  id: string;
  type: 'image' | 'group';
  name: string;
  // ...
}

// ✅ 같은 원천 → 공용 타입으로 추출
// shared/03--04_06--05.md 생성
```

**2. 다른 원천 확인 (이름 변경)**
```typescript
// 03--04.md (Canvas의 레이어)
interface LayerNode {
  id: string;
  type: 'image' | 'group';
  canvasPosition: { x: number; y: number };
}

// 07--08.md (Export의 레이어 - 다른 구조)
interface LayerNode {
  id: string;
  format: 'png' | 'svg';
  exportPath: string;
}

// ❌ 같은 이름, 다른 원천 → 이름 변경 필요
// 03--04.md: CanvasLayerNode
// 07--08.md: ExportLayerNode
```

### 이름 변경 규칙

**네이밍 패턴:**
```typescript
// 패턴 1: 도메인 접두사
interface CanvasLayerNode { ... }      // Canvas 도메인
interface DatabaseLayerNode { ... }    // Database 도메인
interface ExportLayerNode { ... }      // Export 도메인

// 패턴 2: 용도 접두사
interface DisplayLayer { ... }         // 화면 표시용
interface StorageLayer { ... }         // 저장용
interface TransferLayer { ... }        // 전송용

// 패턴 3: 구체적 명사
interface ImageLayer { ... }           // 이미지 레이어
interface GroupLayer { ... }           // 그룹 레이어
interface EffectLayer { ... }          // 이펙트 레이어
```

**변경 절차:**
1. 원천 분석: 타입이 어디서 유래했는지 확인
2. 의미 파악: 각 타입이 나타내는 개념 이해
3. 이름 선택: 도메인/용도/구체성을 반영한 이름
4. 전역 변경: 해당 인터페이스 내 모든 참조 업데이트
5. 문서화: 변경 이유를 인터페이스 문서에 주석 추가

**예시:**
```typescript
// Before (중복)
// interfaces/03--04.md
interface LayerNode { ... }

// interfaces/06--05.md
interface LayerNode { ... }

// After (구분) - 만약 다른 원천이었다면
// interfaces/03--04.md
/**
 * Canvas 렌더링을 위한 레이어 노드
 * (이전명: LayerNode - 06--05의 StorageLayerNode와 구분하기 위해 변경)
 */
interface CanvasLayerNode { ... }

// interfaces/06--05.md
/**
 * Database 저장을 위한 레이어 노드
 * (이전명: LayerNode - 03--04의 CanvasLayerNode와 구분하기 위해 변경)
 */
interface StorageLayerNode { ... }
```

### 판단 기준

| 항목 | 같은 원천 (공용 타입) | 다른 원천 (이름 변경) |
|------|---------------------|---------------------|
| **필드 구조** | 100% 동일 또는 부분 집합 | 다른 필드 포함 |
| **의미** | 동일한 개념 | 다른 개념 |
| **원천** | 같은 데이터 소스 | 다른 데이터 소스 |
| **변환** | 없음 또는 Pick/Omit | 필드 변환/추가 |
| **조치** | 공용 타입 추출 | 타입명 변경 |

## 주의사항

1. **단일 진실 원천 (SSOT) 준수**: 공용 타입은 `shared/` 디렉토리에서만 정의, 기능/인터페이스 문서는 참조만
2. **중복 정의 절대 금지**: 같은 타입을 여러 곳에서 정의하면 validate.sh 검증 실패
3. **과도한 추상화 금지**: 유사해 보여도 의미가 다르면 별도 타입 유지
4. **타입명 중복 금지**: 같은 이름이 다른 원천에 사용되면 반드시 구분
5. **버전 관리**: 공용 타입 변경 시 모든 참조 인터페이스 영향 확인 필수
6. **문서 동기화**: 공용 타입 생성/수정 시 관련 인터페이스 문서 즉시 업데이트
7. **양방향 참조 일관성**: 공용 타입과 인터페이스의 참조가 항상 일치해야 함
8. **파일명 정렬**: 공용 타입 파일명의 쌍은 반드시 알파벳순 정렬
9. **원천 추적**: 선택적 필드 사용 시 원천 타입을 명시하여 추적 가능하게 유지
10. **검증 필수**: 공용 타입 생성/수정 후 반드시 `validate.sh && validate-types.sh` 실행

## 트러블슈팅

### 문제 1: 공용 타입 파일명 오류
```bash
# 오류: 02--03_01--02.md
# 해결: 01--02_02--03.md (정렬 필요)

# 정렬 스크립트
IFS='_' read -ra PAIRS <<< "02--03_01--02"
sorted=($(printf '%s\n' "${PAIRS[@]}" | sort))
echo "${sorted[@]}" | tr ' ' '_'  # 출력: 01--02_02--03
```

### 문제 2: 양방향 참조 불일치
```bash
# 오류:
# shared/01--02_02--03.md의 interfaces에 "01--02"만 있음
# interfaces/02--03.md의 shared_types에 "01--02_02--03" 있음

# 해결: shared/01--02_02--03.md에 "02--03" 추가
interfaces:
  - "01--02"
  - "02--03"  # 추가
```

### 문제 3: 동일 원천 판단 기준 모호
```bash
# 질문: 이 두 타입이 같은 원천인가?
# A: Pick<ImageAsset, 'id' | 'name'>
# B: { id: string; name: string }

# 판단 기준:
# 1. A는 명시적으로 ImageAsset 참조 → 공용 타입
# 2. B는 우연히 구조가 같음 → 별도 타입
# 3. 문서/주석에서 원천 명시 여부 확인
```

### 문제 4: 공용 타입 확장 시 파일명 변경
```bash
# 기존: 01--02_02--05.md
# 추가: 02--03도 같은 타입 사용
# 새 파일명: 01--02_02--03_02--05.md

# 절차:
# 1. 새 파일 생성: shared/01--02_02--03_02--05.md
# 2. 기존 파일 내용 복사 + interfaces 추가
# 3. 모든 참조 인터페이스 업데이트 (01--02, 02--03, 02--05)
# 4. 기존 파일 삭제: shared/01--02_02--05.md
# 5. validate.sh 실행하여 검증
```

## 빠른 참조 (Quick Reference)

### 공용 타입 생성 체크리스트

- [ ] 1. 타입 중복/원천 식별
  - [ ] 구조적 100% 일치 확인
  - [ ] 또는 동일 원천 데이터 확인 (Pick<> 사용 포함)
- [ ] 2. 파일명 생성
  - [ ] `XX--YY_YY--ZZ.md` 형식
  - [ ] 알파벳순 정렬 확인
  - [ ] `_` 구분자 사용
- [ ] 3. 공용 타입 문서 작성
  - [ ] frontmatter: `interfaces`, `type: "shared"`, `status`
  - [ ] "사용 인터페이스" 섹션 (사용 방식 명시)
  - [ ] "타입 정의" 섹션 (주석 포함)
  - [ ] "선택적 필드 사용" 섹션 (해당 시)
  - [ ] "불변 규칙" 및 "검증 조건"
- [ ] 4. 인터페이스 문서 업데이트
  - [ ] frontmatter에 `shared_types` 추가
  - [ ] 🔗 참조 링크 추가
  - [ ] 중복 타입 정의 제거
  - [ ] Pick<> 사용 시 명시
- [ ] 5. 검증
  - [ ] `bash validate.sh` 실행
  - [ ] `bash validate-types.sh` 실행
  - [ ] 모든 오류 해결

### 명령어 요약

```bash
# 검증 (필수)
cd tasks && bash validate.sh

# 타입 일관성 검증 (권장)
cd tasks && bash validate-types.sh

# 전체 검증
cd tasks && bash validate.sh && bash validate-types.sh

# 파일명 정렬 확인
IFS='_' read -ra PAIRS <<< "파일명"
printf '%s\n' "${PAIRS[@]}" | sort

# 특정 타입 사용처 검색
grep -r "ImageAsset" interfaces/
```

### 일반적인 패턴

#### 패턴 1: 전체 필드 사용
```markdown
# interfaces/01--02.md
> 🔗 **공용 타입**: `ImageAsset`은 [01--02_02--03_02--05.md](../shared/01--02_02--03_02--05.md) 참조
```

#### 패턴 2: 선택적 필드 사용
```markdown
# interfaces/02--03.md
> 🔗 **공용 타입**: `ImageAsset`은 [01--02_02--03_02--05.md](../shared/01--02_02--03_02--05.md) 참조
> **선택적 사용**: `id`, `name`, `width`, `height`, `blob` 필드만 사용

```typescript
interface DragStartEvent {
  imageAsset: Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>;
}
```
```

#### 패턴 3: 타입 확장
```typescript
// 공용 타입은 기본만, 확장은 개별 정의
type ExtendedImageAsset = ImageAsset & { metadata: string };
```

### 자주하는 실수

1. ❌ 파일명 정렬 안 함: `02--03_01--02.md`
   - ✅ 올바른 형식: `01--02_02--03.md`

2. ❌ 양방향 참조 누락
   - ✅ 공용 타입의 `interfaces`와 인터페이스의 `shared_types` 모두 업데이트

3. ❌ 우연히 구조가 같은 타입을 공용으로 추출
   - ✅ 원천이 같은지 확인 (의미적 동일성)

4. ❌ Pick<> 사용을 별도 타입으로 간주
   - ✅ 같은 원천이면 공용 타입으로 관리

5. ❌ 공용 타입 수정 후 참조 인터페이스 미확인
   - ✅ 영향받는 모든 인터페이스 검토 필수
