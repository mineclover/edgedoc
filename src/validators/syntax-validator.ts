/**
 * Syntax Validation System
 *
 * @feature 19_SyntaxTermSystem - Phase 3
 * @doc tasks/features/19_SyntaxTermSystem.md
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { SyntaxTerm } from '../tools/syntax-manager.js';

/**
 * Validation error
 */
export interface ValidationError {
  file: string;
  line: number;
  context: string;
  severity: 'error' | 'warning';
  message: string;
  syntaxTerm: string;
  rule: string;
}

/**
 * Validation result
 */
export interface SyntaxValidationResult {
  term: SyntaxTerm;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    isValid: boolean;
  };
}

/**
 * Validate Component Definition syntax
 */
export function validateComponentDefinition(
  filePath: string,
  projectPath: string = process.cwd()
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!existsSync(filePath)) {
    return errors;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let inArchitectureSection = false;
  let currentSection = '';
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Detect sections
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      inArchitectureSection = /^(Architecture|Components|Implementation)$/i.test(currentSection);
      continue;
    }

    if (!inArchitectureSection) continue;

    // Pattern 1: Numbered list "1. **ComponentName** (`path.ts`)"
    // Only match if there's a backtick-enclosed path
    const numberedMatch = line.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*\s+\(`([^`]+)`\)/);
    if (numberedMatch) {
      const [, componentName, componentFilePath] = numberedMatch;

      // Rule 1: Component name must start with uppercase
      if (!/^[A-Z]/.test(componentName.trim())) {
        errors.push({
          file: filePath,
          line: lineNumber,
          context: line.trim(),
          severity: 'error',
          message: `Component name must start with uppercase letter: "${componentName}"`,
          syntaxTerm: 'Component Definition',
          rule: 'component-name-format',
        });
      }

      // Rule 3: File must exist
      const fullPath = resolve(projectPath, componentFilePath);
      if (!existsSync(fullPath)) {
        errors.push({
          file: filePath,
          line: lineNumber,
          context: line.trim(),
          severity: 'error',
          message: `File not found: "${componentFilePath}"`,
          syntaxTerm: 'Component Definition',
          rule: 'file-must-exist',
        });
      }

      continue;
    }

    // Pattern 2 & 3: Heading pattern "### ComponentName" ONLY if followed by **File**: or **Location**:
    // This prevents false positives on section headings
    const headingMatch = line.match(/^###\s+([A-Z][A-Za-z0-9_\s]+)$/);
    if (headingMatch) {
      const componentName = headingMatch[1].trim();

      // Look for File or Location field in next lines (within 4 lines)
      let foundFile = false;
      let componentFilePath = '';

      for (let i = lineNumber; i < Math.min(lineNumber + 4, lines.length); i++) {
        const nextLine = lines[i];

        // Exit if we hit another section heading
        if (nextLine.match(/^##/)) {
          break;
        }

        const fileMatch = nextLine.match(/^\*\*(File|Location)\*\*:\s*`([^`]+)`/);
        if (fileMatch) {
          const [, , filePath] = fileMatch;
          foundFile = true;
          componentFilePath = filePath;

          // Rule 3: File must exist
          const fullPath = resolve(projectPath, filePath);
          if (!existsSync(fullPath)) {
            errors.push({
              file: filePath,
              line: i + 1,
              context: nextLine.trim(),
              severity: 'error',
              message: `File not found: "${filePath}"`,
              syntaxTerm: 'Component Definition',
              rule: 'file-must-exist',
            });
          }
          break;
        }
      }

      // Only report error if File/Location field was expected but missing
      // Check if there are bullet points (method definitions) following
      if (!foundFile && lineNumber < lines.length) {
        let hasMethodDefs = false;
        for (let i = lineNumber; i < Math.min(lineNumber + 3, lines.length); i++) {
          if (lines[i].match(/^\s{2,}-\s+/)) {
            hasMethodDefs = true;
            break;
          }
        }

        if (hasMethodDefs) {
          errors.push({
            file: filePath,
            line: lineNumber,
            context: line.trim(),
            severity: 'error',
            message: `Component "${componentName}" missing file path - use **File**: or **Location**:`,
            syntaxTerm: 'Component Definition',
            rule: 'file-path-required',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate Frontmatter Field syntax
 */
export function validateFrontmatterField(
  filePath: string,
  projectPath: string = process.cwd()
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!existsSync(filePath)) {
    return errors;
  }

  const content = readFileSync(filePath, 'utf-8');

  // Check for frontmatter section
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return errors; // No frontmatter
  }

  // Frontmatter validation would go here
  // For now, basic structure validation

  return errors;
}

/**
 * Validate Term Definition syntax
 */
export function validateTermDefinition(
  filePath: string,
  projectPath: string = process.cwd()
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!existsSync(filePath)) {
    return errors;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let lineNumber = 0;

  // Check for [[TermName]] heading
  const headingMatch = content.match(/^#\s+\[\[(.+?)\]\]/m);
  if (!headingMatch) {
    errors.push({
      file: filePath,
      line: 1,
      context: 'Missing term definition heading',
      severity: 'error',
      message: 'Term definition must have heading: # [[TermName]]',
      syntaxTerm: 'Term Definition',
      rule: 'heading-required',
    });
    return errors;
  }

  for (const line of lines) {
    lineNumber++;

    // Check for term references: [[TermName]]
    const termRefMatch = line.match(/\[\[([^\]]+)\]\]/g);
    if (termRefMatch) {
      for (const ref of termRefMatch) {
        const termName = ref.slice(2, -2);

        // Basic validation - term name should be non-empty
        if (!termName.trim()) {
          errors.push({
            file: filePath,
            line: lineNumber,
            context: line.trim(),
            severity: 'error',
            message: 'Empty term reference: [[]]',
            syntaxTerm: 'Term Definition',
            rule: 'term-reference-empty',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate a complete syntax term's usage in all project files
 */
export function validateSyntaxTermUsage(
  term: SyntaxTerm,
  projectPath: string = process.cwd()
): SyntaxValidationResult {
  let errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Route to appropriate validator based on term name
  if (term.name.includes('Component')) {
    // For now, just analyze patterns
    // Full validation would need to check all feature files
  } else if (term.name.includes('Frontmatter')) {
    // Frontmatter validation
  } else if (term.name.includes('Term')) {
    // Term definition validation
  }

  return {
    term,
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      isValid: errors.length === 0,
    },
  };
}

/**
 * Report syntax errors in a formatted way
 */
export function reportSyntaxErrors(errors: ValidationError[], verbose: boolean = false): void {
  if (errors.length === 0) {
    console.log('✅ No syntax errors found');
    return;
  }

  console.log(`\n❌ Found ${errors.length} syntax error(s):\n`);

  // Group by file
  const byFile = new Map<string, ValidationError[]>();
  for (const error of errors) {
    if (!byFile.has(error.file)) {
      byFile.set(error.file, []);
    }
    byFile.get(error.file)!.push(error);
  }

  // Print errors grouped by file
  for (const [file, fileErrors] of byFile) {
    console.log(`📄 ${file}`);

    for (const error of fileErrors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} Line ${error.line}: ${error.message}`);

      if (verbose) {
        console.log(`     Rule: ${error.rule}`);
        console.log(`     Term: ${error.syntaxTerm}`);
        console.log(`     Context: ${error.context}`);
      }
    }

    console.log();
  }
}

/**
 * Get validation rule for a syntax term
 */
export function getValidationRulesForTerm(
  termName: string
): Array<{ id: string; description: string; severity: 'error' | 'warning' }> {
  if (termName.includes('Component')) {
    return [
      {
        id: 'component-name-format',
        description: 'Component name must start with uppercase letter',
        severity: 'error',
      },
      {
        id: 'file-path-required',
        description: 'Component must have file path (inline or **File**/**Location** field)',
        severity: 'error',
      },
      {
        id: 'file-must-exist',
        description: 'Referenced file must exist in project',
        severity: 'error',
      },
      {
        id: 'valid-section',
        description: 'Component must be defined in Architecture/Components/Implementation section',
        severity: 'error',
      },
    ];
  }

  if (termName.includes('Frontmatter')) {
    return [
      {
        id: 'required-fields',
        description: 'All required frontmatter fields must be present',
        severity: 'error',
      },
      {
        id: 'field-format',
        description: 'Frontmatter field must follow YAML format',
        severity: 'error',
      },
    ];
  }

  if (termName.includes('Term')) {
    return [
      {
        id: 'heading-required',
        description: 'Term definition must have heading: # [[TermName]]',
        severity: 'error',
      },
      {
        id: 'term-reference-empty',
        description: 'Term reference cannot be empty: [[]]',
        severity: 'error',
      },
      {
        id: 'term-name-format',
        description: 'Term name must follow naming convention',
        severity: 'warning',
      },
    ];
  }

  return [];
}
