import { describe, test, expect } from 'bun:test';
import { TermRegistry } from '../../src/tools/term-registry.js';
import type { TermDefinition, TermReference } from '../../src/types/terminology.js';

/**
 * Unit Tests: Term Validation & Management
 *
 * Tests for term definition parsing, reference extraction, and validation.
 *
 * @feature 13_ValidateTerms
 * @doc tasks/features/13_ValidateTerms.md
 *
 * Test Coverage:
 *   - Term definition parsing
 *   - Term reference extraction
 *   - Undefined term detection
 *   - Scope violation detection
 *   - Isolated term detection (no relationships)
 *   - Duplicate term detection (similar definitions)
 *   - Usage counting
 *   - Search functionality
 */

describe('TermRegistry - Definition Management', () => {
  test('should add and find term definitions', () => {
    const registry = new TermRegistry();

    const def: TermDefinition = {
      term: 'Code Interface',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Code Interface]]',
      scope: 'global',
      type: 'entity',
      definition: 'TypeScript interface or class',
    };

    registry.addDefinition(def);

    const found = registry.find('Code Interface');
    expect(found).toBeDefined();
    expect(found?.term).toBe('Code Interface');
    expect(found?.scope).toBe('global');
  });

  test('should resolve aliases to canonical names', () => {
    const registry = new TermRegistry();

    const def: TermDefinition = {
      term: 'Command Line Interface',
      file: 'docs/GLOSSARY.md',
      line: 20,
      heading: '## [[Command Line Interface]]',
      scope: 'global',
      aliases: ['CLI', 'command-line'],
    };

    registry.addDefinition(def);

    expect(registry.resolve('CLI')).toBe('Command Line Interface');
    expect(registry.resolve('command-line')).toBe('Command Line Interface');
    expect(registry.resolve('Unknown')).toBe('Unknown');
  });

  test('should detect conflicting definitions', () => {
    const registry = new TermRegistry();

    const def1: TermDefinition = {
      term: 'Parser',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Parser]]',
      scope: 'global',
    };

    const def2: TermDefinition = {
      term: 'Parser',
      file: 'docs/OTHER.md',
      line: 5,
      heading: '## [[Parser]]',
      scope: 'global',
    };

    registry.addDefinition(def1);

    expect(() => registry.addDefinition(def2)).toThrow(
      'Term "Parser" defined in multiple files'
    );
  });

  test('should organize definitions by scope', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Global Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Global Term]]',
      scope: 'global',
    });

    registry.addDefinition({
      term: 'Local Term',
      file: 'docs/feature.md',
      line: 20,
      heading: '## [[Local Term]]',
      scope: 'document',
    });

    const globalDefs = registry.byScope.get('global');
    const documentDefs = registry.byScope.get('document');

    expect(globalDefs?.length).toBe(1);
    expect(documentDefs?.length).toBe(1);
  });
});

describe('TermRegistry - Reference Tracking', () => {
  test('should track term references', () => {
    const registry = new TermRegistry();

    const ref: TermReference = {
      term: 'Code Interface',
      file: 'tasks/features/01.md',
      line: 50,
      context: 'Uses [[Code Interface]] for...',
    };

    registry.addReference(ref);

    expect(registry.references.length).toBe(1);
    expect(registry.references[0].term).toBe('Code Interface');
  });

  test('should get references by file', () => {
    const registry = new TermRegistry();

    registry.addReference({
      term: 'Parser',
      file: 'doc1.md',
      line: 10,
      context: '[[Parser]]',
    });

    registry.addReference({
      term: 'Validator',
      file: 'doc1.md',
      line: 20,
      context: '[[Validator]]',
    });

    registry.addReference({
      term: 'Other',
      file: 'doc2.md',
      line: 30,
      context: '[[Other]]',
    });

    const refs = registry.getReferencesInFile('doc1.md');
    expect(refs.length).toBe(2);
  });
});

describe('TermRegistry - Validation: Undefined Terms', () => {
  test('should detect undefined terms', () => {
    const registry = new TermRegistry();

    // Add definition
    registry.addDefinition({
      term: 'Defined Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Defined Term]]',
      scope: 'global',
    });

    // Add references
    registry.addReference({
      term: 'Defined Term',
      file: 'doc.md',
      line: 5,
      context: '[[Defined Term]]',
    });

    registry.addReference({
      term: 'Undefined Term',
      file: 'doc.md',
      line: 10,
      context: '[[Undefined Term]]',
    });

    const result = registry.validate();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].type).toBe('undefined_term');
    expect(result.errors[0].term).toBe('Undefined Term');
    expect(result.stats.undefinedTerms).toBe(1);
  });
});

describe('TermRegistry - Validation: Scope Violations', () => {
  test('should detect document-scoped term used in other files', () => {
    const registry = new TermRegistry();

    // Document-scoped definition
    registry.addDefinition({
      term: 'Local Feature',
      file: 'docs/feature-a.md',
      line: 10,
      heading: '## [[Local Feature]]',
      scope: 'document',
    });

    // Valid reference (same file)
    registry.addReference({
      term: 'Local Feature',
      file: 'docs/feature-a.md',
      line: 50,
      context: '[[Local Feature]]',
    });

    // Invalid reference (different file)
    registry.addReference({
      term: 'Local Feature',
      file: 'docs/feature-b.md',
      line: 20,
      context: '[[Local Feature]]',
    });

    const result = registry.validate();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].type).toBe('scope_violation');
    expect(result.errors[0].term).toBe('Local Feature');
  });

  test('should allow global-scoped terms in any file', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Global Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Global Term]]',
      scope: 'global',
    });

    registry.addReference({
      term: 'Global Term',
      file: 'docs/anywhere.md',
      line: 5,
      context: '[[Global Term]]',
    });

    const result = registry.validate();
    expect(result.success).toBe(true);
  });
});

describe('TermRegistry - Validation: Isolated Terms', () => {
  test('should detect terms with no relationships', () => {
    const registry = new TermRegistry();

    // Isolated term (no parent, no related)
    registry.addDefinition({
      term: 'Isolated Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Isolated Term]]',
      scope: 'global',
    });

    // Connected term
    registry.addDefinition({
      term: 'Connected Term',
      file: 'docs/GLOSSARY.md',
      line: 20,
      heading: '## [[Connected Term]]',
      scope: 'global',
      related: ['Other Term'],
    });

    // Add usage
    registry.addReference({
      term: 'Isolated Term',
      file: 'doc.md',
      line: 5,
      context: '[[Isolated Term]]',
    });

    const result = registry.validate();

    const isolatedWarnings = result.warnings.filter(
      (w) => w.type === 'isolated_term'
    );

    expect(isolatedWarnings.length).toBe(1);
    expect(isolatedWarnings[0].term).toBe('Isolated Term');
    expect(isolatedWarnings[0].message).toContain('used 1 times');
  });

  test('should track usage count for isolated terms', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Popular Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Popular Term]]',
      scope: 'global',
      // No relationships
    });

    // Add multiple references
    for (let i = 0; i < 10; i++) {
      registry.addReference({
        term: 'Popular Term',
        file: `doc${i}.md`,
        line: 5,
        context: '[[Popular Term]]',
      });
    }

    const result = registry.validate();
    const isolatedWarnings = result.warnings.filter(
      (w) => w.type === 'isolated_term'
    );

    expect(isolatedWarnings.length).toBe(1);
    expect(isolatedWarnings[0].message).toContain('used 10 times');
    expect(isolatedWarnings[0].suggestion).toContain('heavily used');
  });

  test('should not flag terms with parent as isolated', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Child Term',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Child Term]]',
      scope: 'global',
      parent: 'Parent Term',
    });

    const result = registry.validate();
    const isolatedWarnings = result.warnings.filter(
      (w) => w.type === 'isolated_term'
    );

    expect(isolatedWarnings.length).toBe(0);
  });
});

describe('TermRegistry - Validation: Duplicate Detection', () => {
  test('should detect similar definitions', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Interface Validation',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Interface Validation]]',
      scope: 'global',
      definition: 'Process to validate code interfaces for documentation',
    });

    registry.addDefinition({
      term: 'Code Validation',
      file: 'docs/GLOSSARY.md',
      line: 30,
      heading: '## [[Code Validation]]',
      scope: 'global',
      definition: 'Process to validate code interfaces for documentation coverage',
    });

    const result = registry.validate();
    const duplicateWarnings = result.warnings.filter(
      (w) => w.type === 'duplicate_term'
    );

    expect(duplicateWarnings.length).toBeGreaterThan(0);
    expect(duplicateWarnings[0].message).toContain('%');
  });

  test('should not flag related terms as duplicates if marked', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Interface Validation A',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Interface Validation A]]',
      scope: 'global',
      related: ['Interface Validation B'],
      definition: 'Process to validate interfaces',
    });

    registry.addDefinition({
      term: 'Interface Validation B',
      file: 'docs/GLOSSARY.md',
      line: 30,
      heading: '## [[Interface Validation B]]',
      scope: 'global',
      related: ['Interface Validation A'],
      definition: 'Process to validate interfaces',
    });

    const result = registry.validate();
    const duplicateWarnings = result.warnings.filter(
      (w) => w.type === 'duplicate_term'
    );

    // Should not detect as duplicate because they're marked as related
    expect(duplicateWarnings.length).toBe(0);
  });

  test('should not flag related terms as duplicates', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Term A',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Term A]]',
      scope: 'global',
      related: ['Term B'],
      definition: 'Similar concept to Term B',
    });

    registry.addDefinition({
      term: 'Term B',
      file: 'docs/GLOSSARY.md',
      line: 30,
      heading: '## [[Term B]]',
      scope: 'global',
      related: ['Term A'],
      definition: 'Similar concept to Term A',
    });

    const result = registry.validate();
    const duplicateWarnings = result.warnings.filter(
      (w) => w.type === 'duplicate_term'
    );

    expect(duplicateWarnings.length).toBe(0);
  });
});

describe('TermRegistry - Validation: Stats', () => {
  test('should calculate accurate statistics', () => {
    const registry = new TermRegistry();

    // Add definitions
    registry.addDefinition({
      term: 'Global 1',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Global 1]]',
      scope: 'global',
    });

    registry.addDefinition({
      term: 'Document 1',
      file: 'docs/feature.md',
      line: 20,
      heading: '## [[Document 1]]',
      scope: 'document',
    });

    // Add references
    registry.addReference({
      term: 'Global 1',
      file: 'doc1.md',
      line: 5,
      context: '[[Global 1]]',
    });

    registry.addReference({
      term: 'Global 1',
      file: 'doc2.md',
      line: 10,
      context: '[[Global 1]]',
    });

    const result = registry.validate();

    expect(result.stats.totalDefinitions).toBe(2);
    expect(result.stats.globalDefinitions).toBe(1);
    expect(result.stats.documentDefinitions).toBe(1);
    expect(result.stats.totalReferences).toBe(2);
    expect(result.stats.uniqueReferences).toBe(1);
  });
});

describe('TermRegistry - Search', () => {
  test('should search by term name', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Code Interface',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Code Interface]]',
      scope: 'global',
    });

    registry.addDefinition({
      term: 'User Interface',
      file: 'docs/GLOSSARY.md',
      line: 30,
      heading: '## [[User Interface]]',
      scope: 'global',
    });

    const results = registry.search('Interface');
    expect(results.length).toBe(2);
  });

  test('should search by alias', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Command Line Interface',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Command Line Interface]]',
      scope: 'global',
      aliases: ['CLI', 'terminal'],
    });

    const results = registry.search('CLI');
    expect(results.length).toBe(1);
    expect(results[0].term).toBe('Command Line Interface');
  });

  test('should search by definition content', () => {
    const registry = new TermRegistry();

    registry.addDefinition({
      term: 'Parser',
      file: 'docs/GLOSSARY.md',
      line: 10,
      heading: '## [[Parser]]',
      scope: 'global',
      definition: 'Tool for analyzing tree-sitter syntax',
    });

    const results = registry.search('tree-sitter');
    expect(results.length).toBe(1);
  });
});
