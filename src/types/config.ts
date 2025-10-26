export interface MdocConfig {
  language?: 'en' | 'ko';  // Default: 'en'
  migration?: {
    sourceDir: string;
    targetDir: string;
    description?: string;
  };
  validation?: {
    sharedTypes?: {
      maxPairs: number;
      warnAtPairs: number;
      description?: string;
    };
  };
  docs?: {
    baseDir: string;
    features: string;
    interfaces: string;
    shared: string;
  };
  terminology?: {
    globalScopePaths?: string[];  // Paths where term definitions are global scope
    description?: string;
  };
}

export const DEFAULT_CONFIG: MdocConfig = {
  language: 'en',
  migration: {
    sourceDir: 'edgedoc',
    targetDir: 'edgedoc-v2',
  },
  validation: {
    sharedTypes: {
      maxPairs: 12,
      warnAtPairs: 8,
    },
  },
  docs: {
    baseDir: 'edgedoc',
    features: 'features',
    interfaces: 'interfaces',
    shared: 'shared',
  },
  terminology: {
    globalScopePaths: [
      'docs/GLOSSARY.md',    // Global term definitions
      'docs/terms/',         // Term definitions directory
    ],
  },
};

/**
 * Get documentation directory paths from config
 */
export function getDocsPath(config: MdocConfig, type: 'base' | 'features' | 'interfaces' | 'shared' = 'base'): string {
  const docs = config.docs || DEFAULT_CONFIG.docs!;
  switch (type) {
    case 'features':
      return `${docs.baseDir}/${docs.features}`;
    case 'interfaces':
      return `${docs.baseDir}/${docs.interfaces}`;
    case 'shared':
      return `${docs.baseDir}/${docs.shared}`;
    case 'base':
    default:
      return docs.baseDir;
  }
}
