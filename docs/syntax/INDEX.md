# Syntax Terms Index

**Last Updated**: 2025-10-26
**Auto-Generated**: Run `edgedoc syntax index` to update

edgedoc 문서 작성 문법 용어 색인입니다. 각 문법 용어는 [[Term]] 형식으로 참조할 수 있습니다.

**Note**: Syntax terms are managed in `tasks/syntax/` as features. This index is auto-generated from those files.

---

## Documentation Structure

Feature 문서의 구조와 섹션 정의 관련 문법입니다.

| Term | Description | Parser | Status | Location |
|------|-------------|--------|--------|----------|
| [[Component Definition]] | Architecture 섹션의 컴포넌트 정의 | implementation-coverage.ts:165 | ✅ Documented | [tasks/syntax/Component-Definition.md](../../tasks/syntax/Component-Definition.md) |
| [[Architecture Section]] | 구조 설계 섹션 | structure-validator.ts:85 | ✅ Documented | [tasks/syntax/Architecture-Section.md](../../tasks/syntax/Architecture-Section.md) |
| [[Frontmatter Field]] | YAML 메타데이터 필드 | structure-validator.ts:45 | ✅ Documented | [tasks/syntax/Frontmatter-Field.md](../../tasks/syntax/Frontmatter-Field.md) |

---

## Term System

용어 정의 및 참조 시스템 관련 문법입니다.

| Term | Description | Parser | Status |
|------|-------------|--------|--------|
| [[Term Definition]] | 용어 정의 문법 | src/parsers/TermParser.ts:45 | ✅ Documented | [tasks/syntax/Term-Definition.md](../../tasks/syntax/Term-Definition.md) |
| [[Term Reference]] | 용어 참조 문법 | src/parsers/TermParser.ts:78 | ✅ Documented | (위와 동일) |
| [[Term Scope]] | 용어 범위 (global/local) | src/tools/term-registry.ts | 📝 Planned | - |

---

## Test References

테스트-문서 양방향 참조 시스템 관련 문법입니다.

| Term | Description | Parser | Status |
|------|-------------|--------|--------|
| [[Test Reference]] | 테스트 파일 참조 | src/tools/test-doc-lookup.ts:113 | ✅ Documented | [tasks/syntax/Test-Reference.md](../../tasks/syntax/Test-Reference.md) |
| [[JSDoc Annotation]] | @feature, @doc 어노테이션 | src/tools/test-doc-lookup.ts:152 | 📝 Planned | - |
| [[Test Coverage Field]] | test_coverage frontmatter | src/tools/test-doc-lookup.ts:135 | 📝 Planned | - |

---

## Code References

코드 참조 및 인터페이스 정의 관련 문법입니다.

| Term | Description | Parser | Status |
|------|-------------|--------|--------|
| [[Public Interface]] | 공개 인터페이스 정의 | src/tools/implementation-coverage.ts:320 | ✅ Documented | [tasks/syntax/Public-Interface.md](../../tasks/syntax/Public-Interface.md) |
| [[Entry Point]] | 진입점 정의 | src/tools/entry-point-detector.ts:45 | ✅ Documented | [tasks/syntax/Entry-Point.md](../../tasks/syntax/Entry-Point.md) |
| [[Code Reference]] | code_references 필드 | src/tools/implementation-coverage.ts:426 | 📝 Planned | - |

---

## Validation Syntax

검증 규칙 및 에러 메시지 관련 문법입니다.

| Term | Description | Parser | Status |
|------|-------------|--------|--------|
| [[Validation Rule]] | 검증 규칙 정의 | TBD | 📝 Planned |
| [[Error Message]] | 에러 메시지 형식 | TBD | 📝 Planned |
| [[Warning Message]] | 경고 메시지 형식 | TBD | 📝 Planned |

---

## Usage

### 1. 문법 용어 찾기

```bash
# 특정 용어의 상세 문서 보기
cat docs/syntax/terms/Component-Definition.md

# 용어 사용 예시 찾기
ls docs/syntax/examples/component-*.md
```

### 2. 문법 검증

```bash
# 특정 문법 용어 검증
edgedoc validate syntax --term "Component Definition"

# 모든 문법 용어 검증
edgedoc validate syntax --all
```

### 3. 프로젝트에서 사용처 찾기

```bash
# 특정 문법 용어가 사용된 곳 찾기
edgedoc syntax usage "Component Definition"

# 결과:
# Found in 4 features:
#   - 13_ValidateTerms.md:56
#   - 09_MultiLanguageParser.md:45
#   - 10_Internationalization.md:40
#   - 16_FeatureInfo.md:50
```

---

## Directory Structure

```
tasks/
  syntax/                             # Syntax term definitions (managed as features)
    Component-Definition.md           # [[Component Definition]] ✅
    Architecture-Section.md           # [[Architecture Section]] ✅
    Frontmatter-Field.md              # [[Frontmatter Field]] ✅
    Term-Definition.md                # [[Term Definition]] ✅
    Test-Reference.md                 # [[Test Reference]] ✅
    Public-Interface.md               # [[Public Interface]] ✅
    Entry-Point.md                    # [[Entry Point]] ✅

  features/
    19_SyntaxTermSystem.md            # Syntax management system

docs/syntax/
  INDEX.md                            # This file (auto-generated)
  examples/                           # Valid and invalid examples
    component-missing-path.md
    component-wrong-section.md
    ...

src/validators/                       # Validation logic (planned)
  component-validator.ts
  syntax-validator.ts
  ...
```

---

## Code-Document Mapping

각 문법 용어는 코드 구현과 1:1 매핑됩니다:

```
[[Component Definition]]
  ├─ Definition: tasks/syntax/Component-Definition.md
  ├─ Parser: src/tools/implementation-coverage.ts:extractDocumentedComponents()
  ├─ Validator: src/validators/component-validator.ts (planned)
  ├─ Examples: docs/syntax/examples/component-*.md
  └─ Usage: tasks/features/13_ValidateTerms.md:56

[[Test Reference]] (planned)
  ├─ Definition: tasks/syntax/Test-Reference.md (planned)
  ├─ Parser: src/tools/test-doc-lookup.ts:findTestsForFeature()
  ├─ Validator: src/validators/test-validator.ts (planned)
  ├─ Examples: docs/syntax/examples/test-*.md
  └─ Usage: tasks/features/17_TestDocLookup.md
```

---

## Adding New Syntax Terms

새로운 문법 용어를 추가하려면:

1. **용어 정의 문서 작성**: `tasks/syntax/Your-Term.md`
   ```yaml
   ---
   feature: "syntax:Your-Term"
   type: "syntax"
   status: "documented"
   parser: "path/to/parser.ts:functionName"
   validator: "src/validators/your-validator.ts"
   related_features:
     - "19_SyntaxTermSystem"
   examples:
     valid:
       - "path/to/example1.md"
     invalid:
       - "docs/syntax/examples/your-term-invalid.md"
   ---

   # [[Your Term]]

   **Type**: Syntax Category
   **Used By**: Feature name
   **Validated By**: functionName()

   ## 정의
   ...

   ## 문법 (Syntax)
   ...

   ## Parser Implementation
   ...

   ## Validation Rules
   ...
   ```

2. **예시 파일 작성**: `docs/syntax/examples/your-term-*.md`
   - Invalid examples (valid examples reference actual feature files)

3. **인덱스 재생성**: `edgedoc syntax index` (auto-updates this file)

4. **SYNTAX_GUIDE.md 업데이트**: 사용자 가이드에 섹션 추가

5. **관련 Feature 문서에서 참조**: `[[Your Term]]` 형식으로 참조

---

## Status Legend

- ✅ **Implemented**: 문법 정의 완료, parser 구현 완료
- 🚧 **In Progress**: 문법 정의 중 또는 parser 구현 중
- 📝 **Planned**: 계획됨, 아직 구현 안됨

---

## Related Documentation

- [SYNTAX_GUIDE.md](../SYNTAX_GUIDE.md) - 사용자용 문법 가이드
- [VALIDATION_GUIDE.md](../VALIDATION_GUIDE.md) - 검증 시스템 가이드
- [GLOSSARY.md](../GLOSSARY.md) - 용어집
- [Feature 18: Implementation Coverage](../../tasks/features/18_ImplementationCoverage.md)
- [Feature 13: Validate Terms](../../tasks/features/13_ValidateTerms.md)
