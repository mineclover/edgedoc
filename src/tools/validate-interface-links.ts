import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferenceIndex } from '../types/reference-index.js';

export interface InterfaceHierarchy {
  namespace: string;
  path: string[];
  level: number;
  parent: string;
  name: string;
}

export interface BidirectionalLinkResult {
  missingProviders: {
    interfaceId: string;
    usedBy: string[];
  }[];
  unusedInterfaces: {
    interfaceId: string;
    providedBy: string[];
  }[];
}

export interface SiblingCoverageResult {
  namespace: string;
  feature: string;
  allSiblings: string[];
  provided: string[];
  missing: string[];
}

export interface InterfaceValidationResult {
  bidirectional: BidirectionalLinkResult;
  incompleteCoverage: SiblingCoverageResult[];
  summary: {
    totalInterfaces: number;
    errorCount: number;
    warningCount: number;
  };
}

/**
 * Parse interface ID into hierarchy information
 */
export function parseInterfaceHierarchy(interfaceId: string): InterfaceHierarchy {
  const parts = interfaceId.split('/');

  return {
    namespace: parts[0],
    path: parts,
    level: parts.length - 1,
    parent: parts.slice(0, -1).join('/') || '',
    name: parts[parts.length - 1],
  };
}

/**
 * Get sibling interfaces (same parent namespace)
 */
export function getSiblings(interfaceId: string, allInterfaces: string[]): string[] {
  const { parent } = parseInterfaceHierarchy(interfaceId);

  // Skip if no parent (top-level interface)
  if (!parent) return [];

  return allInterfaces.filter((id) => {
    if (id === interfaceId) return false;
    const { parent: otherParent } = parseInterfaceHierarchy(id);
    return otherParent === parent;
  });
}

/**
 * Group interfaces by namespace
 */
export function groupByNamespace(interfaces: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const interfaceId of interfaces) {
    const { namespace } = parseInterfaceHierarchy(interfaceId);
    const existing = groups.get(namespace) || [];
    existing.push(interfaceId);
    groups.set(namespace, existing);
  }

  return groups;
}

/**
 * Check bidirectional links (provides ↔ uses)
 */
export function checkBidirectionalLinks(index: ReferenceIndex): BidirectionalLinkResult {
  const providers = new Map<string, string[]>();
  const users = new Map<string, string[]>();

  // Collect all providers and users
  for (const [featureId, feature] of Object.entries(index.features)) {
    for (const interfaceId of feature.interfaces.provides) {
      const existing = providers.get(interfaceId) || [];
      existing.push(featureId);
      providers.set(interfaceId, existing);
    }

    for (const interfaceId of feature.interfaces.uses) {
      const existing = users.get(interfaceId) || [];
      existing.push(featureId);
      users.set(interfaceId, existing);
    }
  }

  // Find missing providers (used but not provided)
  const missingProviders: BidirectionalLinkResult['missingProviders'] = [];
  for (const [interfaceId, usedBy] of users.entries()) {
    if (!providers.has(interfaceId)) {
      missingProviders.push({ interfaceId, usedBy });
    }
  }

  // Find unused interfaces (provided but never used)
  const unusedInterfaces: BidirectionalLinkResult['unusedInterfaces'] = [];
  for (const [interfaceId, providedBy] of providers.entries()) {
    if (!users.has(interfaceId)) {
      unusedInterfaces.push({ interfaceId, providedBy });
    }
  }

  return { missingProviders, unusedInterfaces };
}

/**
 * Check sibling coverage (same namespace interfaces)
 */
export function checkSiblingCoverage(index: ReferenceIndex): SiblingCoverageResult[] {
  const results: SiblingCoverageResult[] = [];
  const allInterfaces = Object.keys(index.interfaces);

  // For each feature, check if it provides partial siblings
  for (const [featureId, feature] of Object.entries(index.features)) {
    const provides = feature.interfaces.provides;

    if (provides.length === 0) continue;

    // Group provided interfaces by parent namespace
    const byParent = new Map<string, string[]>();

    for (const interfaceId of provides) {
      const { parent } = parseInterfaceHierarchy(interfaceId);

      // Skip top-level (no parent)
      if (!parent) continue;

      const existing = byParent.get(parent) || [];
      existing.push(interfaceId);
      byParent.set(parent, existing);
    }

    // Check each parent namespace
    for (const [parent, providedInParent] of byParent.entries()) {
      // Find all siblings in this parent namespace
      const allInParent = allInterfaces.filter((id) => {
        const { parent: idParent } = parseInterfaceHierarchy(id);
        return idParent === parent;
      });

      // If providing only some siblings, warn
      if (providedInParent.length < allInParent.length) {
        const missing = allInParent.filter((id) => !providedInParent.includes(id));

        results.push({
          namespace: parent,
          feature: featureId,
          allSiblings: allInParent,
          provided: providedInParent,
          missing,
        });
      }
    }
  }

  return results;
}

/**
 * Validate all interface links
 */
export function validateInterfaceLinks(
  projectPath: string,
  options?: {
    feature?: string;
    namespace?: string;
  }
): InterfaceValidationResult {
  const indexPath = join(projectPath, '.edgedoc', 'references.json');

  if (!existsSync(indexPath)) {
    throw new Error('Reference index not found. Run "edgedoc graph build" first.');
  }

  const indexContent = readFileSync(indexPath, 'utf-8');
  const index: ReferenceIndex = JSON.parse(indexContent);

  // Apply filters if provided
  let filteredIndex = index;

  if (options?.feature) {
    const feature = index.features[options.feature];
    if (!feature) {
      throw new Error(`Feature "${options.feature}" not found in index.`);
    }
    filteredIndex = {
      ...index,
      features: { [options.feature]: feature },
    };
  }

  if (options?.namespace) {
    const namespacePrefix = options.namespace + '/';
    filteredIndex = {
      ...filteredIndex,
      interfaces: Object.fromEntries(
        Object.entries(index.interfaces).filter(
          ([id]) => id.startsWith(namespacePrefix) || id === options.namespace
        )
      ),
    };
  }

  // Run checks
  const bidirectional = checkBidirectionalLinks(filteredIndex);
  const incompleteCoverage = checkSiblingCoverage(filteredIndex);

  const totalInterfaces = Object.keys(filteredIndex.interfaces).length;
  const errorCount = bidirectional.missingProviders.length;
  const warningCount = bidirectional.unusedInterfaces.length + incompleteCoverage.length;

  return {
    bidirectional,
    incompleteCoverage,
    summary: {
      totalInterfaces,
      errorCount,
      warningCount,
    },
  };
}

/**
 * Print validation results
 */
export function printValidationResults(result: InterfaceValidationResult, verbose = false): void {
  console.log('🔍 Interface Validation\n');

  // Bidirectional link check
  console.log('━━━ Bidirectional Link Check ━━━\n');

  if (result.bidirectional.missingProviders.length > 0) {
    console.log(`❌ Missing providers (${result.bidirectional.missingProviders.length}):`);
    for (const { interfaceId, usedBy } of result.bidirectional.missingProviders) {
      console.log(`   • ${interfaceId} (used by: ${usedBy.join(', ')})`);
    }
    console.log();
  }

  if (result.bidirectional.unusedInterfaces.length > 0) {
    console.log(`⚠️  Unused interfaces (${result.bidirectional.unusedInterfaces.length}):`);
    for (const { interfaceId, providedBy } of result.bidirectional.unusedInterfaces) {
      console.log(`   • ${interfaceId} (provided by: ${providedBy.join(', ')})`);
    }
    console.log();
  }

  if (
    result.bidirectional.missingProviders.length === 0 &&
    result.bidirectional.unusedInterfaces.length === 0
  ) {
    console.log('✅ All interfaces have matching providers and users\n');
  }

  // Sibling coverage check
  console.log('━━━ Sibling Coverage Check ━━━\n');

  if (result.incompleteCoverage.length > 0) {
    for (const coverage of result.incompleteCoverage) {
      console.log(`⚠️  Incomplete coverage in namespace "${coverage.namespace}/":`);
      console.log(`   Feature: ${coverage.feature}`);
      console.log(`   Provides: ${coverage.provided.length}/${coverage.allSiblings.length} siblings`);

      if (verbose) {
        for (const interfaceId of coverage.allSiblings) {
          const isProvided = coverage.provided.includes(interfaceId);
          const icon = isProvided ? '✅' : '❌';
          console.log(`     ${icon} ${interfaceId}`);
        }
      } else {
        // Just show missing
        for (const interfaceId of coverage.missing) {
          console.log(`     ❌ ${interfaceId}`);
        }
      }

      console.log(
        '   💡 Consider documenting all related interfaces or splitting into separate features.\n'
      );
    }
  } else {
    console.log('✅ All features provide complete sibling coverage\n');
  }

  // Summary
  console.log('━━━ Summary ━━━');
  console.log(`✅ ${result.summary.totalInterfaces} interfaces validated`);

  if (result.summary.errorCount > 0) {
    console.log(`❌ ${result.summary.errorCount} errors (missing providers)`);
  }

  if (result.summary.warningCount > 0) {
    console.log(`⚠️  ${result.summary.warningCount} warnings (unused + incomplete coverage)`);
  }

  if (result.summary.errorCount === 0 && result.summary.warningCount === 0) {
    console.log('🎉 No issues found!');
  }

  console.log();
}
