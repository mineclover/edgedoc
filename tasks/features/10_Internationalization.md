---
type: feature
status: active
feature: internationalization
priority: medium
entry_point: "src/shared/i18n.ts"
related_features:
  - 07_Sync
  - 08_Config
code_references:
  - "src/shared/i18n.ts"
---

# Internationalization (i18n)

## Purpose

Multi-language message system for CLI output. English is the default language, with Korean available as an optional configuration.

## Architecture

### Message System

**File**: `src/shared/i18n.ts`

**Supported Languages**:
- `en` - English (default)
- `ko` - Korean (optional)

### Message Structure

```typescript
interface Messages {
  sync: {
    starting: string;
    projectPath: string;
    scanningFiles: string;
    // ... more sync messages
  };
  validation: {
    // ... validation messages
  };
  orphans: {
    // ... orphan detection messages
  };
  common: {
    // ... common status messages
  };
}
```

## Configuration

### mdoc.config.json

```json
{
  "language": "ko"  // or "en" (default)
}
```

**Default Behavior**: If no config file exists or `language` is not specified, English is used.

### Implementation

**File**: `src/utils/config.ts`

```typescript
import { setLanguage } from '../shared/i18n.js';

export function loadConfig(projectPath: string): MdocConfig {
  const config = // ... load from mdoc.config.json

  if (config.language) {
    setLanguage(config.language);  // Set global language
  }

  return config;
}
```

## Usage Pattern

### In Tool Files

```typescript
import { t } from '../shared/i18n.js';
import { loadConfig } from '../utils/config.js';

export async function myTool(options = {}) {
  const projectDir = options.projectPath || process.cwd();

  // Load config to set language
  loadConfig(projectDir);
  const msg = t();

  // Use localized messages
  console.log(msg.sync.starting);
  console.log(`${msg.sync.projectPath}: ${projectDir}`);
}
```

## Current Implementation Status

### Fully Translated
- ✅ `src/tools/sync.ts` - All console output messages

### Infrastructure Only
- ⏳ `src/tools/orphans.ts` - Messages defined but not applied
- ⏳ `src/tools/validate.ts` - Messages defined but not applied
- ⏳ `src/tools/naming.ts` - Messages defined but not applied
- ⏳ `src/tools/structure.ts` - Messages defined but not applied
- ⏳ `src/tools/spec-orphans.ts` - Messages defined but not applied

**Note**: All message translations are available in `i18n.ts`. Other tools can be updated to use them by following the sync command pattern.

## Message Categories

### sync.*
Code reference synchronization messages:
- `starting`, `projectPath`, `scanningFiles`, `analyzingCode`
- `buildingGraph`, `parsingDocs`, `updatingDocs`
- `filesFound`, `filesAnalyzed`, `dependenciesTracked`

### validation.*
Validation system messages:
- `migrationStart`, `namingStart`, `structureStart`
- `allValidations`, `migrationSkip`, `passed`, `failed`

### orphans.*
Orphan file detection messages:
- `starting`, `extractingRefs`, `scanningFiles`
- `buildingGraph`, `searching`, `result`

### common.*
Common status messages:
- `success`, `warning`, `error`, `info`
- `total`, `found`, `none`

## Testing

### English (Default)
```bash
bun src/cli.ts sync
# Output: "🔄 Starting code reference synchronization..."
```

### Korean (Config)
```bash
# Create mdoc.config.json: {"language": "ko"}
bun src/cli.ts sync
# Output: "🔄 코드 참조 동기화 시작..."
```

## Extending to Other Commands

To add i18n to a command:

1. Import i18n and config utilities
2. Call `loadConfig(projectDir)` at function start
3. Get messages with `const msg = t()`
4. Replace hardcoded strings with `msg.category.key`

See `docs/I18N_IMPLEMENTATION_STATUS.md` for detailed pattern.

## Future Languages

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

## Benefits

1. **International Friendly**: English default for global users
2. **Optional Localization**: Users can opt-in to their language
3. **Maintainable**: All messages centralized in one file
4. **Type-Safe**: TypeScript ensures message keys exist
5. **Extensible**: Easy to add more languages
6. **No Runtime Overhead**: Simple object lookup

## Documentation

- `docs/I18N_IMPLEMENTATION_STATUS.md` - Implementation patterns and status
- `IMPLEMENTATION_SUMMARY.md` - Complete feature overview
