import fs from 'fs';
import path from 'path';

export interface Chunk {
  id: string;
  sourceId: string;
  title: string;
  url: string | null;
  section?: string;
  content: string;
}

const MAX_CHUNK_LENGTH = 3200; // ~800 tokens

function extractMetadata(content: string, relativePath: string): { url: string | null, title: string, sourceId: string, cleanContent: string } {
  let url: string | null = null;
  let title = '';
  const lines = content.split('\n');

  if (lines[0] && lines[0].startsWith('Original link: ')) {
    const rawUrl = lines[0].replace('Original link: ', '').trim();
    if (rawUrl && rawUrl !== 'about:blank' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      url = rawUrl;
    }
    lines.shift();
  }

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
      title = path.basename(relativePath, '.md');
  }

  const cleanContent = lines.join('\n').trim();

  return {
    url,
    title,
    sourceId: relativePath,
    cleanContent
  };
}

function splitIntoSubchunks(content: string, maxLen: number): string[] {
  if (content.length <= maxLen) return [content];
  
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\s*\n/);
  
  let currentChunk = '';
  
  for (const p of paragraphs) {
    if (currentChunk.length + p.length + 2 > maxLen) {
      if (currentChunk) chunks.push(currentChunk.trim());
      
      if (p.length > maxLen) {
         // Fallback if a single paragraph is too large
         const sentences = p.split(/([.?!])\s+/);
         let currentSentenceChunk = '';
         for (let i = 0; i < sentences.length; i += 2) {
             const sentence = sentences[i] + (sentences[i+1] || '');
             if(currentSentenceChunk.length + sentence.length > maxLen) {
                 if(currentSentenceChunk) chunks.push(currentSentenceChunk.trim());
                 currentSentenceChunk = sentence;
             } else {
                 currentSentenceChunk += (currentSentenceChunk ? ' ' : '') + sentence;
             }
         }
         if (currentSentenceChunk) chunks.push(currentSentenceChunk.trim());
         currentChunk = '';
      } else {
        currentChunk = p;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

export function chunkDocument(filePath: string, relativeToPath: string): Chunk[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(relativeToPath, filePath).replace(/\\\\/g, '/');
  
  const { url, title, sourceId, cleanContent } = extractMetadata(fileContent, relativePath);
  
  const chunks: Chunk[] = [];
  
  // Split by H2
  const h2Splits = cleanContent.split(/^(##\s+.+)$/m);
  
  // The first part before any H2
  const introPart = h2Splits[0].trim();
  if (introPart) {
      const subChunks = splitIntoSubchunks(introPart, MAX_CHUNK_LENGTH);
      subChunks.forEach((sc, i) => {
         chunks.push({
             id: `${sourceId}-intro-${i}`,
             sourceId,
             title,
             url,
             content: sc
         });
      });
  }
  
  // Process H2 sections
  for (let i = 1; i < h2Splits.length; i += 2) {
      const sectionHeader = h2Splits[i].replace(/^##\s+/, '').trim();
      const sectionContent = (h2Splits[i] + '\n' + (h2Splits[i+1] || '')).trim();
      
      const subChunks = splitIntoSubchunks(sectionContent, MAX_CHUNK_LENGTH);
      subChunks.forEach((sc, j) => {
         chunks.push({
             id: `${sourceId}-${sectionHeader.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${j}`,
             sourceId,
             title,
             url,
             section: sectionHeader,
             content: sc
         });
      });
  }
  
  return chunks;
}
