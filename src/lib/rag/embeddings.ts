import fs from 'fs';
import path from 'path';
import { Evidence } from '../../types';

interface EmbeddedChunk {
  id: string;
  sourceId: string;
  title: string;
  url: string | null;
  section?: string;
  content: string;
  embedding: number[];
}

let embeddingsCache: EmbeddedChunk[] | null = null;
let lexicalIndexCache: Record<string, { docId: string, score: number }[]> | null = null;

function loadEmbeddings(): EmbeddedChunk[] {
  if (embeddingsCache) {
    return embeddingsCache;
  }

  const embeddingsPath = path.resolve(process.cwd(), 'data/embeddings.json');

  if (!fs.existsSync(embeddingsPath)) {
    throw new Error('ERROR: data/embeddings.json not found. Run yarn build:embeddings before starting the server.');
  }

  try {
    const data = fs.readFileSync(embeddingsPath, 'utf-8');
    embeddingsCache = JSON.parse(data);
    return embeddingsCache!;
  } catch (err) {
    throw new Error(`Failed to parse embeddings.json: ${err}`);
  }
}

function loadLexicalIndex(): Record<string, { docId: string, score: number }[]> {
  if (lexicalIndexCache) {
    return lexicalIndexCache;
  }

  const lexicalPath = path.resolve(process.cwd(), 'data/lexical-index.json');

  if (!fs.existsSync(lexicalPath)) {
    console.warn('Lexical index not found, hybrid search will only use embeddings.');
    return {};
  }

  try {
    const data = fs.readFileSync(lexicalPath, 'utf-8');
    lexicalIndexCache = JSON.parse(data);
    return lexicalIndexCache!;
  } catch (err) {
    console.error(`Failed to parse lexical-index.json: ${err}`);
    return {};
  }
}

// Ensure loaded on startup
loadEmbeddings();
loadLexicalIndex();

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function searchSemantic(queryEmbedding: number[], topK: number): Evidence[] {
  embeddingsCache = null; // Invalidate cache in case file was re-written
  const allEmbeddings = loadEmbeddings();

  const scored = allEmbeddings.map(chunk => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(item => {
    const rawUrl = item.chunk.url;
    const cleanUrl = rawUrl && rawUrl !== 'about:blank' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
      ? rawUrl
      : null;

    return {
      sourceId: item.chunk.sourceId,
      title: item.chunk.title,
      url: cleanUrl,
      section: item.chunk.section,
      content: item.chunk.content,
      score: item.score
    };
  });
}

export function searchLexical(tokens: string[], topK: number): Evidence[] {
  lexicalIndexCache = null; // Invalidate cache in case file was re-written
  const index = loadLexicalIndex();
  embeddingsCache = null;
  const allEmbeddings = loadEmbeddings();

  const docScores: Record<string, number> = {};

  tokens.forEach(token => {
    if (index[token]) {
      index[token].forEach(posting => {
        docScores[posting.docId] = (docScores[posting.docId] || 0) + posting.score;
      });
    }
  });

  const sortedDocIds = Object.keys(docScores).sort((a, b) => docScores[b] - docScores[a]).slice(0, topK);

  const chunkMap = new Map(allEmbeddings.map(c => [c.id, c]));

  return sortedDocIds.map(docId => {
    const chunk = chunkMap.get(docId)!;
    const rawUrl = chunk.url;
    const cleanUrl = rawUrl && rawUrl !== 'about:blank' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
      ? rawUrl
      : null;

    return {
      sourceId: chunk.sourceId,
      title: chunk.title,
      url: cleanUrl,
      section: chunk.section,
      content: chunk.content,
      score: docScores[docId]
    };
  });
}
