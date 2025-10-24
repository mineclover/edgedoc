/**
 * Terminology system type definitions
 */

export type TermType = 'concept' | 'entity' | 'process' | 'attribute' | 'abbreviation';

export type TermScope = 'global' | 'document';

/**
 * Term definition parsed from glossary
 */
export interface TermDefinition {
  term: string; // Canonical term name
  file: string; // File where defined
  line: number; // Line number
  heading: string; // Full heading text
  scope: TermScope;

  // Metadata (parsed from content below heading)
  type?: TermType;
  aliases?: string[];
  related?: string[];
  notToConfuse?: string;
  parent?: string;
  definition?: string; // First paragraph after heading
}

/**
 * Term reference in document
 */
export interface TermReference {
  term: string; // Term name
  file: string; // File where referenced
  line: number; // Line number
  context: string; // Surrounding text
}

/**
 * Validation error
 */
export interface ValidationError {
  type:
    | 'undefined_term'
    | 'conflicting_definition'
    | 'scope_violation'
    | 'circular_reference'
    | 'unused_definition';
  severity: 'error' | 'warning';
  term: string;
  message: string;
  location?: { file: string; line: number };
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];

  stats: {
    totalDefinitions: number;
    globalDefinitions: number;
    documentDefinitions: number;
    totalReferences: number;
    uniqueReferences: number;
    undefinedTerms: number;
    unusedDefinitions: number;
    conflicts: number;
  };
}

/**
 * Term registry
 */
export interface TermRegistry {
  definitions: Map<string, TermDefinition>;
  references: TermReference[];

  // Indices
  byFile: Map<string, TermDefinition[]>;
  byScope: Map<TermScope, TermDefinition[]>;
  aliasMap: Map<string, string>; // alias -> canonical

  // Methods
  find(term: string): TermDefinition | undefined;
  resolve(alias: string): string; // Resolve alias to canonical
  getDefinitionsInFile(file: string): TermDefinition[];
  getReferencesInFile(file: string): TermReference[];
}
