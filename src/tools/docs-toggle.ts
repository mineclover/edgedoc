import { readFileSync, writeFileSync } from 'node:fs';

export interface DetailsBlock {
  index: number;
  start: number;
  end: number;
  summary: string;
  isOpen: boolean;
}

/**
 * Find all <details> blocks in markdown content
 */
export function findDetailsBlocks(content: string): DetailsBlock[] {
  const lines = content.split('\n');
  const blocks: DetailsBlock[] = [];
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for <details> or <details open>
    if (line.trim().startsWith('<details')) {
      const isOpen = line.includes('open');
      let summary = '';
      let endLine = -1;

      // Find the summary and closing tag
      let inSummary = false;
      const summaryLines: string[] = [];

      for (let j = i + 1; j < lines.length; j++) {
        const currentLine = lines[j];

        // Single-line summary
        if (currentLine.includes('<summary>') && currentLine.includes('</summary>')) {
          const summaryMatch = currentLine.match(/<summary>(.*?)<\/summary>/);
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          }
        }
        // Multi-line summary start
        else if (currentLine.includes('<summary>')) {
          inSummary = true;
          const text = currentLine.replace('<summary>', '').trim();
          if (text) summaryLines.push(text);
        }
        // Multi-line summary content
        else if (inSummary && !currentLine.includes('</summary>')) {
          const text = currentLine.trim();
          if (text) summaryLines.push(text);
        }
        // Multi-line summary end
        else if (inSummary && currentLine.includes('</summary>')) {
          inSummary = false;
          const text = currentLine.replace('</summary>', '').trim();
          if (text) summaryLines.push(text);
          summary = summaryLines.join(' ');
        }

        // Find closing tag
        if (currentLine.trim() === '</details>') {
          endLine = j;
          break;
        }
      }

      if (endLine !== -1) {
        blocks.push({
          index: blockIndex++,
          start: i,
          end: endLine,
          summary: summary || '(no summary)',
          isOpen,
        });
      }
    }
  }

  return blocks;
}

/**
 * List all details blocks in a file
 */
export function listDetailsBlocks(filePath: string): DetailsBlock[] {
  const content = readFileSync(filePath, 'utf-8');
  return findDetailsBlocks(content);
}

/**
 * Print details blocks list
 */
export function printDetailsBlocks(filePath: string, blocks: DetailsBlock[]): void {
  console.log(`📄 File: ${filePath}\n`);

  if (blocks.length === 0) {
    console.log('No <details> blocks found.\n');
    return;
  }

  console.log(`Found ${blocks.length} <details> block(s):\n`);

  for (const block of blocks) {
    const status = block.isOpen ? '📖 open' : '📕 closed';
    console.log(`[${block.index}] ${status}`);
    console.log(`    ${block.summary}`);
    console.log(`    Lines: ${block.start + 1}-${block.end + 1}\n`);
  }
}

/**
 * Toggle details blocks (open/close)
 */
export function toggleDetailsBlocks(
  filePath: string,
  options: {
    indices?: number[];
    all?: boolean;
    open: boolean;
  }
): { modified: number; total: number } {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const blocks = findDetailsBlocks(content);

  if (blocks.length === 0) {
    return { modified: 0, total: 0 };
  }

  let modified = 0;
  const targetBlocks = options.all
    ? blocks
    : blocks.filter((b) => options.indices?.includes(b.index));

  for (const block of targetBlocks) {
    const line = lines[block.start];

    if (options.open) {
      // Open: ensure 'open' attribute
      if (!block.isOpen) {
        lines[block.start] = line.replace('<details', '<details open');
        modified++;
      }
    } else {
      // Close: remove 'open' attribute
      if (block.isOpen) {
        lines[block.start] = line.replace(/\s*open/, '');
        modified++;
      }
    }
  }

  if (modified > 0) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return { modified, total: targetBlocks.length };
}

/**
 * Open details blocks
 */
export function openDetailsBlocks(
  filePath: string,
  options: { indices?: number[]; all?: boolean }
): { modified: number; total: number } {
  return toggleDetailsBlocks(filePath, { ...options, open: true });
}

/**
 * Close details blocks
 */
export function closeDetailsBlocks(
  filePath: string,
  options: { indices?: number[]; all?: boolean }
): { modified: number; total: number } {
  return toggleDetailsBlocks(filePath, { ...options, open: false });
}
