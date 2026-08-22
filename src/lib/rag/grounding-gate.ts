import { Evidence, GroundingResult } from '../../types';
import { log } from '../logger';

// Threshold for minimum similarity score (adjusted for hybrid weighting)
const SUFFICIENT_SCORE_THRESHOLD = 0.45;

/**
 * Calculates a dynamic grounding percentage based on:
 * 1. Retrieval relevance score of top chunks
 * 2. Number of valid retrieved chunks
 * 3. Quality & consistency of matching chunks
 * 4. Grounding verdict
 *
 * Guarantees: documentEvidence + aiReasoning === 100
 */
export function calculateGroundingScore(evidence: Evidence[], verdict: 'sufficient' | 'insufficient' | 'conflicting'): { documentEvidence: number; aiReasoning: number } {
  if (verdict === 'insufficient' || !evidence || evidence.length === 0) {
    return { documentEvidence: 0, aiReasoning: 100 };
  }

  const topScore = evidence[0]?.score || 0;
  const avgScore = evidence.reduce((sum, e) => sum + (e.score || 0), 0) / evidence.length;
  const chunkCount = evidence.length;

  let docPercentage = 50;

  if (topScore >= 0.85) {
    // Exact / High-confidence documentation answer: 85% - 94%
    const bonus = Math.min(10, (chunkCount - 1) * 3);
    docPercentage = Math.round(85 + (topScore - 0.85) * 40 + bonus);
  } else if (topScore >= 0.70) {
    // Solid documentation match: 70% - 84%
    const scoreWeight = (topScore * 0.7 + avgScore * 0.3);
    const chunkBonus = Math.min(6, (chunkCount - 1) * 2);
    docPercentage = Math.round(scoreWeight * 95 + chunkBonus);
  } else if (topScore >= 0.55) {
    // Partial documentation match: 50% - 69%
    const scoreWeight = (topScore * 0.8 + avgScore * 0.2);
    docPercentage = Math.round(scoreWeight * 90);
  } else if (topScore >= 0.45) {
    // Weak evidence match: 30% - 49%
    docPercentage = Math.round(Math.max(25, topScore * 80));
  } else {
    docPercentage = 20;
  }

  // Adjust for conflicting evidence
  if (verdict === 'conflicting') {
    docPercentage = Math.round(docPercentage * 0.85);
  }

  // Strict clamp between 15% and 95% when sufficient
  docPercentage = Math.min(95, Math.max(15, docPercentage));
  const aiPercentage = 100 - docPercentage;

  return {
    documentEvidence: docPercentage,
    aiReasoning: aiPercentage
  };
}

export function evaluateGrounding(evidence: Evidence[]): GroundingResult {
  if (!evidence || evidence.length === 0) {
    log({ event: 'grounding_evaluated', grounding_verdict: 'insufficient', reason: 'no_evidence' });
    return {
      verdict: 'insufficient',
      evidence: [],
      groundingScore: { documentEvidence: 0, aiReasoning: 100 }
    };
  }

  // Filter evidence that meets the minimum score threshold
  const topResults = evidence.filter(e => e.score >= SUFFICIENT_SCORE_THRESHOLD);

  if (topResults.length === 0) {
    log({ event: 'grounding_evaluated', grounding_verdict: 'insufficient', reason: 'below_threshold', max_score: evidence[0]?.score });
    return {
      verdict: 'insufficient',
      evidence: [],
      groundingScore: { documentEvidence: 0, aiReasoning: 100 }
    };
  }

  // Check for conflicts among the top results
  const conflict = detectConflict(topResults);
  if (conflict) {
    const score = calculateGroundingScore(topResults, 'conflicting');
    log({ event: 'grounding_evaluated', grounding_verdict: 'conflicting', details: conflict.details });
    return {
      verdict: 'conflicting',
      evidence: topResults,
      conflictDetails: conflict.details,
      groundingScore: score
    };
  }

  const score = calculateGroundingScore(topResults, 'sufficient');
  log({ event: 'grounding_evaluated', grounding_verdict: 'sufficient', evidence_count: topResults.length, doc_evidence_pct: score.documentEvidence });
  return {
    verdict: 'sufficient',
    evidence: topResults,
    groundingScore: score
  };
}

// Very basic topic extraction (nouns/keywords)
function extractTopicKeywords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[.,،:؛?!"'()\[\]{}<>/\\]/g, ' ').split(/\s+/);
  const stopWords = new Set(['در', 'به', 'از', 'و', 'که', 'این', 'است', 'با', 'آن', 'برای', 'یک', 'می', 'شد', 'تا', 'ها', 'یا', 'را', 'نیز', 'بر', 'هم', 'نمیتوان', 'امکان', 'پذیر', 'نیست', 'پشتیبانی', 'نمیشود', 'ندارد', 'خیر', 'میتوان', 'است', 'میشود', 'دارد', 'بله']);
  return new Set(words.filter(w => w.length > 2 && !stopWords.has(w)));
}

function detectConflict(results: Evidence[]): { details: string } | null {
  if (results.length < 2) return null;

  // Take top 2 results for conflict checking
  const top1 = results[0];
  const top2 = results[1];

  // If they are from the same source document, they are likely not conflicting
  if (top1.sourceId === top2.sourceId) return null;

  // Ensure they are talking about the same topic by checking keyword overlap
  const topic1 = extractTopicKeywords(top1.title + ' ' + top1.content);
  const topic2 = extractTopicKeywords(top2.title + ' ' + top2.content);

  let overlapCount = 0;
  for (const word of Array.from(topic1)) {
    if (topic2.has(word)) overlapCount++;
  }

  // Need at least 2 shared meaningful words to consider them same topic
  if (overlapCount < 2) return null;

  // Simple heuristic: if one contains negation and the other doesn't for similar context
  const negations = ['نمیتوان', 'امکان پذیر نیست', 'پشتیبانی نمیشود', 'ندارد', 'خیر'];

  let top1HasNegation = false;
  let top2HasNegation = false;

  for (const neg of negations) {
    if (top1.content.includes(neg)) top1HasNegation = true;
    if (top2.content.includes(neg)) top2HasNegation = true;
  }

  // If one has a strong negation and they share a high score, flag as potential conflict
  if (top1HasNegation !== top2HasNegation && top1.score > 0.6 && top2.score > 0.6) {
      return { details: `Possible conflicting instructions between ${top1.title} and ${top2.title}` };
  }

  return null;
}