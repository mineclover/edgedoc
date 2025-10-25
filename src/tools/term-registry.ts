import type {
  TermDefinition,
  TermReference,
  TermRegistry as ITermRegistry,
  TermScope,
  ValidationResult,
  ValidationError,
} from '../types/terminology.js';

/**
 * Term registry implementation
 */
export class TermRegistry implements ITermRegistry {
  definitions = new Map<string, TermDefinition>();
  references: TermReference[] = [];

  byFile = new Map<string, TermDefinition[]>();
  byScope = new Map<TermScope, TermDefinition[]>();
  aliasMap = new Map<string, string>();

  /**
   * Add term definition
   */
  addDefinition(def: TermDefinition): void {
    // Check for conflicts
    if (this.definitions.has(def.term)) {
      const existing = this.definitions.get(def.term)!;

      // Same term in different files = conflict
      if (existing.file !== def.file) {
        throw new Error(
          `Term "${def.term}" defined in multiple files: ${existing.file}, ${def.file}`
        );
      }
    }

    this.definitions.set(def.term, def);

    // Build indices
    if (!this.byFile.has(def.file)) {
      this.byFile.set(def.file, []);
    }
    this.byFile.get(def.file)!.push(def);

    if (!this.byScope.has(def.scope)) {
      this.byScope.set(def.scope, []);
    }
    this.byScope.get(def.scope)!.push(def);

    // Build alias map
    if (def.aliases) {
      for (const alias of def.aliases) {
        this.aliasMap.set(alias, def.term);
      }
    }
  }

  /**
   * Add term reference
   */
  addReference(ref: TermReference): void {
    this.references.push(ref);
  }

  /**
   * Find term definition
   */
  find(term: string): TermDefinition | undefined {
    // Try canonical name first
    if (this.definitions.has(term)) {
      return this.definitions.get(term);
    }

    // Try aliases
    const canonical = this.aliasMap.get(term);
    if (canonical) {
      return this.definitions.get(canonical);
    }

    return undefined;
  }

  /**
   * Resolve alias to canonical name
   */
  resolve(alias: string): string {
    return this.aliasMap.get(alias) || alias;
  }

  /**
   * Get definitions in file
   */
  getDefinitionsInFile(file: string): TermDefinition[] {
    return this.byFile.get(file) || [];
  }

  /**
   * Get references in file
   */
  getReferencesInFile(file: string): TermReference[] {
    return this.references.filter((r) => r.file === file);
  }

  /**
   * Validate all terms
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. Check undefined terms
    const undefinedTerms = new Set<string>();
    for (const ref of this.references) {
      const def = this.find(ref.term);

      if (!def) {
        undefinedTerms.add(ref.term);
        errors.push({
          type: 'undefined_term',
          severity: 'error',
          term: ref.term,
          message: `Term "${ref.term}" referenced but not defined`,
          location: { file: ref.file, line: ref.line },
          suggestion: `Add definition to docs/GLOSSARY.md:\n\n## [[${ref.term}]]\n\n정의 내용...`,
        });
      }
    }

    // 2. Check scope violations
    for (const ref of this.references) {
      const def = this.find(ref.term);

      if (def && def.scope === 'document' && def.file !== ref.file) {
        errors.push({
          type: 'scope_violation',
          severity: 'error',
          term: ref.term,
          message: `Term "${ref.term}" is document-scoped`,
          location: { file: ref.file, line: ref.line },
          suggestion: `Defined in ${def.file}, cannot use in ${ref.file}`,
        });
      }
    }

    // 3. Check unused definitions
    const usedTerms = new Set(this.references.map((r) => this.resolve(r.term)));
    const unusedDefinitions: string[] = [];

    for (const [term, def] of this.definitions) {
      if (!usedTerms.has(term)) {
        unusedDefinitions.push(term);
        warnings.push({
          type: 'unused_definition',
          severity: 'warning',
          term,
          message: `Term "${term}" defined but never referenced`,
          location: { file: def.file, line: def.line },
          suggestion: 'Consider removing if not needed',
        });
      }
    }

    // 4. Check circular references
    const circularWarnings = this.detectCircularReferences();
    warnings.push(...circularWarnings);

    // Calculate stats
    const uniqueReferences = new Set(this.references.map((r) => r.term));

    const stats = {
      totalDefinitions: this.definitions.size,
      globalDefinitions: this.byScope.get('global')?.length || 0,
      documentDefinitions: this.byScope.get('document')?.length || 0,
      totalReferences: this.references.length,
      uniqueReferences: uniqueReferences.size,
      undefinedTerms: undefinedTerms.size,
      unusedDefinitions: unusedDefinitions.length,
      conflicts: 0, // Conflicts throw errors during addDefinition
    };

    return {
      success: errors.length === 0,
      errors,
      warnings,
      stats,
    };
  }

  /**
   * Detect circular references in related terms
   */
  private detectCircularReferences(): ValidationError[] {
    const warnings: ValidationError[] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (term: string, path: string[]): void => {
      if (stack.has(term)) {
        // Circular reference detected
        const cycle = [...path, term];
        const cycleStart = cycle.indexOf(term);
        const circularPath = cycle.slice(cycleStart);

        const def = this.definitions.get(term);
        warnings.push({
          type: 'circular_reference',
          severity: 'warning',
          term,
          message: `Circular reference detected: ${circularPath.join(' → ')}`,
          location: def ? { file: def.file, line: def.line } : undefined,
          suggestion: 'Break the cycle by rephrasing one definition',
        });
        return;
      }

      if (visited.has(term)) {
        return;
      }

      visited.add(term);
      stack.add(term);

      const def = this.definitions.get(term);
      if (def && def.related) {
        for (const related of def.related) {
          dfs(related, [...path, term]);
        }
      }

      if (def && def.parent) {
        dfs(def.parent, [...path, term]);
      }

      stack.delete(term);
    };

    for (const term of this.definitions.keys()) {
      if (!visited.has(term)) {
        dfs(term, []);
      }
    }

    return warnings;
  }

  /**
   * List all definitions
   */
  listAll(): TermDefinition[] {
    return Array.from(this.definitions.values()).sort((a, b) => a.term.localeCompare(b.term));
  }

  /**
   * Search terms by query
   */
  search(query: string): TermDefinition[] {
    const lowerQuery = query.toLowerCase();

    return this.listAll().filter((def) => {
      // Match term name
      if (def.term.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Match aliases
      if (def.aliases) {
        for (const alias of def.aliases) {
          if (alias.toLowerCase().includes(lowerQuery)) {
            return true;
          }
        }
      }

      // Match definition
      if (def.definition && def.definition.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      return false;
    });
  }
}
