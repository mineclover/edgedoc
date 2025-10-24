import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ParserFactory } from '../parsers/ParserFactory.js';

/**
 * Entry point module information
 */
export interface EntryPointModule {
  file: string;
  type: 'cli' | 'api' | 'library';
  publicInterfaces: string[];
  reason: string;
  importCount?: number;
}

/**
 * Detect entry point modules in a project
 */
export class EntryPointDetector {
  /**
   * Detect all entry point modules
   */
  static detect(projectPath: string): EntryPointModule[] {
    const entryPoints: EntryPointModule[] = [];

    // 1. CLI entry points (common patterns)
    const cliPatterns = [
      'src/cli.ts',
      'src/index.ts',
      'src/main.ts',
      'cli.ts',
      'index.ts',
    ];

    for (const pattern of cliPatterns) {
      const filePath = join(projectPath, pattern);
      if (existsSync(filePath)) {
        entryPoints.push({
          file: pattern,
          type: 'cli',
          publicInterfaces: this.extractExports(filePath),
          reason: 'CLI entry point',
        });
      }
    }

    // 2. Package.json analysis
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

        // Main entry point
        if (pkg.main) {
          const mainFile = pkg.main.replace(/^\.\//, '').replace(/^dist\//, 'src/');
          const mainPath = join(projectPath, mainFile);
          if (existsSync(mainPath)) {
            entryPoints.push({
              file: mainFile,
              type: 'library',
              publicInterfaces: this.extractExports(mainPath),
              reason: 'package.json "main" field',
            });
          }
        }

        // Bin entry points
        if (pkg.bin) {
          const bins = typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : pkg.bin;
          for (const [name, binPath] of Object.entries(bins)) {
            const cleanPath = (binPath as string).replace(/^\.\//, '').replace(/^dist\//, 'src/');
            const fullPath = join(projectPath, cleanPath);
            if (existsSync(fullPath)) {
              entryPoints.push({
                file: cleanPath,
                type: 'cli',
                publicInterfaces: this.extractExports(fullPath),
                reason: `package.json "bin.${name}" field`,
              });
            }
          }
        }

        // Exports field (modern)
        if (pkg.exports) {
          const exports = typeof pkg.exports === 'string' ? { '.': pkg.exports } : pkg.exports;
          for (const [exportName, exportPath] of Object.entries(exports)) {
            if (typeof exportPath === 'string') {
              const cleanPath = exportPath.replace(/^\.\//, '').replace(/^dist\//, 'src/');
              const fullPath = join(projectPath, cleanPath);
              if (existsSync(fullPath)) {
                entryPoints.push({
                  file: cleanPath,
                  type: 'library',
                  publicInterfaces: this.extractExports(fullPath),
                  reason: `package.json "exports['${exportName}']" field`,
                });
              }
            }
          }
        }
      } catch (error) {
        // Invalid package.json
      }
    }

    // 3. Documentation-defined entry points
    const docsEntryPoints = this.detectFromDocs(projectPath);
    entryPoints.push(...docsEntryPoints);

    return this.deduplicate(entryPoints);
  }

  /**
   * Extract entry points from documentation
   */
  private static detectFromDocs(projectPath: string): EntryPointModule[] {
    const entryPoints: EntryPointModule[] = [];
    const tasksPath = join(projectPath, 'tasks', 'features');

    if (!existsSync(tasksPath)) {
      return entryPoints;
    }

    // Parse all feature docs for entry_point field
    const { readdirSync } = require('node:fs');
    const files = readdirSync(tasksPath).filter((f: string) => f.endsWith('.md'));

    for (const file of files) {
      const content = readFileSync(join(tasksPath, file), 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const entryPointMatch = frontmatter.match(/entry_point:\s*"([^"]+)"/);

        if (entryPointMatch) {
          const entryPoint = entryPointMatch[1].split(':')[0]; // Remove line numbers
          const filePath = join(projectPath, entryPoint);

          if (existsSync(filePath)) {
            entryPoints.push({
              file: entryPoint,
              type: 'api',
              publicInterfaces: this.extractExports(filePath),
              reason: `Marked in ${file}`,
            });
          }
        }
      }
    }

    return entryPoints;
  }

  /**
   * Extract public exports from a file
   */
  private static extractExports(filePath: string): string[] {
    try {
      const parser = ParserFactory.getParser(filePath);
      if (!parser) {
        return [];
      }

      const content = readFileSync(filePath, 'utf-8');
      const { exports } = parser.parse(content, filePath);

      // Return export names
      return exports.map(exp => exp.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Deduplicate entry points
   */
  private static deduplicate(entryPoints: EntryPointModule[]): EntryPointModule[] {
    const seen = new Map<string, EntryPointModule>();

    for (const ep of entryPoints) {
      if (!seen.has(ep.file)) {
        seen.set(ep.file, ep);
      } else {
        // Merge reasons
        const existing = seen.get(ep.file)!;
        existing.reason += `, ${ep.reason}`;

        // Merge public interfaces (deduplicate)
        const allInterfaces = new Set([
          ...existing.publicInterfaces,
          ...ep.publicInterfaces,
        ]);
        existing.publicInterfaces = Array.from(allInterfaces);
      }
    }

    return Array.from(seen.values()).sort((a, b) => a.file.localeCompare(b.file));
  }

  /**
   * Pretty print entry points
   */
  static print(entryPoints: EntryPointModule[]): void {
    console.log('\n📍 Detected Entry Points:\n');

    if (entryPoints.length === 0) {
      console.log('   No entry points detected.\n');
      return;
    }

    for (let i = 0; i < entryPoints.length; i++) {
      const ep = entryPoints[i];
      const icon = ep.type === 'cli' ? '🚀' : ep.type === 'library' ? '📦' : '🔧';

      console.log(`${i + 1}. ${icon} ${ep.file}`);
      console.log(`   Type: ${ep.type}`);
      console.log(`   Reason: ${ep.reason}`);

      if (ep.publicInterfaces.length > 0) {
        console.log(`   Public Interfaces: ${ep.publicInterfaces.length}`);
        const preview = ep.publicInterfaces.slice(0, 3);
        console.log(`     - ${preview.join(', ')}${ep.publicInterfaces.length > 3 ? '...' : ''}`);
      }

      console.log();
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Summary: ${entryPoints.length} entry points detected\n`);
  }
}
