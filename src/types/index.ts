export interface Evidence {
  sourceId: string;
  title: string;
  url: string | null;
  section?: string;
  content: string;
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
  sources?: Evidence[];
  suggestions?: string[];
  insufficientEvidence?: boolean;
  conflicting?: boolean;
  conflictDetails?: string;
  groundingScore?: {
    documentEvidence: number;
    aiReasoning: number;
  };
  attachments?: { name: string; content: string; type: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export type SSEEventType = 'chunk' | 'sources' | 'grounding' | 'suggestions' | 'insufficient_evidence' | 'clarification' | 'conflict_warning' | 'done';

export interface SSEEvent {
  type: SSEEventType;
  [key: string]: any;
}

export interface QueryPlan {
  intent: 'deploy' | 'configure' | 'debug' | 'deployment_debugging' | 'pricing' | 'concept' | 'compare' | 'howto' | 'identity' | 'other';
  entities: string[];
  queries: string[];
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface GroundingResult {
  verdict: 'sufficient' | 'insufficient' | 'conflicting';
  evidence: Evidence[];
  conflictDetails?: string | null;
  groundingScore?: {
    documentEvidence: number;
    aiReasoning: number;
  };
}
