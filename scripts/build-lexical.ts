import fs from 'fs';
import path from 'path';

const EMBEDDINGS_FILE = path.resolve(process.cwd(), 'data/embeddings.json');
const LEXICAL_INDEX_FILE = path.resolve(process.cwd(), 'data/lexical-index.json');

const STOP_WORDS = new Set([
  'در', 'به', 'از', 'و', 'که', 'این', 'است', 'با', 'آن', 'برای', 'یک', 'می', 'شد', 'تا', 'ها', 'یا', 'را', 'نیز', 'بر', 'هم'
]);

function tokenize(text: string): string[] {
  // Really safe tokenizer
  const tokens = text.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, ' ').split(/\s+/);
  return tokens.filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function buildLexicalIndex() {
  if (!fs.existsSync(EMBEDDINGS_FILE)) {
    console.error(`ERROR: ${EMBEDDINGS_FILE} not found. Build embeddings first.`);
    process.exit(1);
  }

  const chunks = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
  console.log(`Loaded ${chunks.length} chunks for lexical indexing.`);

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

buildLexicalIndex();
