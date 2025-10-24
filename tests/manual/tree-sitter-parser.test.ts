import { TypeScriptParser } from '../../src/parsers/TypeScriptParser.js';
import { PythonParser } from '../../src/parsers/PythonParser.js';

/**
 * Manual Test: Tree-sitter Parsers
 *
 * This test validates the TypeScriptParser and PythonParser's ability to extract
 * imports and exports from source code.
 *
 * Run: bun tests/manual/tree-sitter-parser.test.ts
 */

const tsParser = new TypeScriptParser();
const pyParser = new PythonParser();

console.log('🧪 Testing Tree-sitter TypeScript Parser\n');

// Test 1: Named Imports
console.log('Test 1: Named Imports');
const namedImports = `
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TypeScriptParser } from './parsers/TypeScriptParser.js';
`;

const result1 = tsParser.parse(namedImports, 'test.ts');
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

const result2 = tsParser.parse(defaultImports, 'test.ts');
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

const result3 = tsParser.parse(typeImports, "test.ts");
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

const result4 = tsParser.parse(namespaceImports, "test.ts");
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

const result5 = tsParser.parse(namedExports, "test.ts");
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

const result6 = tsParser.parse(tsxCode, "test.tsx");
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

const result7 = tsParser.parse(complexCode, "test.ts");
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
console.log('✅ All TypeScript tests passed!\n');

// Python Tests
console.log('🐍 Testing Tree-sitter Python Parser\n');

// Test 8: Python imports
console.log('Test 8: Python Imports');
const pythonImports = `
import os
import sys
from typing import List, Dict
from pathlib import Path
from . import utils
`;

const result8 = pyParser.parse(pythonImports, 'test.py');
console.log('  Imports found:', result8.imports.length);
console.log('  Sources:', result8.imports.map(i => i.source));
if (result8.imports.length !== 5) {
  throw new Error(`Expected 5 imports, found ${result8.imports.length}`);
}
if (!result8.imports.some(i => i.source === 'os')) {
  throw new Error('Should find os import');
}
if (!result8.imports.some(i => i.source === 'typing')) {
  throw new Error('Should find typing import');
}
console.log('  ✅ Passed\n');

// Test 9: Python function and class exports
console.log('Test 9: Python Exports');
const pythonExports = `
def hello_world():
    print("Hello")

class MyClass:
    def __init__(self):
        pass

VERSION = "1.0.0"

def _private_function():
    pass

_PRIVATE_VAR = "secret"
`;

const result9 = pyParser.parse(pythonExports, 'test.py');
console.log('  Exports found:', result9.exports.length);
console.log('  Names:', result9.exports.map(e => e.name));
if (result9.exports.length !== 3) {
  throw new Error(`Expected 3 exports (hello_world, MyClass, VERSION), found ${result9.exports.length}`);
}
const expectedPyExports = ['hello_world', 'MyClass', 'VERSION'];
for (const expected of expectedPyExports) {
  if (!result9.exports.some(e => e.name === expected)) {
    throw new Error(`Should find export: ${expected}`);
  }
}
// Verify private names are excluded
if (result9.exports.some(e => e.name.startsWith('_'))) {
  throw new Error('Should not export private names starting with _');
}
console.log('  ✅ Passed\n');

// Test 10: Python complex example
console.log('Test 10: Python Complex Example');
const pythonComplex = `
from typing import Optional, List
import json
from .utils import helper_function

class DataProcessor:
    def __init__(self, config: dict):
        self.config = config

    def process(self, data: List[str]) -> Optional[dict]:
        return {"result": "processed"}

def main():
    processor = DataProcessor({})
    return processor.process([])

CONSTANT = 42
`;

const result10 = pyParser.parse(pythonComplex, 'test.py');
console.log('  Imports found:', result10.imports.length);
console.log('  Exports found:', result10.exports.length);
if (result10.imports.length !== 3) {
  throw new Error(`Expected 3 imports, found ${result10.imports.length}`);
}
if (result10.exports.length !== 3) {
  throw new Error(`Expected 3 exports (DataProcessor, main, CONSTANT), found ${result10.exports.length}`);
}
console.log('  ✅ Passed\n');

console.log('━'.repeat(50));
console.log('✅ All tests passed! (TypeScript + Python)');
console.log('━'.repeat(50));
