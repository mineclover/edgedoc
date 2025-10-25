# Documentation Index

**Last Updated**: 2025-10-25
**Version**: 2.1

edgedoc 프로젝트의 사용자 가이드입니다.

---

## 📚 User Guides (사용자 가이드)

### Getting Started

1. **[TASKS_README.md](TASKS_README.md)** - Tasks 디렉토리 구조
   - Features/Interfaces/Shared 구조
   - 파일 명명 규칙
   - 시작 가이드

2. **[VALIDATION_GUIDE.md](VALIDATION_GUIDE.md)** ✨ - 검증 시스템 가이드
   - Phase 1: Individual Validations
   - Phase 2: Cross Validations (Recursive)
   - 의존성 준비도, 진행도-품질 검증
   - 워크플로우 예시

3. **[PROGRESS_TRACKING_GUIDE.md](PROGRESS_TRACKING_GUIDE.md)** - 진행도 추적 가이드
   - Checkbox 기반 진행도 관리
   - Feature/Task 조회
   - 실제 사용 예시

4. **[WORKFLOWS.md](WORKFLOWS.md)** - 개발 워크플로우
   - 일일 개발 워크플로우
   - 기능 추가 워크플로우
   - CI/CD 통합

---

## 🔧 Technical Guides (기술 가이드)

### Setup & Configuration

5. **[MCP_SETUP.md](MCP_SETUP.md)** - MCP 서버 설정
   - Claude Desktop 연동
   - MCP 도구 사용법

### Extension & Customization

6. **[LANGUAGE_EXTENSION_GUIDE.md](LANGUAGE_EXTENSION_GUIDE.md)** - 언어 파서 확장
   - 새로운 프로그래밍 언어 추가
   - Tree-sitter 파서 통합

---

## 📖 Reference (레퍼런스)

### Core Concepts

7. **[GLOSSARY.md](GLOSSARY.md)** - 용어집
   - 프로젝트 전역 용어 정의
   - [[CLI]], [[MCP]] 등의 형식으로 참조

---

## 🗄️ Archive (보관)

**[archive/](archive/)** - 초기 설계 문서 (참고용)
- `SHARED_TYPES.md` - 공용 타입 설계
- `MIGRATION_SPEC.md` - 마이그레이션 스펙
- `MCP_SPEC.md` - MCP 통합 스펙

---

## 📝 Implementation Specs (구현 스펙)

구현 스펙은 **`tasks/features/`**에 있습니다:

### Documentation Syntax
- **Feature 04**: [04_ValidateStructure.md](../tasks/features/04_ValidateStructure.md)
  - Frontmatter 규칙
  - Feature/Interface 문서 구조

- **Feature 13**: [13_ValidateTerms.md](../tasks/features/13_ValidateTerms.md)
  - `[[Term]]` 문법
  - 용어 정의 규칙

### CLI Tools
각 feature가 자신의 CLI 명령어를 정의합니다:
- Feature 01-07: Validation commands
- Feature 15: Tasks management
- Feature 16: Feature info

### Internationalization
- **Feature 10**: [10_Internationalization.md](../tasks/features/10_Internationalization.md)
  - 다국어 지원 (영어/한국어)
  - 메시지 시스템

---

## Quick Reference

### 문서 작성할 때
1. [TASKS_README.md](TASKS_README.md) - 구조 확인
2. [tasks/features/04_ValidateStructure.md](../tasks/features/04_ValidateStructure.md) - Frontmatter 규칙
3. [tasks/features/13_ValidateTerms.md](../tasks/features/13_ValidateTerms.md) - `[[Term]]` 문법
4. [GLOSSARY.md](GLOSSARY.md) - 용어 확인

### 검증할 때
1. [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) - 검증 명령어
2. [PROGRESS_TRACKING_GUIDE.md](PROGRESS_TRACKING_GUIDE.md) - 진행도 확인

### 개발할 때
1. [WORKFLOWS.md](WORKFLOWS.md) - 워크플로우
2. 각 feature 문서 - CLI 명령어

### 확장할 때
1. [LANGUAGE_EXTENSION_GUIDE.md](LANGUAGE_EXTENSION_GUIDE.md) - 언어 추가
2. [MCP_SETUP.md](MCP_SETUP.md) - MCP 설정

---

## Document Status

| Document | Purpose | Type | Last Updated |
|----------|---------|------|--------------|
| TASKS_README.md | Tasks 구조 | Guide | 2025-10-24 |
| VALIDATION_GUIDE.md | 검증 가이드 (재귀) | Guide | 2025-10-25 |
| PROGRESS_TRACKING_GUIDE.md | 진행도 추적 | Guide | 2025-10-25 |
| WORKFLOWS.md | 워크플로우 | Guide | 2025-10-24 |
| GLOSSARY.md | 용어집 | Reference | 2025-10-24 |
| MCP_SETUP.md | MCP 설정 | Guide | 2025-10-24 |
| LANGUAGE_EXTENSION_GUIDE.md | 언어 확장 | Guide | 2025-10-24 |

---

## Recent Changes (2025-10-25)

### ✨ Restructured
- **Separated Specs from Guides**
  - Implementation specs → `tasks/features/`
  - User guides → `docs/`

### 🗑️ Removed (duplicates in tasks/features/)
- `SYNTAX_GUIDE.md` (→ Feature 04 & 13)
- `TOOLS_README.md` (→ each feature defines own CLI)
- `I18N_IMPLEMENTATION_STATUS.md` (→ Feature 10)

### 📊 Result
- **Before**: 10 documents (mixed specs & guides)
- **After**: 7 documents (user guides only)
- **Principle**: Single source of truth in `tasks/features/`

---

**Maintained by**: edgedoc team
**Contact**: See main README.md
