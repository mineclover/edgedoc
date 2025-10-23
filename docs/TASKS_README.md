# Tasks - 기능 정의 및 인터페이스 명세

> 기능 단위 분리 및 인터페이스 계약 관리

## 📋 개요

이 디렉토리는 프로젝트의 **기능 정의**와 **기능 간 인터페이스**를 명확하게 문서화합니다.

**핵심 원칙:**
1. 기능은 독립적으로 정의됨
2. 인터페이스는 수정 불가능한 계약
3. 인터페이스는 핵심만 포함 (예시 금지)
4. 단방향 의존성
5. 계층화 지원

---

## 🗂️ 디렉토리 구조

```
tasks/
├── README.md                    # 이 문서
├── SHARED_TYPES.md              # 공용 타입 컨벤션 (필독)
├── VALIDATION.md                # 검증 시스템 가이드
├── QUALITY_TOOLS.md             # 품질 관리 도구 가이드
├── IMPLEMENTATION_REPORT.md     # 구현 리포트
├── features/                    # 기능 정의
│   ├── 01_ProjectManagement.md
│   ├── 02_ImageLibrary.md
│   ├── 03_Canvas.md
│   └── ...
├── interfaces/                  # 인터페이스 정의
│   ├── 01--02.md               # ProjectManagement → ImageLibrary
│   ├── 02--03.md               # ImageLibrary → Canvas
│   └── ...
├── shared/                      # 공용 타입 (Single Source of Truth)
│   ├── 01--02_02--03_02--05.md # ImageAsset
│   ├── 03--04_06--05.md        # LayerNode
│   ├── 03--06_06--05.md        # CanvasState, CanvasData
│   └── ...
└── tools/                       # 품질 관리 도구
    ├── find-duplicates.sh       # 중복 타입 검출
    └── check-references.sh      # SSOT 준수 검증
```

---

## 📄 파일 명명 규칙

### 기능 정의 (features/)

**형식:** `{번호}_{기능명}.md`

**예시:**
- `01_ProjectManagement.md`
- `02_ImageLibrary.md`
- `03_Canvas.md`

**계층화:**
- `01_ProjectManagement.md`
- `01_01_ProjectCreation.md` (하위 기능)
- `01_02_ProjectPersistence.md` (하위 기능)

### 인터페이스 정의 (interfaces/)

**형식:** `{출발기능}--{도착기능}.md`

**예시:**
- `01--02.md` (ProjectManagement → ImageLibrary)
- `02--03.md` (ImageLibrary → Canvas)
- `03--04.md` (Canvas → LayerPanel)

**계층화:**
- `01_01--02.md` (ProjectCreation → ImageLibrary)

**규칙:**
- `A--B`: A가 B를 필요로 함 (단방향)
- B는 A를 알 필요 없음
- 양방향이 필요하면 두 파일 생성: `A--B.md`, `B--A.md`

### 공용 타입 (shared/)

**형식:** `{A}--{B}_{C}--{D}.md`

**예시:**
- `01--02_02--03_02--05.md` (ImageAsset 공용 타입)
- `03--04_06--05.md` (LayerNode 공용 타입)

**규칙:**
- `_` (underscore)로 여러 인터페이스 쌍 연결
- 알파벳/숫자 순으로 정렬 필수
- 공용 타입은 여기서만 정의 (Single Source of Truth)

---

## 🔗 공용 타입 (Shared Types)

### 단일 진실 원천 (Single Source of Truth)

여러 인터페이스에서 동일한 타입을 공유할 때, **중복 정의를 절대 금지**하고 **단 하나의 장소**에서만 정의합니다.

**핵심 원칙:**
- ✅ **정의**: `shared/` 디렉토리에서만 타입 정의
- ✅ **참조**: `features/`, `interfaces/`에서는 참조만
- ❌ **중복 금지**: 같은 타입을 여러 곳에서 정의 금지

### 공용 타입 생성 시기

다음 조건 중 하나를 만족하면 공용 타입으로 추출:

1. **구조적 동일성**: 2개 이상의 인터페이스에서 동일한 타입 구조 사용
2. **동일 원천 데이터**: 같은 원천에서 파생 (Pick, Omit 사용 포함)

**예시:**
```typescript
// Case 1: 완전히 동일
// 01--02: ImageAsset 전체 사용
// 02--05: ImageAsset 전체 사용
→ 공용 타입으로 추출

// Case 2: 동일 원천, 부분 사용
// 02--03: Pick<ImageAsset, 'id' | 'name' | 'width' | 'height' | 'blob'>
→ 원천이 같으므로 공용 타입으로 관리
```

### 공용 타입 참조 방법

#### 1. Frontmatter에 명시
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
// ✅ 올바른 패턴
interface CanvasConfig {
  width: number;
  height: number;
}
// LayerNode는 정의 없이 참조만
```

### 잘못된 패턴

```markdown
<!-- ❌ 금지: features/03_Canvas.md에서 직접 정의 -->
interface LayerNode {
  id: string;
  // ...
}
```

**올바른 패턴:**
```markdown
<!-- ✅ 올바름: 참조만 -->
> 🔗 **공용 타입**: `LayerNode`는 [../shared/03--04_06--05.md](../shared/03--04_06--05.md) 참조
```

### 상세 가이드

공용 타입의 자세한 사용법은 [SHARED_TYPES.md](./SHARED_TYPES.md)를 참조하세요.

---

## 📝 문서 포맷

### 기능 정의 문서

```markdown
---
feature: "기능명"
status: "planned | in-progress | completed"
entry_point: "src/path/to/entry.ts"
description: "핵심 목적"
dependencies:
  - "02_ImageLibrary"
  - "05_Database"
shared_types:              # 선택: 참조하는 공용 타입
  - "03--04_06--05"
---

# 기능명

## 목적
명확한 핵심 목적 (1-2문장)

## 책임
- 책임 1
- 책임 2

## 제공 인터페이스
- `기능--타겟` 참조

## 의존 인터페이스
- `의존--기능` 참조

## 구현 상태
- [ ] 작업 1
- [ ] 작업 2
```

### 인터페이스 정의 문서

```markdown
---
from: "01_ProjectManagement"
to: "02_ImageLibrary"
type: "service | event | data"
status: "defined | implemented | verified"
shared_types:              # 선택: 참조하는 공용 타입
  - "01--02_02--03_02--05"
---

# ProjectManagement → ImageLibrary

## 목적
왜 이 인터페이스가 필요한가 (1문장)

## 계약

### 메서드/이벤트
**함수명:** `methodName`
**입력:** `TypeName`
**출력:** `TypeName`
**목적:** 핵심 목적

### 타입 정의
```typescript
interface InputType {
  field: string;
}
```

## 불변 규칙
- 규칙 1
- 규칙 2

## 검증 조건
- 조건 1
- 조건 2
```

---

## ⚠️ 작성 규칙

### ✅ 허용

1. **핵심만 작성**
   ```markdown
   ## 목적
   프로젝트 생성 요청을 처리한다.
   ```

2. **타입 정의**
   ```typescript
   interface CreateProjectInput {
     name: string;
     source: File | FileSystemDirectoryHandle;
   }
   ```

3. **불변 계약**
   ```markdown
   ## 불변 규칙
   - 입력 타입은 변경 불가
   - 반환 타입은 확장 가능
   ```

### ❌ 금지

1. **예시 코드**
   ```markdown
   ❌ 금지:
   ## 사용 예시
   const result = await service.create({ name: 'test' });
   ```

2. **구현 세부사항**
   ```markdown
   ❌ 금지:
   내부적으로 IndexedDB를 사용하여...
   ```

3. **모호한 표현**
   ```markdown
   ❌ 금지:
   필요하면 사용...
   대략적으로...
   ```

---

## 🔄 변경 관리

### 기능 정의 변경 시

1. 관련 인터페이스 검토
   ```bash
   # 영향받는 인터페이스 찾기
   grep -r "01_ProjectManagement" tasks/interfaces/
   ```

2. 인터페이스 호환성 확인
3. 필요시 새 인터페이스 버전 생성

### 인터페이스 변경 시

**원칙: 인터페이스는 수정 불가**

대신:
1. 새 인터페이스 문서 생성 (버전 명시)
2. 기존 인터페이스는 deprecated 표시
3. 마이그레이션 계획 문서화

---

## 🎯 작업 흐름

### 1. 요구사항 분석
```
요구사항 → 기능 식별 → 기능 분리
```

### 2. 기능 정의
```
features/{번호}_{기능명}.md 작성
```

### 3. 의존성 분석
```
기능 A가 기능 B 필요 → interfaces/{A}--{B}.md
```

### 4. 인터페이스 정의
```
목적 → 계약 → 불변 규칙 → 검증 조건
```

### 5. 검증
```
- 순환 의존성 확인
- 인터페이스 일관성 확인
- 타입 정합성 확인
```

---

## 📊 상태 관리

### 기능 상태
- `planned`: 계획됨
- `in-progress`: 개발 중
- `completed`: 완료됨
- `deprecated`: 폐기 예정

### 인터페이스 상태
- `defined`: 정의됨
- `implemented`: 구현됨
- `verified`: 검증됨
- `deprecated`: 폐기 예정

---

## 🔍 검증 체크리스트

### 기능 정의
- [ ] 목적이 1-2문장으로 명확한가?
- [ ] 책임이 구체적인가?
- [ ] 의존성이 명시되었는가?
- [ ] 순환 의존이 없는가?
- [ ] 공용 타입을 직접 정의하지 않고 참조하는가?

### 인터페이스 정의
- [ ] 목적이 1문장으로 명확한가?
- [ ] 타입이 완전히 정의되었는가?
- [ ] 불변 규칙이 명시되었는가?
- [ ] 예시 코드가 없는가?
- [ ] 모호한 표현이 없는가?
- [ ] 공용 타입을 직접 정의하지 않고 참조하는가?

### 공용 타입 (shared/)
- [ ] `shared/` 디렉토리에 위치하는가?
- [ ] 파일명이 정렬되었는가? (예: `01--02_02--03`)
- [ ] Frontmatter에 `interfaces` 필드가 있는가?
- [ ] 양방향 참조가 일치하는가?
- [ ] `validate.sh && validate-types.sh` 통과하는가?

---

## 🛠️ 품질 관리 도구

### 자동화된 검증 도구

프로젝트는 타입 시스템의 품질을 유지하기 위해 5가지 자동화 검증 도구를 제공합니다:

#### 1. validate.sh - 구조 검증
- 순환 의존성 검사
- 인터페이스 일관성 확인
- Frontmatter 필수 필드 검증
- 양방향 참조 검증

```bash
npm run validate
```

#### 2. validate-types.sh - 타입 일관성 검증
- 공용 타입 사용 확인
- 고아 공용 타입 감지
- 중복 타입 정의 검사

```bash
npm run validate:types
```

#### 3. find-duplicates.sh - 중복 타입 검출
- 여러 파일에서 동일 타입 정의 검출
- 파일 위치와 라인 번호 리포트

```bash
npm run validate:duplicates
```

#### 4. check-references.sh - SSOT 준수 검증
- shared/ 외부에서 공용 타입 재정의 검사
- SSOT 원칙 위반 감지

```bash
npm run validate:ssot
```

#### 5. validate-code-refs.sh - 코드 참조 무결성 검증 (NEW)
- 문서에서 참조하는 코드 파일 존재 확인
- 타입 참조 일치성 검증
- 상태-참조 일관성 확인

```bash
npm run validate:code-refs
```

#### 통합 검증
모든 검증을 한 번에 실행:

```bash
npm run validate:all
```

**권장 사용 시점:**
- 커밋 전 (필수)
- 공용 타입 추가/수정 후
- 인터페이스 변경 후
- 타입 리팩토링 후
- 코드 참조 추가/변경 후

### 상세 가이드

- **도구 사용법**: [QUALITY_TOOLS.md](./QUALITY_TOOLS.md)
- **구현 리포트**: [IMPLEMENTATION_REPORT.md](./IMPLEMENTATION_REPORT.md)
- **검증 시스템**: [VALIDATION.md](./VALIDATION.md)
- **코드 참조**: [CODE_REFERENCE.md](./CODE_REFERENCE.md) - 문서 경량화 컨벤션

### 품질 지표

현재 프로젝트 품질 상태:
- **SSOT 준수율**: 100% (5/5 공용 타입)
- **중복 타입**: 0개
- **코드 참조 무결성**: 100%
- **검증 통과율**: 100% (5/5 스크립트)

---

**이 문서는 tasks 디렉토리의 유일한 가이드입니다.**
