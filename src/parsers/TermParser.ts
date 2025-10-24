import type { TermDefinition, TermReference } from '../types/terminology.js';

/**
 * Parse term definitions and references from markdown
 */
export class TermParser {
  /**
   * Extract term definitions from markdown
   * Pattern: ## [[Term Name]]
   */
  static extractDefinitions(markdown: string, file: string): TermDefinition[] {
    const definitions: TermDefinition[] = [];

    // Pattern: ## [[Term]]
    const headingPattern = /^(#{2,})\s+\[\[([^\]]+)\]\]/gm;

    const lines = markdown.split('\n');

    // Track code block state
    const codeBlockRanges = this.findCodeBlockRanges(lines);

    let match;

    while ((match = headingPattern.exec(markdown)) !== null) {
      const heading = match[0];
      const level = match[1].length;
      const term = match[2];
      const line = markdown.substring(0, match.index).split('\n').length;

      // Skip if inside code block
      if (this.isInsideCodeBlock(line, codeBlockRanges)) {
        continue;
      }

      // Determine scope
      const scope = file.includes('GLOSSARY') ? 'global' : 'document';

      // Parse metadata and definition from content below heading
      const metadata = this.parseMetadata(markdown, match.index, lines, line - 1);

      definitions.push({
        term,
        file,
        line,
        heading,
        scope,
        ...metadata,
      });
    }

    return definitions;
  }

  /**
   * Parse metadata from content below heading
   */
  private static parseMetadata(
    markdown: string,
    headingIndex: number,
    lines: string[],
    headingLineIndex: number
  ): Partial<TermDefinition> {
    const metadata: Partial<TermDefinition> = {};

    // Find content until next heading or end
    let contentStart = headingLineIndex + 1;
    let contentEnd = contentStart;

    for (let i = contentStart; i < lines.length; i++) {
      if (lines[i].match(/^#{2,}\s/)) {
        contentEnd = i;
        break;
      }
      contentEnd = i + 1;
    }

    const content = lines.slice(contentStart, contentEnd).join('\n');

    // Parse **Key**: value patterns
    const typeMatch = content.match(/\*\*Type\*\*:\s*(\w+)/);
    if (typeMatch) {
      metadata.type = typeMatch[1] as any;
    }

    const aliasesMatch = content.match(/\*\*Aliases\*\*:\s*([^\n]+)/);
    if (aliasesMatch) {
      metadata.aliases = aliasesMatch[1]
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
    }

    const relatedMatch = content.match(/\*\*Related\*\*:\s*([^\n]+)/);
    if (relatedMatch) {
      // Extract [[Term]] references
      const relatedTerms: string[] = [];
      const termPattern = /\[\[([^\]]+)\]\]/g;
      let m;
      while ((m = termPattern.exec(relatedMatch[1])) !== null) {
        relatedTerms.push(m[1]);
      }
      metadata.related = relatedTerms;
    }

    const notToConfuseMatch = content.match(/\*\*Not to Confuse\*\*:\s*\[\[([^\]]+)\]\]/);
    if (notToConfuseMatch) {
      metadata.notToConfuse = notToConfuseMatch[1];
    }

    const parentMatch = content.match(/\*\*Parent\*\*:\s*\[\[([^\]]+)\]\]/);
    if (parentMatch) {
      metadata.parent = parentMatch[1];
    }

    // Extract first paragraph as definition (skip metadata lines)
    const contentLines = content.split('\n');
    let definitionLines: string[] = [];
    let inMetadata = true;

    for (const line of contentLines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (trimmed.length === 0) {
        if (inMetadata) {
          inMetadata = false; // End of metadata block
        }
        continue;
      }

      // Skip metadata lines (starting with **)
      if (trimmed.startsWith('**')) {
        continue;
      }

      // Skip code blocks, special sections
      if (trimmed.startsWith('```') || trimmed.startsWith('---')) {
        break;
      }

      // Collect definition lines (stop at next section marker)
      if (!inMetadata) {
        definitionLines.push(trimmed);

        // Stop at first complete paragraph (next empty line or section)
        if (definitionLines.length > 0) {
          // Check if next lines start a new section
          const nextLineIndex = contentLines.indexOf(line) + 1;
          if (
            nextLineIndex < contentLines.length &&
            (contentLines[nextLineIndex].trim() === '' ||
              contentLines[nextLineIndex].trim().startsWith('**') ||
              contentLines[nextLineIndex].trim().startsWith('---'))
          ) {
            break;
          }
        }
      }
    }

    if (definitionLines.length > 0) {
      metadata.definition = definitionLines.join(' ').trim();
    }

    return metadata;
  }

  /**
   * Extract term references from markdown
   * Pattern: [[Term]] (not in heading)
   */
  static extractReferences(markdown: string, file: string): TermReference[] {
    const references: TermReference[] = [];
    const lines = markdown.split('\n');

    // Track code block state
    const codeBlockRanges = this.findCodeBlockRanges(lines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip headings (definitions)
      if (line.match(/^#{2,}\s+\[\[/)) {
        continue;
      }

      // Skip if inside code block
      if (this.isInsideCodeBlock(i + 1, codeBlockRanges)) {
        continue;
      }

      // Extract [[Term]] references
      const pattern = /\[\[([^\]]+)\]\]/g;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        references.push({
          term: match[1],
          file,
          line: i + 1,
          context: line.trim(),
        });
      }
    }

    return references;
  }

  /**
   * Find all code block ranges in markdown
   */
  private static findCodeBlockRanges(lines: string[]): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let inCodeBlock = false;
    let blockStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true;
          blockStart = i + 1; // Line numbers are 1-indexed
        } else {
          // End of code block
          inCodeBlock = false;
          ranges.push([blockStart, i + 1]);
        }
      }
    }

    // Handle unclosed code block
    if (inCodeBlock && blockStart !== -1) {
      ranges.push([blockStart, lines.length]);
    }

    return ranges;
  }

  /**
   * Check if a line is inside a code block
   */
  private static isInsideCodeBlock(
    lineNumber: number,
    codeBlockRanges: Array<[number, number]>
  ): boolean {
    for (const [start, end] of codeBlockRanges) {
      if (lineNumber >= start && lineNumber <= end) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if file is a glossary
   */
  static isGlossary(file: string): boolean {
    return file.toLowerCase().includes('glossary');
  }
}
