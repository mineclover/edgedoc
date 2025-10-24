import { TypeScriptParser } from '../../src/parsers/TypeScriptParser.js';

/**
 * Manual Test: Tree-sitter TypeScript Parser
 *
 * This test validates the TypeScriptParser's ability to extract imports and exports
 * from TypeScript/TSX source code.
 *
 * Run: bun tests/manual/tree-sitter-parser.test.ts
 */

const parser = new TypeScriptParser();

console.log('🧪 Testing Tree-sitter TypeScript Parser\n');

// Test 1: Named Imports
console.log('Test 1: Named Imports');
const namedImports = `
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TypeScriptParser } from './parsers/TypeScriptParser.js';
`;

const result1 = parser.parse(namedImports, false);
console.log('  Imports found:', result1.imports.length);
console.log('  Sources:', result1.imports.map(i => i.source));
if (result1.imports.length !== 3) {
  throw new Error(`Expected 3 imports, found ${result1.imports.length}`);
}
if (!result1.imports.some(i => i.source === 'node:fs')) {
  throw new Error('Should find node:fs import');
}
if (!result1.imports.some(i => i.source === './parsers/TypeScriptParser.js')) {
  throw new Error('Should find .js import');
}
console.log('  ✅ Passed\n');

// Test 2: Default Imports
console.log('Test 2: Default Imports');
const defaultImports = `
import React from 'react';
import Parser from 'tree-sitter';
`;

const result2 = parser.parse(defaultImports, false);
console.log('  Imports found:', result2.imports.length);
console.log('  Sources:', result2.imports.map(i => i.source));
if (result2.imports.length !== 2) {
  throw new Error(`Expected 2 imports, found ${result2.imports.length}`);
}
if (!result2.imports.some(i => i.source === 'react')) {
  throw new Error('Should find react import');
}
console.log('  ✅ Passed\n');

// Test 3: Type-only Imports
console.log('Test 3: Type-only Imports');
const typeImports = `
import type { SyncOptions, SyncResult } from '../shared/types.js';
import { type ValidationOptions } from './tools.js';
`;

const result3 = parser.parse(typeImports, false);
console.log('  Imports found:', result3.imports.length);
console.log('  Sources:', result3.imports.map(i => i.source));
if (result3.imports.length !== 2) {
  throw new Error(`Expected 2 imports, found ${result3.imports.length}`);
}
console.log('  ✅ Passed\n');

// Test 4: Namespace Imports
console.log('Test 4: Namespace Imports');
const namespaceImports = `
import * as Utils from './utils.js';
import * as path from 'node:path';
`;

const result4 = parser.parse(namespaceImports, false);
console.log('  Imports found:', result4.imports.length);
console.log('  Sources:', result4.imports.map(i => i.source));
if (result4.imports.length !== 2) {
  throw new Error(`Expected 2 imports, found ${result4.imports.length}`);
}
console.log('  ✅ Passed\n');

// Test 5: Named Exports
console.log('Test 5: Named Exports');
const namedExports = `
export interface SyncOptions {
  projectPath?: string;
  dryRun?: boolean;
}

export type Status = 'active' | 'inactive';

export const VERSION = '1.0.0';

export function syncCodeRefs() {}

export class TypeScriptParser {}
`;

const result5 = parser.parse(namedExports, false);
console.log('  Exports found:', result5.exports.length);
console.log('  Names:', result5.exports.map(e => e.name));
if (result5.exports.length !== 5) {
  throw new Error(`Expected 5 exports, found ${result5.exports.length}`);
}
const expectedExports = ['SyncOptions', 'Status', 'VERSION', 'syncCodeRefs', 'TypeScriptParser'];
for (const expected of expectedExports) {
  if (!result5.exports.some(e => e.name === expected)) {
    throw new Error(`Should find export: ${expected}`);
  }
}
console.log('  ✅ Passed\n');

// Test 6: TSX Support
console.log('Test 6: TSX Support');
const tsxCode = `
import React from 'react';
import type { Props } from './types.js';

export interface ButtonProps {
  label: string;
}

export function Button({ label }: ButtonProps) {
  return <button>{label}</button>;
}
`;

const result6 = parser.parse(tsxCode, true);
console.log('  Imports found:', result6.imports.length);
console.log('  Exports found:', result6.exports.length);
if (result6.imports.length !== 2) {
  throw new Error(`Expected 2 imports, found ${result6.imports.length}`);
}
if (result6.exports.length !== 2) {
  throw new Error(`Expected 2 exports (ButtonProps, Button), found ${result6.exports.length}`);
}
console.log('  ✅ Passed\n');

// Test 7: Complex Real-world Example
console.log('Test 7: Complex Real-world Example (sync.ts snippet)');
const complexCode = `
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { SyncResult, SyncOptions } from '../shared/types.js';
import { TypeScriptParser } from '../parsers/TypeScriptParser.js';

interface CodeFile {
  path: string;
  exports: string[];
}

export async function syncCodeRefs(options: SyncOptions = {}): Promise<SyncResult> {
  const parser = new TypeScriptParser();
  return { success: true };
}
`;

const result7 = parser.parse(complexCode, false);
console.log('  Imports found:', result7.imports.length);
console.log('  Exports found:', result7.exports.length);
if (result7.imports.length !== 4) {
  throw new Error(`Expected 4 imports, found ${result7.imports.length}`);
}
if (result7.exports.length !== 1) {
  throw new Error(`Expected 1 export (syncCodeRefs), found ${result7.exports.length}`);
}
console.log('  ✅ Passed\n');

console.log('━'.repeat(50));
console.log('✅ All tests passed!');
console.log('━'.repeat(50));
