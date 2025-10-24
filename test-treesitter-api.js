const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript');

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const code = 'import { foo } from "./bar";';
const tree = parser.parse(code);

console.log('Tree rootNode type:', tree.rootNode.type);
console.log('\nLanguage object type:', typeof TypeScript.typescript);
console.log('Language object:', TypeScript.typescript);
console.log('\nParser methods:', Object.getOwnPropertyNames(Parser.prototype));
console.log('\nLanguage methods:', Object.getOwnPropertyNames(TypeScript.typescript));
