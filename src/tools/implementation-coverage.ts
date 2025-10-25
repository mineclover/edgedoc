/**
 * Implementation Coverage Analysis
 *
 * Measures coverage between documented components/interfaces and actual code implementation.
 *
 * @feature 18_ImplementationCoverage
 * @doc tasks/features/18_ImplementationCoverage.md
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { ParserFactory } from '../parsers/ParserFactory.js';

/**
 * Component definition extracted from documentation
 */
export interface DocumentedComponent {
  name: string;           // e.g., "TermParser"
  filePath: string;       // e.g., "src/parsers/TermParser.ts"
  description: string;    // Brief description from docs
  publicMethods: string[]; // Expected methods/functions from bullet points
  featureId: string;      // Which feature documents this
  docLine: number;        // Line number in doc
}

/**
 * Public interface extracted from code
 */
export interface ImplementedInterface {
  name: string;           // Class/function/const name
  type: 'class' | 'function' | 'const' | 'type';
  filePath: string;       // Source file path
  exports: string[];      // Public methods/properties (for classes)
}

/**
 * Coverage result for a single feature
 */
export interface FeatureCoverage {
  featureId: string;
  featureTitle: string;
  status: string;
  entryPoint?: string;

  // Component-level coverage
  components: {
    total: number;
    implemented: number;
    missing: number;
    details: ComponentCoverage[];
  };

  // Interface-level coverage
  interfaces: {
    total: number;
    implemented: number;
    missing: number;
    details: InterfaceCoverage[];
  };

  // Task coverage (from checkboxes)
  tasks: {
    total: number;
    completed: number;
    pending: number;
    percentage: number;
  };

  // Code references coverage
  codeReferences: {
    total: number;
    found: number;
    missing: string[];
  };
}

export interface ComponentCoverage {
  component: DocumentedComponent;
  implemented: boolean;
  implementedInterface?: ImplementedInterface;
  interfaceCoverage?: {
    expected: number;
    found: number;
    missing: string[];
  };
}

export interface InterfaceCoverage {
  name: string;
  defined: boolean;      // Defined in docs
  implemented: boolean;  // Exists in code
  source: 'docs' | 'code' | 'both';
}

/**
 * Overall project coverage
 */
export interface ProjectCoverage {
  features: FeatureCoverage[];
  summary: {
    totalFeatures: number;
    fullyImplemented: number;
    partiallyImplemented: number;
    notImplemented: number;

    totalComponents: number;
    implementedComponents: number;
    missingComponents: number;

    totalInterfaces: number;
    implementedInterfaces: number;
    missingInterfaces: number;

    undocumentedImplementations: number; // Implemented but not documented
  };
}

/**
 * Parse frontmatter from markdown
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  let currentKey = '';
  let currentArray: any[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('-')) {
      const value = line.trim().substring(1).trim().replace(/['"]/g, '');
      currentArray.push(value);
    } else if (line.includes(':')) {
      if (currentKey && currentArray.length > 0) {
        result[currentKey] = currentArray;
        currentArray = [];
      }

      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/['"]/g, '');
      currentKey = key.trim();

      if (value) {
        result[currentKey] = value;
      }
    }
  }

  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Extract components from Architecture/Components section
 */
export function extractDocumentedComponents(
  docContent: string,
  featureId: string
): DocumentedComponent[] {
  const components: DocumentedComponent[] = [];
  const lines = docContent.split('\n');

  let inComponentsSection = false;
  let currentComponent: Partial<DocumentedComponent> | null = null;
  let currentMethods: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Components section
    if (line.match(/^###?\s+(Components|Architecture)/i)) {
      inComponentsSection = true;
      continue;
    }

    // Exit section on next major heading
    if (inComponentsSection && line.match(/^##[^#]/)) {
      // Save last component
      if (currentComponent && currentComponent.name) {
        components.push({
          ...currentComponent,
          publicMethods: currentMethods,
        } as DocumentedComponent);
      }
      break;
    }

    if (!inComponentsSection) continue;

    // Match component definition: "1. **ComponentName** (`path/to/file.ts`)"
    // Also handle variations with spaces
    const componentMatch = line.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*\s+\(`([^`]+)`\)/);
    if (componentMatch) {
      // Save previous component
      if (currentComponent && currentComponent.name) {
        components.push({
          ...currentComponent,
          publicMethods: currentMethods,
        } as DocumentedComponent);
      }

      currentComponent = {
        name: componentMatch[1].trim(),
        filePath: componentMatch[2].trim(),
        description: '',
        featureId,
        docLine: i + 1,
      };
      currentMethods = [];
      continue;
    }

    // Extract methods from bullet points under component
    if (currentComponent) {
      // Match bullet point with method/function description
      const methodMatch = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\(/);
      if (methodMatch) {
        currentMethods.push(methodMatch[1]);
        continue;
      }

      // Also match description-style methods: "- Method name: description"
      const methodMatch2 = line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/);
      if (methodMatch2) {
        currentMethods.push(methodMatch2[1]);
        continue;
      }

      // Capture description (first non-bullet line after component)
      if (!currentComponent.description && line.trim() && !line.trim().startsWith('-')) {
        currentComponent.description = line.trim();
      }
    }
  }

  // Save last component
  if (currentComponent && currentComponent.name) {
    components.push({
      ...currentComponent,
      publicMethods: currentMethods,
    } as DocumentedComponent);
  }

  return components;
}

/**
 * Extract implemented interfaces from code file (fallback regex method)
 */
function extractExportsWithRegex(content: string, filePath: string): ImplementedInterface[] {
  const interfaces: ImplementedInterface[] = [];

  // Match: export class ClassName
  const classMatches = content.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Z][A-Za-z0-9_]*)/g);
  for (const match of classMatches) {
    interfaces.push({
      name: match[1],
      type: 'class',
      filePath,
      exports: [],
    });
  }

  // Match: export function functionName
  const functionMatches = content.matchAll(/export\s+(?:async\s+)?function\s+([a-z][A-Za-z0-9_]*)/g);
  for (const match of functionMatches) {
    interfaces.push({
      name: match[1],
      type: 'function',
      filePath,
      exports: [],
    });
  }

  // Match: export const constName
  const constMatches = content.matchAll(/export\s+const\s+([a-z][A-Za-z0-9_]*)/g);
  for (const match of constMatches) {
    interfaces.push({
      name: match[1],
      type: 'const',
      filePath,
      exports: [],
    });
  }

  // Match: export interface InterfaceName
  const interfaceMatches = content.matchAll(/export\s+interface\s+([A-Z][A-Za-z0-9_]*)/g);
  for (const match of interfaceMatches) {
    interfaces.push({
      name: match[1],
      type: 'type',
      filePath,
      exports: [],
    });
  }

  // Match: export type TypeName
  const typeMatches = content.matchAll(/export\s+type\s+([A-Z][A-Za-z0-9_]*)/g);
  for (const match of typeMatches) {
    interfaces.push({
      name: match[1],
      type: 'type',
      filePath,
      exports: [],
    });
  }

  return interfaces;
}

/**
 * Extract implemented interfaces from code file
 */
export function extractImplementedInterfaces(
  filePath: string,
  projectPath: string
): ImplementedInterface[] {
  const fullPath = join(projectPath, filePath);
  if (!existsSync(fullPath)) {
    return [];
  }

  try {
    const content = readFileSync(fullPath, 'utf-8');

    // Try tree-sitter parser first
    try {
      const parser = ParserFactory.getParser(fullPath);
      if (parser) {
        const { exports } = parser.parse(content, fullPath);
        return exports.map(exp => ({
          name: exp.name,
          type: exp.type as 'class' | 'function' | 'const' | 'type',
          filePath,
          exports: exp.type === 'class' ? [] : [],
        }));
      }
    } catch (parserError) {
      // Fall through to regex method
    }

    // Fallback to regex extraction
    return extractExportsWithRegex(content, filePath);
  } catch (error) {
    return [];
  }
}

/**
 * Calculate coverage for a single feature
 */
export function calculateFeatureCoverage(
  featureDoc: string,
  featureId: string,
  projectPath: string
): FeatureCoverage {
  const content = readFileSync(featureDoc, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  // Extract title
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : featureId;

  // Extract documented components
  const documentedComponents = extractDocumentedComponents(content, featureId);

  // Extract code references from frontmatter
  const codeReferences: string[] = frontmatter.code_references || [];

  // Check which code files exist
  const missingFiles = codeReferences.filter(file => {
    return !existsSync(join(projectPath, file));
  });

  // Extract implemented interfaces from code references
  const implementedInterfaces = codeReferences.flatMap(file =>
    extractImplementedInterfaces(file, projectPath)
  );

  // Match components with implementations
  const componentCoverageDetails: ComponentCoverage[] = documentedComponents.map(component => {
    const impl = implementedInterfaces.find(i =>
      i.name === component.name || i.filePath === component.filePath
    );

    const interfaceCoverage = component.publicMethods.length > 0 ? {
      expected: component.publicMethods.length,
      found: impl ? impl.exports.filter(e => component.publicMethods.includes(e)).length : 0,
      missing: component.publicMethods.filter(m => !impl?.exports.includes(m)),
    } : undefined;

    return {
      component,
      implemented: !!impl,
      implementedInterface: impl,
      interfaceCoverage,
    };
  });

  // Count checkboxes for task coverage
  const checkboxes = content.match(/- \[([ xX])\]/g) || [];
  const checked = checkboxes.filter(cb => cb.match(/\[x\]/i)).length;

  // Calculate interface coverage (all exported names)
  const allDocumentedInterfaces = new Set(documentedComponents.map(c => c.name));
  const allImplementedInterfaces = new Set(implementedInterfaces.map(i => i.name));

  const interfaceCoverageDetails: InterfaceCoverage[] = [
    ...Array.from(allDocumentedInterfaces).map(name => ({
      name,
      defined: true,
      implemented: allImplementedInterfaces.has(name),
      source: (allImplementedInterfaces.has(name) ? 'both' : 'docs') as 'docs' | 'code' | 'both',
    })),
    ...Array.from(allImplementedInterfaces)
      .filter(name => !allDocumentedInterfaces.has(name))
      .map(name => ({
        name,
        defined: false,
        implemented: true,
        source: 'code' as 'docs' | 'code' | 'both',
      })),
  ];

  return {
    featureId,
    featureTitle: title,
    status: frontmatter.status || 'unknown',
    entryPoint: frontmatter.entry_point,

    components: {
      total: documentedComponents.length,
      implemented: componentCoverageDetails.filter(c => c.implemented).length,
      missing: componentCoverageDetails.filter(c => !c.implemented).length,
      details: componentCoverageDetails,
    },

    interfaces: {
      total: interfaceCoverageDetails.length,
      implemented: interfaceCoverageDetails.filter(i => i.implemented).length,
      missing: interfaceCoverageDetails.filter(i => !i.implemented).length,
      details: interfaceCoverageDetails,
    },

    tasks: {
      total: checkboxes.length,
      completed: checked,
      pending: checkboxes.length - checked,
      percentage: checkboxes.length > 0 ? (checked / checkboxes.length) * 100 : 0,
    },

    codeReferences: {
      total: codeReferences.length,
      found: codeReferences.length - missingFiles.length,
      missing: missingFiles,
    },
  };
}

/**
 * Generate implementation coverage report for entire project
 */
export function generateImplementationCoverage(
  projectPath: string = process.cwd()
): ProjectCoverage {
  const featuresDir = join(projectPath, 'tasks', 'features');
  if (!existsSync(featuresDir)) {
    throw new Error(`Features directory not found: ${featuresDir}`);
  }

  const featureFiles = readdirSync(featuresDir)
    .filter(f => f.endsWith('.md'))
    .map(f => join(featuresDir, f));

  const featureCoverages = featureFiles.map(file => {
    const featureId = file.split('/').pop()?.replace('.md', '') || 'unknown';
    return calculateFeatureCoverage(file, featureId, projectPath);
  });

  // Calculate summary
  const totalComponents = featureCoverages.reduce((sum, f) => sum + f.components.total, 0);
  const implementedComponents = featureCoverages.reduce((sum, f) => sum + f.components.implemented, 0);

  const totalInterfaces = featureCoverages.reduce((sum, f) => sum + f.interfaces.total, 0);
  const implementedInterfaces = featureCoverages.reduce((sum, f) => sum + f.interfaces.implemented, 0);

  const fullyImplemented = featureCoverages.filter(f =>
    f.components.total > 0 && f.components.missing === 0
  ).length;

  const partiallyImplemented = featureCoverages.filter(f =>
    f.components.implemented > 0 && f.components.missing > 0
  ).length;

  const notImplemented = featureCoverages.filter(f =>
    f.components.total > 0 && f.components.implemented === 0
  ).length;

  const undocumentedImplementations = featureCoverages.reduce((sum, f) =>
    sum + f.interfaces.details.filter(i => i.source === 'code').length, 0
  );

  return {
    features: featureCoverages,
    summary: {
      totalFeatures: featureCoverages.length,
      fullyImplemented,
      partiallyImplemented,
      notImplemented,

      totalComponents,
      implementedComponents,
      missingComponents: totalComponents - implementedComponents,

      totalInterfaces,
      implementedInterfaces,
      missingInterfaces: totalInterfaces - implementedInterfaces,

      undocumentedImplementations,
    },
  };
}

/**
 * Print implementation coverage report
 */
export function printImplementationCoverage(
  coverage: ProjectCoverage,
  options: { verbose?: boolean; featureId?: string } = {}
): void {
  const { verbose, featureId } = options;

  console.log('📊 Implementation Coverage Report\n');

  // Filter features if specific feature requested
  let features = coverage.features;
  if (featureId) {
    features = features.filter(f => f.featureId === featureId);
    if (features.length === 0) {
      console.log(`⚠️  Feature not found: ${featureId}`);
      return;
    }
  }

  // Print summary
  if (!featureId) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Summary\n');
    console.log(`Features: ${coverage.summary.totalFeatures}`);
    console.log(`├─ Fully Implemented: ${coverage.summary.fullyImplemented} (${((coverage.summary.fullyImplemented / coverage.summary.totalFeatures) * 100).toFixed(1)}%)`);
    console.log(`├─ Partially Implemented: ${coverage.summary.partiallyImplemented} (${((coverage.summary.partiallyImplemented / coverage.summary.totalFeatures) * 100).toFixed(1)}%)`);
    console.log(`└─ Not Implemented: ${coverage.summary.notImplemented} (${((coverage.summary.notImplemented / coverage.summary.totalFeatures) * 100).toFixed(1)}%)\n`);

    console.log(`Components: ${coverage.summary.totalComponents}`);
    console.log(`├─ Documented & Implemented: ${coverage.summary.implementedComponents} (${((coverage.summary.implementedComponents / coverage.summary.totalComponents) * 100).toFixed(1)}%)`);
    console.log(`└─ Documented but Missing: ${coverage.summary.missingComponents} (${((coverage.summary.missingComponents / coverage.summary.totalComponents) * 100).toFixed(1)}%)\n`);

    console.log(`Public Interfaces: ${coverage.summary.totalInterfaces}`);
    console.log(`├─ Defined & Implemented: ${coverage.summary.implementedInterfaces} (${((coverage.summary.implementedInterfaces / coverage.summary.totalInterfaces) * 100).toFixed(1)}%)`);
    console.log(`├─ Defined but Missing: ${coverage.summary.missingInterfaces} (${((coverage.summary.missingInterfaces / coverage.summary.totalInterfaces) * 100).toFixed(1)}%)`);
    console.log(`└─ Implemented but Undocumented: ${coverage.summary.undocumentedImplementations}\n`);
  }

  // Print per-feature details
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Features\n');

  for (const feature of features) {
    const status = feature.components.missing === 0 ? '✅' :
                   feature.components.implemented > 0 ? '🟡' : '❌';

    console.log(`${status} ${feature.featureId}`);
    console.log(`   ${feature.featureTitle}`);
    if (feature.entryPoint) {
      console.log(`   Entry Point: ${feature.entryPoint}`);
    }
    console.log(`   Status: ${feature.status}`);

    if (feature.components.total > 0) {
      console.log(`\n   📝 Components: ${feature.components.implemented}/${feature.components.total} implemented`);

      if (verbose) {
        for (const comp of feature.components.details) {
          const icon = comp.implemented ? '✅' : '❌';
          console.log(`      ${icon} ${comp.component.name} (${comp.component.filePath})`);

          if (comp.interfaceCoverage && comp.interfaceCoverage.expected > 0) {
            console.log(`         Methods: ${comp.interfaceCoverage.found}/${comp.interfaceCoverage.expected}`);
            if (comp.interfaceCoverage.missing.length > 0) {
              console.log(`         Missing: ${comp.interfaceCoverage.missing.join(', ')}`);
            }
          }
        }
      }
    }

    if (feature.tasks.total > 0) {
      console.log(`\n   📋 Tasks: ${feature.tasks.completed}/${feature.tasks.total} (${feature.tasks.percentage.toFixed(0)}%)`);
    }

    if (feature.codeReferences.missing.length > 0) {
      console.log(`\n   ⚠️  Missing Code Files:`);
      for (const missing of feature.codeReferences.missing) {
        console.log(`      - ${missing}`);
      }
    }

    console.log();
  }
}
