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

    // 4. Check isolated terms (no relationships)
    const isolatedTerms: string[] = [];

    for (const [term, def] of this.definitions) {
      const hasRelationships = !!(
        def.parent ||
        (def.related && def.related.length > 0)
      );

      if (!hasRelationships) {
        // Count how many times this term is referenced
        const referenceCount = this.references.filter(
          (r) => this.resolve(r.term) === term
        ).length;

        isolatedTerms.push(term);

        // If term is heavily used (5+ references), it's less concerning
        const severity = referenceCount >= 5 ? 'info' : 'warning';
        const usageInfo = referenceCount > 0
          ? ` (used ${referenceCount} times)`
          : ' (unused)';

        warnings.push({
          type: 'isolated_term',
          severity: severity as 'warning',
          term,
          message: `Term "${term}" has no relationships${usageInfo}`,
          location: { file: def.file, line: def.line },
          suggestion: referenceCount >= 5
            ? 'This term is heavily used. Consider adding Related fields to connect it to related concepts.'
            : 'Most concepts should relate to other concepts. Consider adding Parent or Related fields.',
        });
      }
    }

    // 5. Check for potential duplicates (similar definitions)
    const duplicateWarnings = this.detectDuplicates();
    warnings.push(...duplicateWarnings);

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
      isolatedTerms: isolatedTerms.length,
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
   * List all definitions
   */
  /**
   * Detect potential duplicate terms based on similar definitions
   */
  private detectDuplicates(): ValidationError[] {
    const warnings: ValidationError[] = [];
    const terms = Array.from(this.definitions.entries());

    // Compare each pair of terms
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const [term1, def1] = terms[i];
        const [term2, def2] = terms[j];

        // Skip if they are already marked as related, aliases, or contrasting
        if (def1.aliases?.includes(term2) || def2.aliases?.includes(term1)) {
          continue;
        }
        if (def1.related?.includes(term2) || def2.related?.includes(term1)) {
          continue;
        }
        // Skip if they are contrasting concepts (marked as "Not to Confuse")
        if (def1.notToConfuse === term2 || def2.notToConfuse === term1) {
          continue;
        }

        // Check if definitions are similar
        if (def1.definition && def2.definition) {
          const similarity = this.calculateSimilarity(def1.definition, def2.definition);

          // If similarity > 70%, flag as potential duplicate
          if (similarity > 0.7) {
            warnings.push({
              type: 'duplicate_term' as any,
              severity: 'warning',
              term: term1,
              message: `"${term1}" and "${term2}" have similar definitions (${Math.round(similarity * 100)}% similar)`,
              location: { file: def1.file, line: def1.line },
              suggestion: `Consider merging these terms or marking one as an alias of the other.`,
            });
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Calculate similarity between two strings using Jaccard similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Normalize texts
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s가-힣]/g, '') // Keep alphanumeric and Korean
        .split(/\s+/)
        .filter((w) => w.length > 2); // Filter out short words

    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));

    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    // Jaccard similarity: intersection / union
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

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
