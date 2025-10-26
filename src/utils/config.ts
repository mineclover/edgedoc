import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MdocConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { setLanguage } from '../shared/i18n.js';

/**
 * Load mdoc configuration from mdoc.config.json
 * Falls back to default config if file doesn't exist
 */
export function loadConfig(projectPath: string): MdocConfig {
  const configPath = join(projectPath, 'mdoc.config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<MdocConfig>;

    // Deep merge with defaults
    const config: MdocConfig = {
      language: userConfig.language || DEFAULT_CONFIG.language,
      migration: {
        ...DEFAULT_CONFIG.migration,
        ...userConfig.migration,
      },
      validation: {
        sharedTypes: {
          ...DEFAULT_CONFIG.validation?.sharedTypes,
          ...userConfig.validation?.sharedTypes,
        },
      },
      tasks: {
        ...DEFAULT_CONFIG.tasks,
        ...userConfig.tasks,
      },
      terminology: {
        ...DEFAULT_CONFIG.terminology,
        ...userConfig.terminology,
      },
    };

    // Set global language
    if (config.language) {
      setLanguage(config.language);
    }

    return config;
  } catch (error) {
    console.warn(`⚠️  Failed to parse mdoc.config.json: ${error}`);
    console.warn('📝 Using default configuration');
    return DEFAULT_CONFIG;
  }
}
