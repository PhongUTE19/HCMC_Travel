import fs from 'fs';
import path from 'path';

/**
 * Parses markdown files in the specified directory into section-based chunks.
 * Each section starting with '## ' becomes an independent chunk.
 * 
 * @param {string} knowledgeDir - Path to knowledge markdown directory
 * @returns {Array<{id: string, title: string, content: string, source: string}>}
 */
export function loadAndChunkMarkdown(knowledgeDir) {
  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(`Knowledge directory does not exist: ${knowledgeDir}`);
  }

  const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
  const chunks = [];

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const baseId = path.basename(file, '.md');

    // Split content by markdown level-2 header '## '
    const lines = content.split('\n');
    let currentTitle = '';
    let currentLines = [];
    let sectionIndex = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section if present
        if (currentTitle && currentLines.length > 0) {
          const sectionContent = currentLines.join('\n').trim();
          if (sectionContent) {
            chunks.push({
              id: `${baseId}_${sectionIndex}`,
              title: currentTitle,
              content: sectionContent,
              source: file,
            });
            sectionIndex++;
          }
        }
        currentTitle = line.replace('## ', '').trim();
        currentLines = [];
      } else if (currentTitle) {
        currentLines.push(line);
      }
    }

    // Push the final section in the file
    if (currentTitle && currentLines.length > 0) {
      const sectionContent = currentLines.join('\n').trim();
      if (sectionContent) {
        chunks.push({
          id: `${baseId}_${sectionIndex}`,
          title: currentTitle,
          content: sectionContent,
          source: file,
        });
      }
    }
  }

  return chunks;
}
