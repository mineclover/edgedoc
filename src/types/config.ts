import { z } from 'zod';

/**
 * Zod 스키마를 사용한 설정 검증
 *
 * 이를 통해:
 * 1. 설정 타입이 자동으로 유추됨
 * 2. 런타임에 자동으로 검증됨
 * 3. 오류 메시지가 명확함
 */

const LanguageSchema = z.enum(['en', 'ko']).describe('Language');

const MigrationConfigSchema = z.object({
  sourceDir: z.string().describe('Source directory for migration'),
  targetDir: z.string().describe('Target directory for migration'),
  description: z.string().optional().describe('Migration description'),
}).partial();

const ValidationConfigSchema = z.object({
  sharedTypes: z.object({
    maxPairs: z.number().optional().describe('Maximum pairs allowed'),
    warnAtPairs: z.number().optional().describe('Warning threshold for pairs'),
    description: z.string().optional().describe('Validation description'),
  }).optional(),
}).partial();

const DocsConfigSchema = z.object({
  baseDir: z.string().optional().describe('Base directory for docs'),
  features: z.string().optional().describe('Features directory'),
  interfaces: z.string().optional().describe('Interfaces directory'),
  shared: z.string().optional().describe('Shared types directory'),
}).partial();

const TerminologyConfigSchema = z.object({
  globalScopePaths: z.array(z.string()).optional().describe('Paths where term definitions are global scope'),
  description: z.string().optional().describe('Terminology description'),
}).partial();

/**
 * 최상위 설정 스키마
 */
export const MdocConfigSchema = z.object({
  language: LanguageSchema.optional(),
  migration: MigrationConfigSchema.optional(),
  validation: ValidationConfigSchema.optional(),
  docs: DocsConfigSchema.optional(),
  terminology: TerminologyConfigSchema.optional(),
}).strict().optional().transform(v => v || {});

export type MdocConfig = z.infer<typeof MdocConfigSchema>;

// 부분 설정 (사용자 입력)
export type PartialMdocConfig = z.input<typeof MdocConfigSchema>;

/**
 * 설정 검증
 */
export function validateConfig(config: unknown): MdocConfig {
  return MdocConfigSchema.parse(config);
}

/**
 * 설정 검증 (오류 수집)
 */
export function validateConfigSafe(config: unknown): {
  success: boolean;
  data?: MdocConfig;
  errors?: z.ZodError['errors'];
} {
  const result = MdocConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
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
