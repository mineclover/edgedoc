import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MdocConfig } from '../types/config.js';
import { DEFAULT_CONFIG, validateConfigSafe, MdocConfigSchema } from '../types/config.js';
import { setLanguage } from '../shared/i18n.js';
import { EdgeDocError, ErrorCode, ErrorSeverity } from '../errors/index.js';

/**
 * Load mdoc configuration from mdoc.config.json
 * Falls back to default config if file doesn't exist
 */
export function loadConfig(projectPath: string): MdocConfig {
  const configPath = join(projectPath, 'mdoc.config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new EdgeDocError(
      ErrorCode.CONFIG_NOT_FOUND,
      `Configuration file not found or cannot be read: ${configPath}`,
      ErrorSeverity.ERROR,
      {
        file: configPath,
        suggestion: `Create mdoc.config.json in ${projectPath} or run: edgedoc init`,
      }
    );
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(rawContent);
  } catch (error) {
    throw new EdgeDocError(
      ErrorCode.CONFIG_INVALID,
      `Invalid JSON in configuration file`,
      ErrorSeverity.ERROR,
      {
        file: configPath,
        suggestion: 'Check JSON syntax (use jsonlint or JSON formatter)',
      }
    );
  }

  // Zod 검증
  const validationResult = validateConfigSafe(parsedConfig);
  if (!validationResult.success) {
    const errorDetails = validationResult.errors
      ?.map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n') || 'Unknown validation error';

    throw new EdgeDocError(
      ErrorCode.CONFIG_SCHEMA_VIOLATION,
      `Configuration validation failed:\n${errorDetails}`,
      ErrorSeverity.ERROR,
      {
        file: configPath,
        suggestion: 'Run: edgedoc init --help for valid configuration options',
      }
    );
  }

  const config = validationResult.data!;

  // Deep merge with defaults for backwards compatibility
  const mergedConfig: MdocConfig = {
    language: config.language || DEFAULT_CONFIG.language,
    ...(config.migration && {
      migration: {
        ...DEFAULT_CONFIG.migration,
        ...config.migration,
      },
    }),
    ...(config.validation && {
      validation: {
        sharedTypes: {
          ...DEFAULT_CONFIG.validation?.sharedTypes,
          ...config.validation.sharedTypes,
        },
      },
    }),
    ...(config.docs && {
      docs: {
        ...DEFAULT_CONFIG.docs,
        ...config.docs,
      },
    }),
    ...(config.terminology && {
      terminology: {
        ...DEFAULT_CONFIG.terminology,
        ...config.terminology,
      },
    }),
  };

  // Set global language
  if (mergedConfig.language) {
    setLanguage(mergedConfig.language);
  }

  return mergedConfig;
}

/**
 * 기본 설정 반환 (설정 파일 없을 때)
 */
export function getDefaultConfig(): MdocConfig {
  return DEFAULT_CONFIG;
}
