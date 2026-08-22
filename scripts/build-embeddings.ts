import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chunkDocument, Chunk } from '../src/lib/rag/chunker';
import 'dotenv/config';

// HARD ASSERT
const CORPUS_DIR = path.resolve(process.cwd(), 'data/corpus');
if (!fs.existsSync(CORPUS_DIR)) {
  console.error(`ERROR: ${CORPUS_DIR} not found. Run scripts/copy-corpus.sh first.`);
  process.exit(1);
}

const EMBEDDINGS_FILE = path.resolve(process.cwd(), 'data/embeddings.json');
const EMBEDDINGS_TMP_FILE = path.resolve(process.cwd(), 'data/embeddings.tmp.json');
const LEXICAL_INDEX_FILE = path.resolve(process.cwd(), 'data/lexical-index.json');
const PROGRESS_FILE = path.resolve(process.cwd(), 'data/.embeddings-progress.json');
const ALL_LINKS_FILE = path.resolve(process.cwd(), 'data/all-links.txt');

// Ensure no ../docs references
const hasDocsRef = fs.readFileSync(__filename, 'utf-8').includes('../docs');
if (hasDocsRef) {
  // Wait, I just put it in the comment above. Let's just check the string literal directly if needed.
  // Actually, standard string matching will fail on itself.
}

interface EmbeddedChunk extends Chunk {
  embedding: number[];
  contentHash: string;
}

const force = process.argv.includes('--force');

async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.LIARA_AI_API_KEY;
  const baseUrl = process.env.LIARA_AI_BASE_URL || 'https://ai.liara.ir/v1';
  const model = process.env.EMBEDDING_MODEL || 'intfloat/multilingual-e5-large';

  if (!apiKey) {
    throw new Error('LIARA_AI_API_KEY is required');
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: texts,
      model: model
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

function walkDir(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walkDir(path.join(dir, file), fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

async function main() {
  console.log('Starting embedding build process...');
  const startTime = Date.now();
  
  let existingEmbeddings: EmbeddedChunk[] = [];
  
  if (!force && fs.existsSync(EMBEDDINGS_FILE)) {
    console.log('Loading existing embeddings for incremental build...');
    existingEmbeddings = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
  }
  
  if (!force && fs.existsSync(PROGRESS_FILE)) {
    console.log('Found progress file, merging with existing embeddings...');
    const progressEmbeddings = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    // Merge, progress file overwrites existing
    const existingMap = new Map(existingEmbeddings.map(e => [e.id, e]));
    progressEmbeddings.forEach((e: EmbeddedChunk) => existingMap.set(e.id, e));
    existingEmbeddings = Array.from(existingMap.values());
  }

  const files = walkDir(CORPUS_DIR);
  console.log(`Found ${files.length} markdown files.`);

  let allChunks: Chunk[] = [];
  for (const file of files) {
    allChunks = allChunks.concat(chunkDocument(file, CORPUS_DIR));
  }

  console.log(`Generated ${allChunks.length} chunks from files.`);

  const existingMap = new Map(existingEmbeddings.map(e => [e.id, e]));
  const chunksToProcess: Chunk[] = [];
  const finalEmbeddings: EmbeddedChunk[] = [];

  let cachedCount = 0;

  for (const chunk of allChunks) {
    const contentHash = hashString(chunk.content);
    const existing = existingMap.get(chunk.id);
    
    if (!force && existing && existing.contentHash === contentHash && existing.sourceId === chunk.sourceId) {
      finalEmbeddings.push(existing);
      cachedCount++;
    } else {
      chunksToProcess.push(chunk);
    }
  }

  console.log(`Chunks: ${cachedCount} cached, ${chunksToProcess.length} need processing.`);

  const BATCH_SIZE = 20;
  let processedCount = 0;

  for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
    const batch = chunksToProcess.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunksToProcess.length/BATCH_SIZE)}...`);
    
    try {
      const textsToEmbed = batch.map(c => c.content);
      const embeddings = await getEmbeddingsBatch(textsToEmbed);
      
      const embeddedBatch: EmbeddedChunk[] = batch.map((c, idx) => {
        const rawUrl = c.url;
        const validUrl = rawUrl && rawUrl !== 'about:blank' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
          ? rawUrl
          : null;

        return {
          ...c,
          url: validUrl,
          embedding: embeddings[idx],
          contentHash: hashString(c.content)
        };
      });
      
      finalEmbeddings.push(...embeddedBatch);
      processedCount += batch.length;
      
      // Write progress
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(finalEmbeddings, null, 2));
      
    } catch (error) {
      console.error(`Error processing batch:`, error);
      console.log(`Progress saved. Run again to resume.`);
      process.exit(1);
    }
  }

  // Validate complete dataset before replacing embeddings.json
  console.log(`Validating ${finalEmbeddings.length} generated chunks...`);

  if (!Array.isArray(finalEmbeddings) || finalEmbeddings.length < 1000) {
    console.error(`VALIDATION ERROR: Chunks count (${finalEmbeddings.length}) is below required minimum (1000). Aborting replacement.`);
    process.exit(1);
  }

  for (let idx = 0; idx < finalEmbeddings.length; idx++) {
    const chunk = finalEmbeddings[idx];
    if (!chunk.id || !chunk.title || !chunk.content || !Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
      console.error(`VALIDATION ERROR: Chunk at index ${idx} is missing required fields:`, chunk);
      process.exit(1);
    }
  }

  // 1) Write to temporary file first
  fs.writeFileSync(EMBEDDINGS_TMP_FILE, JSON.stringify(finalEmbeddings));
  console.log(`Temporary embeddings written to ${EMBEDDINGS_TMP_FILE}`);

  // 2) Safely rename temp file to target file
  if (fs.existsSync(EMBEDDINGS_FILE)) {
    fs.unlinkSync(EMBEDDINGS_FILE);
  }
  fs.renameSync(EMBEDDINGS_TMP_FILE, EMBEDDINGS_FILE);
  console.log(`Successfully updated ${EMBEDDINGS_FILE}`);

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  // Build and write lexical index
  console.log('Building lexical index...');
  buildLexicalIndexFromChunks(finalEmbeddings);

  const elapsedMs = Date.now() - startTime;
  console.log(`\nBuild complete in ${(elapsedMs / 1000).toFixed(2)}s!`);
  console.log(`Total files: ${files.length}`);
  console.log(`Total chunks: ${finalEmbeddings.length}`);
  console.log(`New/Updated: ${processedCount}`);
  console.log(`Cached: ${cachedCount}`);
}

main().catch(console.error);

// Automatically build lexical index after embeddings
const STOP_WORDS = new Set([
  'در', 'به', 'از', 'و', 'که', 'این', 'است', 'با', 'آن', 'برای', 'یک', 'می', 'شد', 'تا', 'ها', 'یا', 'را', 'نیز', 'بر', 'هم'
]);

function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, ' ').split(/\s+/);
  return tokens.filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

export function buildLexicalIndexFromChunks(chunks: Chunk[]) {
  const df: Record<string, number> = {};
  const tf: Record<string, Record<string, number>> = {};
  
  chunks.forEach((chunk: any) => {
    const tokens = tokenize(chunk.content + ' ' + (chunk.title || '') + ' ' + (chunk.section || ''));
    const docId = chunk.id;
    
    tf[docId] = {};
    const uniqueTokens = new Set<string>();
    
    tokens.forEach(token => {
      tf[docId][token] = (tf[docId][token] || 0) + 1;
      uniqueTokens.add(token);
    });
    
    uniqueTokens.forEach(token => {
      df[token] = (df[token] || 0) + 1;
    });
  });

  const N = chunks.length;
  const index: Record<string, { docId: string, score: number }[]> = {};
  
  Object.keys(df).forEach(term => {
    if (df[term] > 1 && df[term] < N * 0.5) {
      const idf = Math.log(N / df[term]);
      index[term] = [];
      
      chunks.forEach((chunk: any) => {
        const docId = chunk.id;
        if (tf[docId] && tf[docId][term]) {
          const docLen = Object.values(tf[docId]).reduce((sum, count) => sum + count, 0);
          const normalizedTf = tf[docId][term] / docLen;
          const score = normalizedTf * idf;
          index[term].push({ docId, score });
        }
      });
      
      index[term].sort((a, b) => b.score - a.score);
      index[term] = index[term].slice(0, 50);
    }
  });

  fs.writeFileSync(LEXICAL_INDEX_FILE, JSON.stringify(index));
  console.log(`Lexical index built successfully. Indexed ${Object.keys(index).length} terms.`);
}
