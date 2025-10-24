/**
 * Reference Index Types
 *
 * Defines the schema for build-time generated reference index
 * that enables bidirectional navigation between documents, code, and terms.
 */

export interface ReferenceIndex {
  version: string;
  generated: string; // ISO timestamp
  features: FeatureIndex;
  code: CodeIndex;
  interfaces: InterfaceIndex;
  terms: TermIndex;
}

/**
 * Feature Index
 * Maps feature IDs to their references and relationships
 */
export interface FeatureIndex {
  [featureId: string]: FeatureReferences;
}

export interface FeatureReferences {
  file: string; // Relative path to feature document

  // Code references
  code: {
    uses: string[]; // code_references from frontmatter
    used_by: string[]; // Reverse: code files that import this feature's code
  };

  // Feature relationships
  features: {
    related: string[]; // related_features from frontmatter (original)
    depends_on: string[]; // Inferred or explicit dependencies
    used_by: string[]; // Reverse: features that depend on this
  };

  // Interface connections
  interfaces: {
    provides: string[]; // Interfaces this feature provides (from: this)
    uses: string[]; // Interfaces this feature uses (to: this)
  };

  // Term usage
  terms: {
    defines: string[]; // document-scoped term definitions
    uses: string[]; // [[Term]] references in body
  };

  // Test relationships
  tests: {
    tested_by: string[]; // test files
  };
}

/**
 * Code Index
 * Maps code file paths to their documentation and dependencies
 */
export interface CodeIndex {
  [filePath: string]: CodeReferences;
}

export interface CodeReferences {
  type: 'source' | 'test' | 'config';

  // Documentation
  documented_in: string[]; // Features that reference this code

  // Code dependencies
  imports: string[]; // Files this code imports
  imported_by: string[]; // Files that import this code

  // Symbol information (optional, for future enhancement)
  exports?: ExportSymbol[];
}

export interface ExportSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum';
  line: number;
  endLine?: number;
}

/**
 * Interface Index
 * Maps interface IDs to their connections
 */
export interface InterfaceIndex {
  [interfaceId: string]: InterfaceConnection;
}

export interface InterfaceConnection {
  file: string; // Path to interface document
  from: string; // Calling feature
  to: string; // Called feature
  type: string; // Interface type (command, data, etc.)
  shared_types: string[]; // Shared type IDs used
}

/**
 * Term Index
 * Maps term names to their definitions and usage
 */
export interface TermIndex {
  [term: string]: TermUsage;
}

export interface TermUsage {
  definition: {
    file: string;
    line: number;
    scope: 'global' | 'document';
  };
  references: TermReference[];
  usage_count: number;
}

export interface TermReference {
  file: string;
  line: number;
  context: string; // Surrounding text
}

/**
 * Builder Options
 */
export interface BuildIndexOptions {
  projectPath: string;
  outputPath?: string; // Default: .edgedoc/references.json
  includeSymbols?: boolean; // Include exported symbols (expensive)
  verbose?: boolean;
}

/**
 * Index Statistics
 */
export interface IndexStats {
  features: number;
  code_files: number;
  interfaces: number;
  terms: number;
  total_references: number;
  build_time_ms: number;
}
