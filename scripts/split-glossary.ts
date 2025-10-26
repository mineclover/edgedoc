#!/usr/bin/env bun
/**
 * Split GLOSSARY.md into individual term files in docs/terms/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const glossaryPath = 'docs/GLOSSARY.md';
const termsDir = 'docs/terms';

// Ensure terms directory exists
mkdirSync(termsDir, { recursive: true });

// Read GLOSSARY
const content = readFileSync(glossaryPath, 'utf-8');
const lines = content.split('\n');

// Parse terms
interface Term {
  name: string;
  content: string[];
}

const terms: Term[] = [];
let currentTerm: Term | null = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check for term heading: ## [[Term Name]]
  const match = line.match(/^##\s+\[\[([^\]]+)\]\]/);

  if (match) {
    // Save previous term
    if (currentTerm) {
      terms.push(currentTerm);
    }

    // Start new term
    currentTerm = {
      name: match[1],
      content: [line], // Include the heading
    };
  } else if (currentTerm) {
    // Add line to current term
    currentTerm.content.push(line);
  }
}

// Save last term
if (currentTerm) {
  terms.push(currentTerm);
}

// Write individual term files
for (const term of terms) {
  // Create filename from term name
  const filename = term.name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();

  const filepath = join(termsDir, `${filename}.md`);

  // Trim empty lines at end
  while (term.content.length > 0 && term.content[term.content.length - 1].trim() === '') {
    term.content.pop();
  }

  // Remove separator line at end
  if (term.content.length > 0 && term.content[term.content.length - 1].trim() === '---') {
    term.content.pop();
  }

  // Trim again
  while (term.content.length > 0 && term.content[term.content.length - 1].trim() === '') {
    term.content.pop();
  }

  const fileContent = term.content.join('\n') + '\n';

  writeFileSync(filepath, fileContent, 'utf-8');
  console.log(`✅ Created: ${filepath}`);
}

console.log(`\n📊 총 ${terms.length}개 용어 파일 생성됨\n`);
