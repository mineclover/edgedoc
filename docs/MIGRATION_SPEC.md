# 점진적 마이그레이션 검증 스펙

## 목적
`tasks/` → `tasks-v2/` 구조 개편 시 점진적 마이그레이션 지원

## 원칙

### SSOT (Single Source of Truth)
- **정의는 단일 원천이어야 함**
- tasks에 있는 내용이 tasks-v2에서 누락되면 **에러**
- tasks-v2에만 있는 새 내용은 **허용**

### 검증 규칙

```bash
# ✅ 허용: tasks-v2에 모든 내용 존재
tasks/features/03_Canvas.md      → tasks-v2/features/04_Canvas.md
(모든 섹션 포함)

# ✅ 허용: tasks-v2에 추가 내용
tasks/features/03_Canvas.md      → tasks-v2/features/04_Canvas.md
                                     (기존 내용 + 새 섹션)

# ❌ 에러: 섹션 누락
tasks/features/03_Canvas.md      → tasks-v2/features/04_Canvas.md
(## 타입 정의 섹션 있음)           (## 타입 정의 섹션 없음)

# ❌ 에러: 파일 누락
tasks/features/03_Canvas.md      → tasks-v2/features/ (파일 없음)
```

## 검증 단위

### 1. 파일 레벨
- tasks의 모든 feature 문서가 tasks-v2에 존재해야 함
- 파일명은 변경 가능 (매핑 테이블 사용)

### 2. 섹션 레벨
- tasks의 모든 `##` 섹션이 tasks-v2에 존재해야 함
- 섹션 내용은 확장 가능 (기존 내용 포함 필수)

### 3. 타입 정의 레벨
- tasks의 모든 `interface`, `type`, `class` 정의가 tasks-v2에 존재
- 필드 추가 가능, 필드 제거 불가

## 매핑 테이블

```yaml
# tasks-v2/MIGRATION_MAP.yml
features:
  "03_Canvas.md": "04_Canvas.md"
  "04_LayerPanel.md": "06_LayerPanel.md"
  "06_CanvasData.md": "05_CanvasData.md"
  # ... 나머지 매핑

interfaces:
  "03--04.md": "04--06.md"
  "03--06.md": "04--05.md"
  # ... 인터페이스 매핑
```

## 검증 알고리즘

### 섹션 검증
```python
def validate_sections(old_file: Path, new_file: Path) -> List[Error]:
    old_sections = extract_sections(old_file)  # ['## 목적', '## 책임', ...]
    new_sections = extract_sections(new_file)

    errors = []
    for section in old_sections:
        if section not in new_sections:
            errors.append(f"Missing section: {section}")

    return errors
```

### 타입 검증
```python
def validate_types(old_file: Path, new_file: Path) -> List[Error]:
    old_types = extract_type_definitions(old_file)
    new_types = extract_type_definitions(new_file)

    errors = []
    for type_name in old_types:
        if type_name not in new_types:
            errors.append(f"Missing type: {type_name}")
        else:
            # 필드 검증
            old_fields = old_types[type_name].fields
            new_fields = new_types[type_name].fields

            for field in old_fields:
                if field not in new_fields:
                    errors.append(f"Missing field: {type_name}.{field}")

    return errors
```

## 테스트 시나리오

### Test 1: 섹션 삭제 감지
```bash
# tasks/features/03_Canvas.md
## 목적
## 책임
## 타입 정의

# tasks-v2/features/04_Canvas.md
## 목적
## 책임
# (타입 정의 삭제)

# 예상 결과
❌ Missing section: ## 타입 정의
```

### Test 2: 필드 삭제 감지
```typescript
// tasks/features/03_Canvas.md
interface CanvasProps {
  width: number;
  height: number;
  zoom: number;
}

// tasks-v2/features/04_Canvas.md
interface CanvasProps {
  width: number;
  height: number;
  // zoom 삭제
}

// 예상 결과
❌ Missing field: CanvasProps.zoom
```

### Test 3: 추가는 허용
```bash
# tasks/features/03_Canvas.md
## 목적
## 책임

# tasks-v2/features/04_Canvas.md
## 목적
## 책임
## 구현 상태  ← 새 섹션

# 예상 결과
✅ 통과
```

## 구현 도구

### validate-migration.sh
```bash
#!/bin/bash
# tasks → tasks-v2 마이그레이션 검증

TASKS_DIR="tasks"
TASKS_V2_DIR="tasks-v2"
MAPPING_FILE="$TASKS_V2_DIR/MIGRATION_MAP.yml"

if [ ! -d "$TASKS_V2_DIR" ]; then
  echo "⚠️  tasks-v2/ 없음 - 마이그레이션 대상 없음"
  exit 0
fi

python3 tasks/tools/validate-migration.py \
  --old "$TASKS_DIR" \
  --new "$TASKS_V2_DIR" \
  --mapping "$MAPPING_FILE"
```

### validate-migration.py
```python
#!/usr/bin/env python3
"""
점진적 마이그레이션 검증 도구
tasks/ → tasks-v2/ 내용 무결성 검증
"""

import re
import yaml
from pathlib import Path
from typing import List, Dict, Set

def extract_sections(file: Path) -> List[str]:
    """## 섹션 추출"""
    content = file.read_text(encoding='utf-8')
    return re.findall(r'^## .+$', content, re.MULTILINE)

def extract_type_names(file: Path) -> Set[str]:
    """interface/type/class 이름 추출"""
    content = file.read_text(encoding='utf-8')
    types = set()

    # interface Name
    types.update(re.findall(r'^interface\s+(\w+)', content, re.MULTILINE))

    # type Name =
    types.update(re.findall(r'^type\s+(\w+)\s*=', content, re.MULTILINE))

    # class Name
    types.update(re.findall(r'^class\s+(\w+)', content, re.MULTILINE))

    return types

def validate_file(
    old_file: Path,
    new_file: Path
) -> tuple[List[str], List[str]]:
    """
    파일 마이그레이션 검증
    Returns: (section_errors, type_errors)
    """
    section_errors = []
    type_errors = []

    # 섹션 검증
    old_sections = extract_sections(old_file)
    new_sections = extract_sections(new_file)

    for section in old_sections:
        if section not in new_sections:
            section_errors.append(f"Missing section: {section}")

    # 타입 검증
    old_types = extract_type_names(old_file)
    new_types = extract_type_names(new_file)

    for type_name in old_types:
        if type_name not in new_types:
            type_errors.append(f"Missing type: {type_name}")

    return section_errors, type_errors

def main():
    print("🔄 마이그레이션 검증 시작...\n")

    tasks_dir = Path("tasks")
    tasks_v2_dir = Path("tasks-v2")
    mapping_file = tasks_v2_dir / "MIGRATION_MAP.yml"

    if not tasks_v2_dir.exists():
        print("⚠️  tasks-v2/ 없음 - 검증 스킵")
        return 0

    # 매핑 로드
    if mapping_file.exists():
        mapping = yaml.safe_load(mapping_file.read_text())
    else:
        print("⚠️  MIGRATION_MAP.yml 없음 - 1:1 매핑 가정")
        mapping = {"features": {}, "interfaces": {}}

    total_errors = 0

    # Feature 문서 검증
    for old_file in (tasks_dir / "features").glob("*.md"):
        old_name = old_file.name
        new_name = mapping.get("features", {}).get(old_name, old_name)
        new_file = tasks_v2_dir / "features" / new_name

        print(f"📄 {old_name} → {new_name}")

        if not new_file.exists():
            print(f"  ❌ 파일 누락: {new_name}")
            total_errors += 1
            continue

        section_errors, type_errors = validate_file(old_file, new_file)

        if section_errors:
            print(f"  ❌ 섹션 누락:")
            for err in section_errors:
                print(f"    - {err}")
            total_errors += len(section_errors)

        if type_errors:
            print(f"  ❌ 타입 누락:")
            for err in type_errors:
                print(f"    - {err}")
            total_errors += len(type_errors)

        if not section_errors and not type_errors:
            print(f"  ✅ 통과")

    print("\n" + "━" * 40)
    if total_errors == 0:
        print("✅ 마이그레이션 검증 통과")
        return 0
    else:
        print(f"❌ {total_errors}개 오류 발견")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
```

## 워크플로우

### 1. 준비
```bash
# tasks-v2/ 생성
mkdir -p tasks-v2/{features,interfaces,shared}

# 매핑 테이블 작성
vim tasks-v2/MIGRATION_MAP.yml
```

### 2. 점진적 마이그레이션
```bash
# 하나씩 이동
cp tasks/features/03_Canvas.md tasks-v2/features/04_Canvas.md
vim tasks-v2/features/04_Canvas.md  # 편집

# 검증
npm run validate:migration

# 통과하면 다음 파일
```

### 3. 완료 후
```bash
# 모든 파일 마이그레이션 완료
rm -rf tasks/
mv tasks-v2/ tasks/
```

## npm 스크립트

```json
{
  "validate:migration": "bash tasks/tools/validate-migration.sh"
}
```

## 제약사항

### 감지 가능
- ✅ 섹션 삭제
- ✅ 타입 정의 삭제
- ✅ 파일 누락

### 감지 불가
- ❌ 섹션 내용 변경 (문맥 분석 불가)
- ❌ 타입 필드 타입 변경 (간단한 정규식으로는 한계)
- ❌ 로직 변경

### 수동 확인 필요
- 섹션 내용의 의미적 동등성
- 타입 필드의 호환성
- 코드 참조 링크 유효성

## 예시

### 섹션 단위 삭제 테스트
```bash
# 1. tasks-v2/ 생성
mkdir -p tasks-v2/features
cp tasks/features/03_Canvas.md tasks-v2/features/03_Canvas.md

# 2. 섹션 삭제
vim tasks-v2/features/03_Canvas.md
# (## 타입 정의 섹션 삭제)

# 3. 검증
python3 tasks/tools/validate-migration.py

# 예상 출력:
# 📄 03_Canvas.md → 03_Canvas.md
#   ❌ 섹션 누락:
#     - Missing section: ## 타입 정의
# ❌ 1개 오류 발견
```

---

**작성일**: 2025-10-23
**버전**: 1.0
**상태**: 스펙 정의 완료
