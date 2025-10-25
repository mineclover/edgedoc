/**
 * Syntax Term Management
 *
 * @feature 19_SyntaxTermSystem
 * @doc tasks/features/19_SyntaxTermSystem.md
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Syntax pattern definition
 */
export interface SyntaxPattern {
  name: string;          // "Pattern 1: Numbered List"
  format: string;        // Markdown format description
  regex: string;         // Parser regex pattern
  description: string;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning';
  errorMessage: string;
}

/**
 * Syntax usage location
 */
export interface SyntaxUsage {
  file: string;          // Relative path
  line: number;
  context: string;       // Surrounding lines
  pattern?: string;      // Which pattern was used
}

/**
 * Complete syntax term definition
 */
export interface SyntaxTerm {
  // Identity
  id: string;                    // "syntax:Component-Definition"
  name: string;                  // "Component Definition"
  type: 'syntax';
  status: 'documented' | 'planned' | 'deprecated';

  // Implementation
  parser: string;                // "src/tools/implementation-coverage.ts:extractDocumentedComponents"
  validator?: string;            // "src/validators/component-validator.ts"

  // Documentation
  description: string;
  patterns: SyntaxPattern[];
  rules: ValidationRule[];

  // Examples
  examples: {
    valid: string[];             // File paths with line numbers
    invalid: string[];           // Example file paths
  };

  // Relations
  relatedFeatures: string[];
  relatedTerms: string[];

  // File info
  filePath: string;
  docPath: string;               // Relative path for display
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  let currentKey = '';
  let currentArray: any[] = [];
  let inNestedObject = false;
  let nestedKey = '';
  let nestedObject: Record<string, any> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle nested object end
    if (inNestedObject && !trimmed.startsWith('-') && trimmed.includes(':')) {
      if (Object.keys(nestedObject).length > 0) {
        result[currentKey] = nestedObject;
        nestedObject = {};
      }
      inNestedObject = false;
    }

    if (trimmed.startsWith('-')) {
      // Array item
      const value = trimmed.substring(1).trim().replace(/['\"]/g, '');

      if (inNestedObject) {
        if (!nestedObject[nestedKey]) {
          nestedObject[nestedKey] = [];
        }
        nestedObject[nestedKey].push(value);
      } else {
        currentArray.push(value);
      }
    } else if (trimmed.includes(':')) {
      // Save previous array if exists
      if (currentKey && currentArray.length > 0 && !inNestedObject) {
        result[currentKey] = currentArray;
        currentArray = [];
      }

      // New key-value
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim().replace(/['\"]/g, '');
      const cleanKey = key.trim();

      // Check if this starts a nested object
      if (value === '' && line.match(/^\S/)) {
        currentKey = cleanKey;
        inNestedObject = true;
        nestedObject = {};
      } else if (inNestedObject && line.match(/^  \S/)) {
        // Nested key
        nestedKey = cleanKey;
        if (value) {
          nestedObject[cleanKey] = value;
        }
      } else {
        currentKey = cleanKey;
        if (value) {
          // Try to parse numbers
          if (!isNaN(Number(value))) {
            result[currentKey] = Number(value);
          } else {
            result[currentKey] = value;
          }
        }
      }
    }
  }

  // Save last array or nested object
  if (inNestedObject && Object.keys(nestedObject).length > 0) {
    result[currentKey] = nestedObject;
  } else if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Extract syntax patterns from markdown content
 */
function extractSyntaxPatterns(content: string): SyntaxPattern[] {
  const patterns: SyntaxPattern[] = [];
  const lines = content.split('\n');

  let inPatternSection = false;
  let currentPattern: Partial<SyntaxPattern> | null = null;
  let collectingRegex = false;
  let regexLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect pattern section
    if (line.match(/^##\s+문법\s*\(Syntax\)/i) || line.match(/^##\s+Syntax/i)) {
      inPatternSection = true;
      continue;
    }

    // Exit pattern section
    if (inPatternSection && line.match(/^##\s+[^#]/)) {
      inPatternSection = false;
      break;
    }

    if (!inPatternSection) continue;

    // Detect pattern heading: "### Pattern 1: Numbered List"
    const patternMatch = line.match(/^###\s+(Pattern\s+\d+:\s+.+)/);
    if (patternMatch) {
      // Save previous pattern
      if (currentPattern && currentPattern.name) {
        patterns.push(currentPattern as SyntaxPattern);
      }

      currentPattern = {
        name: patternMatch[1].trim(),
        format: '',
        regex: '',
        description: '',
      };
      collectingRegex = false;
      regexLines = [];
      continue;
    }

    if (currentPattern) {
      // Collect description (first paragraph after pattern heading)
      if (!currentPattern.description && line.trim() && !line.startsWith('**') && !line.startsWith('```')) {
        currentPattern.description = line.trim();
      }

      // Detect "파싱 로직:" or "**파싱 로직**:"
      if (line.match(/\*\*파싱 로직\*\*:|파싱 로직:/)) {
        collectingRegex = true;
        continue;
      }

      // Collect regex from code block
      if (collectingRegex && line.trim().startsWith('```')) {
        if (regexLines.length > 0) {
          // End of code block
          currentPattern.regex = regexLines.join('\n');
          collectingRegex = false;
          regexLines = [];
        }
        continue;
      }

      if (collectingRegex && line.trim()) {
        regexLines.push(line.trim());
      }
    }
  }

  // Save last pattern
  if (currentPattern && currentPattern.name) {
    patterns.push(currentPattern as SyntaxPattern);
  }

  return patterns;
}

/**
 * Extract validation rules from markdown content
 */
function extractValidationRules(content: string): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const lines = content.split('\n');

  let inRulesSection = false;
  let currentRule: Partial<ValidationRule> | null = null;

  for (const line of lines) {
    // Detect rules section
    if (line.match(/^##\s+Validation Rules/i)) {
      inRulesSection = true;
      continue;
    }

    // Exit rules section
    if (inRulesSection && line.match(/^##\s+[^#]/)) {
      // Save last rule
      if (currentRule && currentRule.id) {
        rules.push(currentRule as ValidationRule);
      }
      break;
    }

    if (!inRulesSection) continue;

    // Detect rule heading: "### Rule 1: Component Name Format"
    const ruleMatch = line.match(/^###\s+(Rule\s+\d+):\s+(.+)/);
    if (ruleMatch) {
      // Save previous rule
      if (currentRule && currentRule.id) {
        rules.push(currentRule as ValidationRule);
      }

      currentRule = {
        id: ruleMatch[1].toLowerCase().replace(/\s+/g, '_'),
        description: ruleMatch[2].trim(),
        severity: 'error',
        errorMessage: '',
      };
      continue;
    }

    // Extract error message from examples
    if (currentRule && line.includes('❌ Invalid:')) {
      // Next lines might contain the error
      currentRule.errorMessage = currentRule.description;
    }
  }

  // Save last rule
  if (currentRule && currentRule.id) {
    rules.push(currentRule as ValidationRule);
  }

  return rules;
}

/**
 * Parse a syntax term from file
 */
export function parseSyntaxTerm(filePath: string, projectPath: string = process.cwd()): SyntaxTerm | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  // Must have feature field with "syntax:" prefix
  if (!frontmatter.feature || !frontmatter.feature.startsWith('syntax:')) {
    return null;
  }

  // Extract term name from feature ID
  const featureId = frontmatter.feature;
  const termName = featureId.replace('syntax:', '').replace(/-/g, ' ');

  // Extract heading name
  const headingMatch = content.match(/^#\s+\[\[(.+?)\]\]/m);
  const displayName = headingMatch ? headingMatch[1] : termName;

  // Extract description (first paragraph after heading)
  const descMatch = content.match(/^#\s+\[\[.+?\]\]\n\n(.+)/m);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract patterns
  const patterns = extractSyntaxPatterns(content);

  // Extract validation rules
  const rules = extractValidationRules(content);

  // Get examples from frontmatter
  const examples = frontmatter.examples || { valid: [], invalid: [] };

  return {
    id: featureId,
    name: displayName,
    type: 'syntax',
    status: frontmatter.status || 'planned',
    parser: frontmatter.parser || '',
    validator: frontmatter.validator,
    description,
    patterns,
    rules,
    examples,
    relatedFeatures: frontmatter.related_features || [],
    relatedTerms: frontmatter.related_terms || [],
    filePath,
    docPath: filePath.replace(projectPath + '/', ''),
  };
}

/**
 * Collect all syntax terms from tasks/syntax/
 */
export function collectSyntaxTerms(projectPath: string = process.cwd()): SyntaxTerm[] {
  const syntaxDir = join(projectPath, 'tasks', 'syntax');

  if (!existsSync(syntaxDir)) {
    return [];
  }

  const files = readdirSync(syntaxDir)
    .filter(f => f.endsWith('.md'))
    .map(f => join(syntaxDir, f));

  const terms: SyntaxTerm[] = [];

  for (const file of files) {
    const term = parseSyntaxTerm(file, projectPath);
    if (term) {
      terms.push(term);
    }
  }

  return terms;
}

/**
 * Find a syntax term by ID or name
 */
export function findSyntaxTerm(
  idOrName: string,
  projectPath: string = process.cwd()
): SyntaxTerm | null {
  const terms = collectSyntaxTerms(projectPath);

  // Try exact ID match first
  let term = terms.find(t => t.id === idOrName);
  if (term) return term;

  // Try with "syntax:" prefix
  term = terms.find(t => t.id === `syntax:${idOrName}`);
  if (term) return term;

  // Try name match (case-insensitive)
  const lowerName = idOrName.toLowerCase();
  term = terms.find(t => t.name.toLowerCase() === lowerName);
  if (term) return term;

  // Try partial name match
  term = terms.find(t => t.name.toLowerCase().includes(lowerName));
  return term || null;
}

/**
 * Get all syntax terms grouped by category
 */
export function getSyntaxTermsByCategory(projectPath: string = process.cwd()): Record<string, SyntaxTerm[]> {
  const terms = collectSyntaxTerms(projectPath);

  const categories: Record<string, SyntaxTerm[]> = {
    'Documentation Structure': [],
    'Term System': [],
    'Test References': [],
    'Code References': [],
    'Other': [],
  };

  for (const term of terms) {
    if (term.name.includes('Component') || term.name.includes('Architecture') || term.name.includes('Frontmatter')) {
      categories['Documentation Structure'].push(term);
    } else if (term.name.includes('Term')) {
      categories['Term System'].push(term);
    } else if (term.name.includes('Test') || term.name.includes('JSDoc')) {
      categories['Test References'].push(term);
    } else if (term.name.includes('Interface') || term.name.includes('Entry Point') || term.name.includes('Code')) {
      categories['Code References'].push(term);
    } else {
      categories['Other'].push(term);
    }
  }

  // Remove empty categories
  for (const category in categories) {
    if (categories[category].length === 0) {
      delete categories[category];
    }
  }

  return categories;
}
