import { ChatMessage, QueryPlan } from '../../types';
import { jsonChat } from '../llm/client';
import { QUERY_PLANNER_PROMPT } from '../llm/prompts';
import { log } from '../logger';

const VALID_INTENTS = ['deploy', 'configure', 'debug', 'deployment_debugging', 'pricing', 'concept', 'compare', 'howto', 'other'];

export async function planQuery(message: string, history: ChatMessage[] = []): Promise<QueryPlan> {
  const messages: ChatMessage[] = [
    { role: 'system', content: QUERY_PLANNER_PROMPT }
  ];

  // Add a few recent history messages for context, if available
  const recentHistory = history.slice(-4);
  for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
          // Exclude extra context fields from LLM history
          messages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : (msg.content as any[]).find(c => c.type === 'text')?.text || '' });
      }
  }

  messages.push({ role: 'user', content: message });

  try {
    const rawPlan = await jsonChat(messages);

    // Runtime JSON validation
    if (!rawPlan.intent || !VALID_INTENTS.includes(rawPlan.intent)) {
       rawPlan.intent = 'other';
    }
    if (!Array.isArray(rawPlan.entities)) {
       rawPlan.entities = [];
    }
    if (!Array.isArray(rawPlan.queries)) {
       rawPlan.queries = [];
    }

    if (rawPlan.needsClarification && typeof rawPlan.clarificationQuestion !== 'string') {
        rawPlan.needsClarification = false;
    }

    if (!rawPlan.needsClarification && rawPlan.queries.length === 0) {
        throw new Error("Empty queries without clarification");
    }

    const validatedPlan: QueryPlan = {
      intent: rawPlan.intent,
      entities: rawPlan.entities,
      queries: rawPlan.queries,
      needsClarification: Boolean(rawPlan.needsClarification),
      clarificationQuestion: rawPlan.clarificationQuestion
    };

    log({ event: 'query_planned', query_plan: validatedPlan });
    return validatedPlan;

  } catch (err) {
    console.error("Query planner failed, falling back to raw message:", err);
    // Fallback: return single-query plan using raw user message
    return {
      intent: 'other',
      entities: [],
      queries: [message],
      needsClarification: false
    };
  }
}