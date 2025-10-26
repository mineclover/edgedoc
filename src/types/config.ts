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
  tasks?: {
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
    sourceDir: 'tasks',
    targetDir: 'tasks-v2',
  },
  validation: {
    sharedTypes: {
      maxPairs: 12,
      warnAtPairs: 8,
    },
  },
  tasks: {
    baseDir: 'tasks',
    features: 'features',
    interfaces: 'interfaces',
    shared: 'shared',
  },
  terminology: {
    globalScopePaths: [
      'docs/terms/',         // Global term definitions
      'tasks/syntax/',       // Syntax term definitions
    ],
  },
};
