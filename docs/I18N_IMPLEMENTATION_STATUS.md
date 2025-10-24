# Internationalization (i18n) Implementation Status

## ✅ Completed

### 1. Core Infrastructure
- ✅ Created `src/shared/i18n.ts` with full message translations
- ✅ Added `language` option to `MdocConfig` type
- ✅ Updated `loadConfig()` to automatically set language from config
- ✅ Default language: `en` (English)
- ✅ Optional language: `ko` (Korean)

### 2. Configuration
Users can now set language in `mdoc.config.json`:

```json
{
  "language": "ko"
}
```

Or leave it unset for English (default):

```json
{
  // language defaults to "en"
}
```

### 3. Message System
The `t()` function returns localized messages:

```typescript
import { t } from '../shared/i18n.js';

const msg = t();
console.log(msg.sync.starting);  // "🔄 Starting code reference synchronization..." (en)
// or "🔄 코드 참조 동기화 시작..." (ko)
```

### 4. Partial Implementation
- ✅ `src/tools/sync.ts` - Main console output messages updated (lines 265-293)
- ⏳ Other files need similar updates (see below)

## 🔄 Files Needing i18n Updates

Apply the same pattern to these files:

### Priority 1 (User-facing output)
1. **src/tools/sync.ts** (Partially done)
   - Need to update remaining console.log statements
   - Update success/error messages at end of function

2. **src/tools/orphans.ts**
   - Import: `import { t } from '../shared/i18n.js';`
   - Import: `import { loadConfig } from '../utils/config.js';`
   - Add at function start: `loadConfig(projectDir); const msg = t();`
   - Replace all Korean console.log with `msg.orphans.*`

3. **src/tools/structure.ts**
   - Import i18n and config
   - Replace console.log messages with `msg.validation.*`

4. **src/tools/validate.ts**
   - Update migration validation messages
   - Update success/error summaries

5. **src/tools/naming.ts**
   - Update validation output messages

6. **src/tools/spec-orphans.ts**
   - Update console output messages

### Priority 2 (Less frequent output)
7. **src/tools/init.ts** - Initialization messages
8. **src/cli.ts** - Help text and command descriptions

## 📝 Implementation Pattern

For each file:

```typescript
// 1. Add imports
import { t } from '../shared/i18n.js';
import { loadConfig } from '../utils/config.js';

// 2. Load config at function start
export async function myFunction(options = {}) {
  const projectDir = options.projectPath || process.cwd();

  // Load config to set language
  loadConfig(projectDir);
  const msg = t();

  // 3. Replace hardcoded strings
  console.log(msg.category.message);
  // Instead of: console.log('하드코딩된 메시지');
}
```

## 🧪 Testing

Test with English (default):
```bash
bun src/cli.ts sync
# Output: "🔄 Starting code reference synchronization..."
```

Test with Korean:
```bash
# Create mdoc.config.json with: {"language": "ko"}
bun src/cli.ts sync
# Output: "🔄 코드 참조 동기화 시작..."
```

## 📋 Message Categories in i18n.ts

All message keys are organized into:

- `msg.sync.*` - Sync command messages
- `msg.validation.*` - Validation messages
- `msg.orphans.*` - Orphan detection messages
- `msg.common.*` - Common status messages

## 🎯 Next Steps

1. Complete i18n for remaining files (use the pattern above)
2. Test all commands with both languages
3. Update README with language configuration docs
4. Consider adding language flag: `--lang en` or `--lang ko` (optional override)

## 📚 Example: Complete Function

```typescript
// src/tools/orphans.ts
import { t } from '../shared/i18n.js';
import { loadConfig } from '../utils/config.js';

export async function validateOrphans(options = {}) {
  const projectDir = options.projectPath || process.cwd();

  loadConfig(projectDir);
  const msg = t();

  console.log(`${msg.orphans.starting}\n`);
  console.log(`${msg.orphans.projectPath}: ${projectDir}\n`);

  console.log(msg.orphans.extractingRefs);
  const referenced = extractReferencedFiles(tasksDir);
  console.log(`   → ${referenced.size} ${msg.orphans.refsExtracted}\n`);

  console.log(msg.orphans.scanningFiles);
  const allFiles = collectSourceFiles(projectDir, projectDir, options);
  console.log(`   → ${allFiles.length} ${msg.orphans.filesFound}\n`);

  // ... rest of function

  console.log(`\n${msg.orphans.result}\n`);
  console.log(`${msg.orphans.totalFiles}: ${allFiles.length}`);
  console.log(`${msg.orphans.referenced}: ${referenced.size}`);
  console.log(`${msg.orphans.orphanFiles}: ${orphans.length}\n`);

  if (orphans.length > 0) {
    console.log(`${msg.orphans.hints}:`);
    console.log(`  - ${msg.orphans.addToTasks}`);
    console.log(`  - ${msg.orphans.deleteUnused}`);
    console.log(`  - ${msg.orphans.importedOk}`);
  }
}
```

## ✨ Benefits

1. **Default English**: International users get English by default
2. **Optional Korean**: Korean users can opt-in via config
3. **Maintainable**: All messages in one place (i18n.ts)
4. **Type-safe**: TypeScript ensures message keys exist
5. **Extensible**: Easy to add more languages later

## 🌐 Future Languages

To add more languages (e.g., Japanese, Chinese):

```typescript
// src/shared/i18n.ts
export type Language = 'en' | 'ko' | 'ja' | 'zh';

const JA_MESSAGES: Messages = {
  // Japanese translations
};

export function t(): Messages {
  switch (currentLanguage) {
    case 'ko': return KO_MESSAGES;
    case 'ja': return JA_MESSAGES;
    default: return EN_MESSAGES;
  }
}
```
