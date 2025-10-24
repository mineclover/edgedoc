export interface ValidationResult {
  success: boolean;
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  totalErrors: number;
  details: ValidationDetails;
}

export interface ValidationDetails {
  [category: string]: FileResult[];
}

export interface FileResult {
  filename: string;
  missing: boolean;
  sectionErrors: string[];
  typeErrors: string[];
}

export interface ValidationOptions {
  projectPath?: string;
  markdown?: boolean;
}

export interface SyncResult {
  success: boolean;
  totalBlocks: number;
  updatedBlocks: number;
  failedBlocks: number;
}

export interface SyncOptions {
  projectPath?: string;
  dryRun?: boolean;
}

export interface NamingValidationResult {
  success: boolean;
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  totalErrors: number;
  totalWarnings: number;
  errors: NamingError[];
  warnings: NamingWarning[];
}

export interface NamingError {
  file: string;
  type: 'format' | 'sorting' | 'duplicate' | 'frontmatter' | 'reference';
  message: string;
}

export interface NamingWarning {
  file: string;
  type: 'sorting' | 'style';
  message: string;
}

export interface NamingOptions {
  projectPath?: string;
}

export interface OrphanFilesResult {
  success: boolean;
  totalFiles: number;
  referencedFiles: number;
  orphanFiles: number;
  orphans: OrphanFile[];
}

export interface OrphanFile {
  path: string;
  type: 'source' | 'config' | 'other';
  size: number;
  isImportedByCode: boolean;
}

export interface OrphanOptions {
  projectPath?: string;
  includeNodeModules?: boolean;
  includeDist?: boolean;
}
