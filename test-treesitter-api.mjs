import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const code = 'import { foo } from "./bar";';
const tree = parser.parse(code);

console.log('Language object:', TypeScript.typescript);
console.log('\nQuery method exists?', typeof parser.getLanguage().query);

// Try to create a query
const Language = parser.getLanguage();
console.log('\nLanguage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(Language)));
