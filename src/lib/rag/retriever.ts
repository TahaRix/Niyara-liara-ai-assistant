import { Evidence } from '../../types';
import { searchSemantic, searchLexical } from './embeddings';

// Simple Farsi keyword tokenizer (splits by space, removes basic punctuation)
function extractKeywords(queries: string[]): Set<string> {
  const keywords = new Set<string>();
  queries.forEach(query => {
    const words = query.split(/\s+/).map(w => w.replace(/[.،:؛?!()"']/g, '').trim()).filter(w => w.length > 2);
    words.forEach(w => keywords.add(w.toLowerCase()));
  });
  return keywords;
}

// Boost score based on keyword presence
function applyKeywordBoost(evidence: Evidence, keywords: Set<string>): Evidence {
  let matchedTerms = 0;
  const contentLower = evidence.content.toLowerCase();

  for (const keyword of Array.from(keywords)) {
    if (contentLower.includes(keyword)) {
      matchedTerms++;
    }
  }

  // Boost by 0.05 per matched term
  const boostedScore = Math.min(1.0, evidence.score + (matchedTerms * 0.05));

  return { ...evidence, score: boostedScore };
}

async function getEmbedding(query: string): Promise<number[]> {
  const apiKey = process.env.LIARA_AI_API_KEY;
  const baseUrl = process.env.LIARA_AI_BASE_URL || 'https://ai.liara.ir/v1';
  const model = process.env.EMBEDDING_MODEL || 'intfloat/multilingual-e5-large';

  // For test environments, return a dummy embedding if no key is set
  if (!apiKey && process.env.NODE_ENV === 'test') {
      return new Array(1024).fill(0.1);
  }

  if (!apiKey) {
    throw new Error('LIARA_AI_API_KEY is required for retrieval');
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: query,
      model: model
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function normalizeScores(results: Evidence[]): Evidence[] {
  if (results.length === 0) return [];
  const maxScore = Math.max(...results.map(r => r.score));
  if (maxScore === 0) return results;
  return results.map(r => ({ ...r, score: r.score / maxScore }));
}

export async function retrieve(queries: string[], topK = 5): Promise<Evidence[]> {
  if (!queries || queries.length === 0) return [];

  const allSemanticResults: Evidence[] = [];
  const allLexicalResults: Evidence[] = [];
  const keywords = extractKeywords(queries);
  const keywordArray = Array.from(keywords);

  // Embed and search for each query (Semantic)
  for (const query of queries) {
    try {
      const embedding = await getEmbedding(query);
      const results = searchSemantic(embedding, topK * 2);
      allSemanticResults.push(...results);
    } catch (err) {
      console.error(`Error retrieving for query "${query}":`, err);
    }
  }

  // Lexical search
  if (keywordArray.length > 0) {
      const lexResults = searchLexical(keywordArray, topK * 2);
      allLexicalResults.push(...lexResults);
  }

  // Normalize scores individually
  const normalizedSemantic = normalizeScores(allSemanticResults);
  const normalizedLexical = normalizeScores(allLexicalResults);

  const combinedMap = new Map<string, Evidence>();

  // Weight configuration: 70% Semantic, 30% Lexical
  const SEMANTIC_WEIGHT = 0.7;
  const LEXICAL_WEIGHT = 0.3;

  for (const result of normalizedSemantic) {
    const key = `${result.sourceId}-${result.section || 'main'}`;
    const weightedScore = result.score * SEMANTIC_WEIGHT;
    combinedMap.set(key, { ...result, score: weightedScore });
  }

  for (const result of normalizedLexical) {
    const key = `${result.sourceId}-${result.section || 'main'}`;
    const weightedScore = result.score * LEXICAL_WEIGHT;
    const existing = combinedMap.get(key);

    if (existing) {
        // Merge scores if found in both
        combinedMap.set(key, { ...existing, score: existing.score + weightedScore });
    } else {
        combinedMap.set(key, { ...result, score: weightedScore });
    }
  }

  const boostedResults = Array.from(combinedMap.values()).map(e => applyKeywordBoost(e, keywords));

  // Sort by score descending
  const sorted = boostedResults.sort((a, b) => b.score - a.score);

  if (sorted.length === 0) return [];

  const topScore = sorted[0].score;

  // Dynamic retrieval based on query confidence:
  // Low confidence query (< 0.45): Return 0 sources
  // Medium confidence query (0.45 <= score < 0.70): Return top 2-3 relevant sources
  // High confidence query (>= 0.70): Return up to top 5 relevant sources
  if (topScore < 0.45) {
    return [];
  }

  let dynamicLimit = topK;
  if (topScore >= 0.75) {
    dynamicLimit = Math.min(topK, 5);
  } else if (topScore >= 0.60) {
    dynamicLimit = Math.min(topK, 3);
  } else {
    dynamicLimit = Math.min(topK, 2);
  }

  // Filter out any chunk that falls significantly below the top score (gap > 0.35) or below absolute threshold
  const relevantChunks = sorted
    .filter(chunk => chunk.score >= 0.40 && (topScore - chunk.score) <= 0.35)
    .slice(0, dynamicLimit);

  return relevantChunks;
}