# Documentation Index

**Last Updated**: 2025-10-25
**Version**: 2.0

edgedoc 프로젝트의 공식 문서입니다.

---

## 📚 User Guides (사용자 가이드)

### Getting Started

1. **[SYNTAX_GUIDE.md](SYNTAX_GUIDE.md)** - 문서 작성 문법
   - Frontmatter 규칙
   - 용어 `[[Term]]` 사용법
   - Interface/Feature 문서 구조

2. **[VALIDATION_GUIDE.md](VALIDATION_GUIDE.md)** ✨ NEW - 검증 시스템 가이드
   - Phase 1: Individual Validations
   - Phase 2: Cross Validations (Recursive) ✨
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

7. **[I18N_IMPLEMENTATION_STATUS.md](I18N_IMPLEMENTATION_STATUS.md)** - 다국어 지원 상태
   - 한국어/영어 지원
   - 설정 방법

---

## 📖 Reference (레퍼런스)

### Core Concepts

8. **[GLOSSARY.md](GLOSSARY.md)** - 용어집
   - 프로젝트 전역 용어 정의
   - [[Term]] 참조용

### Directory Structure

9. **[TASKS_README.md](TASKS_README.md)** - tasks/ 디렉토리 설명
   - Features/Interfaces 구조
   - 문서 작성 규칙

10. **[TOOLS_README.md](TOOLS_README.md)** - 도구 설명
    - CLI 명령어 목록
    - 각 도구의 용도

---

## 🗄️ Archive (보관)

**[archive/](archive/)** - 초기 설계 문서 (참고용)
- `SHARED_TYPES.md` - 공용 타입 설계
- `MIGRATION_SPEC.md` - 마이그레이션 스펙
- `MCP_SPEC.md` - MCP 통합 스펙

---

## Quick Reference

### 문서 작성할 때
1. [SYNTAX_GUIDE.md](SYNTAX_GUIDE.md) - 문법 확인
2. [GLOSSARY.md](GLOSSARY.md) - 용어 확인
3. [TASKS_README.md](TASKS_README.md) - 구조 확인

### 검증할 때
1. [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) - 검증 명령어
2. [PROGRESS_TRACKING_GUIDE.md](PROGRESS_TRACKING_GUIDE.md) - 진행도 확인

### 개발할 때
1. [WORKFLOWS.md](WORKFLOWS.md) - 워크플로우
2. [TOOLS_README.md](TOOLS_README.md) - CLI 명령어

### 확장할 때
1. [LANGUAGE_EXTENSION_GUIDE.md](LANGUAGE_EXTENSION_GUIDE.md) - 언어 추가
2. [MCP_SETUP.md](MCP_SETUP.md) - MCP 설정

---

## Document Status

| Document | Purpose | Status | Last Updated |
|----------|---------|--------|--------------|
| SYNTAX_GUIDE.md | 문법 가이드 | ✅ Current | 2025-10-25 |
| VALIDATION_GUIDE.md | 검증 가이드 (재귀) | ✅ Current | 2025-10-25 |
| PROGRESS_TRACKING_GUIDE.md | 진행도 추적 | ✅ Current | 2025-10-25 |
| WORKFLOWS.md | 워크플로우 | ✅ Current | 2025-10-24 |
| GLOSSARY.md | 용어집 | ✅ Current | 2025-10-24 |
| MCP_SETUP.md | MCP 설정 | ✅ Current | 2025-10-24 |
| LANGUAGE_EXTENSION_GUIDE.md | 언어 확장 | ✅ Current | 2025-10-24 |
| I18N_IMPLEMENTATION_STATUS.md | i18n 상태 | ✅ Current | 2025-10-24 |
| TASKS_README.md | tasks/ 설명 | ✅ Current | 2025-10-24 |
| TOOLS_README.md | 도구 설명 | ✅ Current | 2025-10-24 |

---

## Recent Changes (2025-10-25)

### ✨ New
- **VALIDATION_GUIDE.md** - 재귀 검증 포함 전체 검증 가이드

### 🗑️ Removed (10개 → 7개 삭제)
- `VALIDATION.md` (구식, VALIDATION_GUIDE로 대체)
- `INTERFACE_VALIDATION_DESIGN.md` (구현 완료)
- `INTERFACE_VALIDATION_INTEGRATION.md` (구현 완료)
- `INTERFACE_LEVEL_VALIDATION_PLAN.md` (구현 완료)
- `REFERENCE_SYSTEM_ANALYSIS.md` (구현 완료)
- `DOCUMENTATION_TERM_SYSTEM.md` (구현 완료)
- `TERM_DEFINITION_SYNTAX.md` (SYNTAX_GUIDE와 중복)

### 📁 Archived (3개)
- `SHARED_TYPES.md` → archive/
- `MIGRATION_SPEC.md` → archive/
- `MCP_SPEC.md` → archive/

### 📊 Result
- **Before**: 20 documents (~320K)
- **After**: 10 documents (~120K)
- **Reduction**: 62% smaller, clearer structure

---

**Maintained by**: edgedoc team
**Contact**: See main README.md
