# Tasks Tools

문서 관리 및 검증 도구 모음

---

## 🔄 코드 동기화 도구

### sync-code-refs.py

Tree-sitter 기반 코드 참조 동기화

```bash
npm run sync:code-refs
```

**참조 형식**:
```markdown
# 심볼 기반 (권장)
🔗 [src/services/CommandHistory.ts::Command](../../src/services/CommandHistory.ts::Command)

# 라인 기반 (지원)
🔗 [src/services/File.ts#L10-L20](../../src/services/File.ts#L10-L20)
```

**장점**:
- ✅ 심볼 이름으로 자동 추적
- ✅ 라인 번호 자동 업데이트
- ✅ 언어에 관계없이 일관된 동작
- ✅ AST 기반으로 안전한 파싱
- ✅ 라인 기반/심볼 기반 모두 지원

**요구사항**: Tree-sitter 패키지 설치 필요

---

## 🔨 설치 및 설정

### 1. Tree-sitter 패키지 설치

```bash
cd tasks/tools
chmod +x install-tree-sitter.sh
./install-tree-sitter.sh
```

또는 직접 설치:

```bash
pip3 install tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python
```

**설치 내용**:
- tree-sitter 코어 패키지
- TypeScript 언어 패키지 (pre-built)
- JavaScript 언어 패키지 (pre-built)
- Python 언어 패키지 (pre-built)

**요구사항**:
- Python 3.7+
- pip3

---

## 🔍 심볼 파서

### symbol-parser.py

Tree-sitter 기반 코드 심볼 추출

```bash
# 파일의 모든 심볼 나열
python3 symbol-parser.py src/services/CommandHistory.ts

# 특정 심볼 찾기
python3 symbol-parser.py src/services/CommandHistory.ts Command
```

**출력 예시**:
```
📄 CommandHistory.ts의 심볼 목록:

  [interface ] Command                        (L5-L9)
  [type      ] HistoryListener                (L11-L11)
  [class     ] CommandHistory                 (L28-L135)
```

**지원 언어**:
- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)
- Python (.py)

**지원 심볼**:
- interface
- type
- class
- function
- method
- variable (const, let)

---

## 📖 문서 도구

### toggle-details.py

로컬에서 `<details>` 블록 열기/닫기

```bash
# 블록 목록
npm run docs:list tasks/features/07_UndoRedo.md

# 특정 블록 열기
npm run docs:open tasks/features/07_UndoRedo.md open --index 0

# 모든 블록 열기
npm run docs:open tasks/features/07_UndoRedo.md open --all

# 닫기
npm run docs:close tasks/features/07_UndoRedo.md close --all
```

---

## ✅ 검증 도구

### validate-code-refs.sh

코드 참조 무결성 검증

```bash
npm run validate:code-refs
```

**검증 항목**:
- frontmatter에 `code_references` 필드 존재
- 참조 파일 존재 여부
- 링크 형식 유효성

### validate-migration.sh

점진적 마이그레이션 검증 (tasks → tasks-v2)

```bash
# 터미널 출력
npm run validate:migration

# 마크다운 리포트 생성
npm run validate:migration:report
# → tasks-v2/MIGRATION_REPORT.md 생성
```

**검증 항목**:
- tasks의 섹션이 tasks-v2에 존재
- tasks의 타입 정의가 tasks-v2에 존재
- 누락된 내용 감지

**원칙**:
- tasks에 있는 내용이 tasks-v2에 없으면 ❌ 에러
- tasks-v2에만 있는 새 내용은 ✅ 허용

**사용 시기**:
- tasks/ 구조 개편 시
- 점진적 마이그레이션 진행 중

**마크다운 리포트 형식**:
```markdown
# 마이그레이션 검증 리포트

## 📊 요약
- 전체 문서: 18
- 통과: 10 ✅
- 실패: 8 ❌

## 📋 상세 결과

### Features
#### ❌ 03_Canvas.md
**섹션 누락**:
- Missing section: ## 타입 정의

**타입 누락**:
- Missing type: CanvasEngineProps
```

상세 스펙: [MIGRATION_SPEC.md](./MIGRATION_SPEC.md)

---

## 📊 워크플로우

### A. v1 (라인 기반) - 간단한 프로젝트

```bash
# 1. 문서 작성 (라인 범위 수동 지정)
🔗 [src/services/File.ts#L10-L20](../../src/services/File.ts#L10-L20)

# 2. 코드 수정
vim src/services/File.ts

# 3. 동기화
npm run sync:code-refs

# 4. 검증
npm run validate:all

# 5. 커밋
git add tasks/features/*.md
git commit -m "docs: sync code references"
```

### B. v2 (심볼 기반) - 대규모 프로젝트 ⭐

```bash
# 0. 초기 설정 (최초 1회만)
cd tasks/tools && ./install-tree-sitter.sh

# 1. 문서 작성 (심볼 이름만 지정)
🔗 [src/services/CommandHistory.ts::Command](...)

# 2. 코드 수정
vim src/services/CommandHistory.ts

# 3. 동기화 (자동으로 라인 범위 추적)
npm run sync:code-refs:v2

# 4. 검증
npm run validate:all

# 5. 커밋
git add tasks/features/*.md
git commit -m "docs: sync code references"
```

---

## 🎯 참조 형식 비교

### 라인 기반 (v1)

```markdown
<details>
<summary>

**Command** - Command 인터페이스
🔗 [src/services/CommandHistory.ts#L5-L9](../../src/services/CommandHistory.ts#L5-L9)

</summary>

```typescript
// 코드는 sync-code-refs.py가 자동 업데이트
```

</details>
```

**장점**: 간단, 의존성 없음
**단점**:
- ❌ 코드 변경 시 라인 번호 수동 업데이트
- ❌ 다른 심볼이 추가되면 라인 어긋남

### 심볼 기반 (v2) ⭐

```markdown
<details>
<summary>

**Command** - Command 인터페이스
🔗 [src/services/CommandHistory.ts::Command](../../src/services/CommandHistory.ts::Command)

</summary>

```typescript
// 코드는 sync-code-refs-v2.py가 자동 추출
```

</details>
```

**장점**:
- ✅ 심볼 이름으로 추적 (라인 번호 자동)
- ✅ 다른 코드 추가/삭제에도 영향 없음
- ✅ 리팩토링에 강함

**단점**:
- Tree-sitter 빌드 필요 (초기 설정 1회)

---

## 🔧 트러블슈팅

### Tree-sitter 설치 실패

```bash
# Python 버전 확인 (3.7 이상 필요)
python3 --version

# pip 업그레이드
pip3 install --upgrade pip

# tree-sitter 재설치
pip3 uninstall tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python
pip3 install tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python
```

### 심볼을 찾을 수 없음

```bash
# 1. 파일의 모든 심볼 확인
python3 symbol-parser.py src/services/File.ts

# 2. 정확한 심볼 이름 사용
# ❌ Command interface
# ✅ Command

# 3. export 확인
# Tree-sitter는 export 여부 관계없이 모든 심볼 추출
```

### v2에서 v1으로 폴백

```bash
# Tree-sitter 없이도 동작 (라인 기반 참조는 계속 지원)
npm run sync:code-refs:v2

# 출력:
# ⚠️  심볼 파서를 사용할 수 없습니다
#    라인 기반 참조만 지원됩니다
#    설치 방법: ./install-tree-sitter.sh
```

---

## 📚 관련 문서

- [CODE_REFERENCE.md](../CODE_REFERENCE.md) - 코드 참조 컨벤션
- [REFERENCE_PARSING.md](../REFERENCE_PARSING.md) - 파싱 규격 상세
- [Tree-sitter 공식 문서](https://tree-sitter.github.io/tree-sitter/)

---

**최종 업데이트**: 2025-10-23
**권장**: v2 (심볼 기반) 사용
