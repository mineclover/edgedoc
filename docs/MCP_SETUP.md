# MCP Server Setup Guide

edgedoc MCP 서버를 AI 에이전트에 연결하는 방법입니다.

## Claude Desktop 설정

Claude Desktop 설정 파일에 다음을 추가하세요:

**위치**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "edgedoc": {
      "command": "bun",
      "args": ["run", "/path/to/mdoc-tools/dist/index.js"],
      "env": {}
    }
  }
}
```

또는 전역 설치 시:

```json
{
  "mcpServers": {
    "edgedoc": {
      "command": "node",
      "args": ["/path/to/global/node_modules/edgedoc/dist/index.js"],
      "env": {}
    }
  }
}
```

## 제공되는 Tools

### Validation Tools

#### `validate_migration`
tasks/ → tasks-v2/ 마이그레이션 검증

```json
{
  "name": "validate_migration",
  "arguments": {
    "projectPath": "/path/to/project",
    "markdown": true
  }
}
```

#### `validate_naming`
인터페이스/공용 타입 네이밍 컨벤션 검증

#### `validate_orphans`
고아 파일 검증 (문서화되지 않은 파일)

#### `validate_structure`
문서 구조 검증 (순환 의존성, frontmatter)

#### `validate_terms`
용어 정의 및 참조 일관성 검증

#### `validate_all`
전체 검증 한번에 실행

### Reference Graph Tools

#### `graph_build`
참조 인덱스 생성

```json
{
  "name": "graph_build",
  "arguments": {
    "projectPath": "/path/to/project",
    "verbose": true
  }
}
```

#### `graph_query`
참조 그래프 조회

```json
{
  "name": "graph_query",
  "arguments": {
    "featureId": "validate-terms"
  }
}
```

역방향 조회:
```json
{
  "name": "graph_query",
  "arguments": {
    "codeFile": "src/tools/validate-terms.ts"
  }
}
```

용어 조회:
```json
{
  "name": "graph_query",
  "arguments": {
    "term": "Entry Point Module"
  }
}
```

### Term Tools

#### `list_terms`
정의된 모든 용어 목록

#### `find_term`
용어 검색

```json
{
  "name": "find_term",
  "arguments": {
    "query": "entry"
  }
}
```

### Sync Tools

#### `sync_code_refs`
코드 참조 동기화 (개발 중)

## 제공되는 Resources

### Static Documentation

#### `mdoc://docs/workflows`
edgedoc 사용 워크플로우 가이드

#### `mdoc://docs/syntax-guide`
문서 작성 문법 가이드 (feature 문서, frontmatter, 참조 시스템)

#### `mdoc://docs/glossary`
전체 용어 사전

#### `mdoc://docs/shared-types`
공유 타입 네이밍 컨벤션

#### `mdoc://docs/agent-instructions`
AI 에이전트 사용 지침

#### `mdoc://llms.txt`
LLM 최적화된 빠른 참조

### Dynamic Project Resources

프로젝트에 `.edgedoc/references.json`이 있을 때만 제공됩니다.
(`edgedoc graph build` 실행 후)

#### `mdoc://project/reference-index`
전체 참조 인덱스 (JSON)

```json
{
  "version": "1.0",
  "generated": "2025-10-24T...",
  "features": { ... },
  "code": { ... },
  "interfaces": { ... },
  "terms": { ... }
}
```

#### `mdoc://project/features`
Feature 목록 및 요약

```json
{
  "total": 17,
  "features": [
    {
      "id": "validate-terms",
      "file": "tasks/features/13_ValidateTerms.md",
      "code_files": 2,
      "related_features": 1,
      "interfaces": 0,
      "terms": 5
    }
  ]
}
```

#### `mdoc://project/terms`
용어 정의 및 사용 통계

```json
{
  "total": 24,
  "terms": [
    {
      "term": "Entry Point Module",
      "definition": {
        "file": "docs/GLOSSARY.md",
        "line": 11,
        "scope": "global"
      },
      "usage_count": 10,
      "references_count": 10
    }
  ]
}
```

#### `mdoc://project/stats`
프로젝트 통계 개요

```json
{
  "version": "1.0",
  "generated": "2025-10-24T...",
  "stats": {
    "features": 17,
    "code_files": 31,
    "interfaces": 7,
    "terms": 24,
    "total_references": 136
  },
  "top_terms": [
    { "term": "Code Interface", "usage_count": 11 },
    { "term": "Entry Point Module", "usage_count": 10 }
  ]
}
```

#### `mdoc://project/feature/{feature-id}`
특정 feature 상세 정보

예시: `mdoc://project/feature/validate-terms`

```json
{
  "id": "validate-terms",
  "file": "tasks/features/13_ValidateTerms.md",
  "code": {
    "uses": ["src/tools/validate-terms.ts"],
    "used_by": []
  },
  "features": {
    "related": ["validate-structure"],
    "depends_on": [],
    "used_by": []
  },
  "terms": {
    "defines": [],
    "uses": ["Validation", "Term Definition"]
  }
}
```

#### `mdoc://project/term/{term-name}`
특정 용어 상세 정보

예시: `mdoc://project/term/Entry%20Point%20Module`

```json
{
  "term": "Entry Point Module",
  "definition": {
    "file": "docs/GLOSSARY.md",
    "line": 11,
    "scope": "global"
  },
  "references": [
    {
      "file": "docs/GLOSSARY.md",
      "line": 67,
      "context": "**Related**: [[Entry Point Module]], [[Public API]]"
    }
  ],
  "usage_count": 10
}
```

#### `mdoc://project/code/{file-path}`
특정 코드 파일 참조 정보 (역방향 조회)

예시: `mdoc://project/code/src%2Ftools%2Fvalidate-terms.ts`

```json
{
  "file": "src/tools/validate-terms.ts",
  "type": "source",
  "documented_in": ["validate-terms"],
  "imports": [],
  "imported_by": []
}
```

## 사용 예시

### AI 에이전트가 프로젝트 이해하기

1. **문법 가이드 읽기**
   ```
   Read resource: mdoc://docs/syntax-guide
   ```

2. **프로젝트 통계 확인**
   ```
   Read resource: mdoc://project/stats
   ```

3. **Feature 목록 보기**
   ```
   Read resource: mdoc://project/features
   ```

4. **특정 Feature 상세**
   ```
   Read resource: mdoc://project/feature/validate-terms
   ```

### 코드 파일의 문서 찾기

```
Read resource: mdoc://project/code/src%2Ftools%2Fvalidate-terms.ts
```

→ `documented_in: ["validate-terms"]` 확인
→ `Read resource: mdoc://project/feature/validate-terms`

### 용어 검색 및 정의 확인

1. **검색**
   ```json
   {
     "name": "find_term",
     "arguments": { "query": "entry" }
   }
   ```

2. **상세 정보**
   ```
   Read resource: mdoc://project/term/Entry%20Point%20Module
   ```

## 테스트

MCP 서버가 제대로 동작하는지 확인:

```bash
# 빌드
bun run build:mcp

# 로컬 테스트 (Claude Desktop 재시작 필요)
# 1. Claude Desktop 종료
# 2. config 파일 수정
# 3. Claude Desktop 시작
# 4. Tools/Resources 확인
```

## 트러블슈팅

### "Reference index not found" 에러

`.edgedoc/references.json`이 없습니다. 먼저 빌드하세요:

```bash
edgedoc graph build
```

### Tools가 보이지 않음

1. Claude Desktop 완전히 종료
2. config 파일 확인
3. 경로가 절대 경로인지 확인
4. Claude Desktop 재시작

### Resource 읽기 실패

- Static resources: edgedoc 패키지 경로 확인
- Project resources: `.edgedoc/references.json` 존재 확인
- URI 인코딩 확인 (공백은 `%20`)

## 개발

새로운 tool/resource 추가:

1. `src/index.ts`에 tool schema 추가
2. `CallToolRequestSchema` 핸들러에 케이스 추가
3. `ListResourcesRequestSchema`에 리소스 추가
4. `ReadResourceRequestSchema`에 리소스 읽기 로직 추가
5. `bun run build:mcp`로 빌드

모든 tool은 CLI 명령어를 프록시합니다:
```typescript
const result = await executeMdocCommand(['graph', 'build', '--verbose']);
```
