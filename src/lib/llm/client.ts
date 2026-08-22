import OpenAI from 'openai';
import { ChatMessage } from '../../types';

const getModel = () => process.env.LLM_MODEL || 'openai/gpt-4o-mini';

const client = new OpenAI({
  baseURL: process.env.LIARA_AI_BASE_URL || 'https://ai.liara.ir/v1',
  apiKey: process.env.LIARA_AI_API_KEY || 'dummy_key_for_build', // Fallback for build time
  timeout: 45000, // 45 seconds timeout
  maxRetries: 3,  // Built-in client retries
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function* streamChat(messages: ChatMessage[], model?: string) {
  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      const stream = await client.chat.completions.create({
        model: model || getModel(),
        messages: messages.map(m => ({ role: m.role, content: m.content })) as any,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
      return; // Completed successfully
    } catch (err: any) {
      lastError = err;
      console.warn(`streamChat attempt ${attempt} failed:`, err?.message || err);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 600;
        await delay(backoffMs);
      }
    }
  }

  // Final fallback message on connection/API failure without crashing route
  console.error("streamChat failed after all retries:", lastError);
  yield "ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفا دوباره تلاش کنید.";
}

export async function jsonChat(messages: ChatMessage[], model?: string) {
  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      const response = await client.chat.completions.create({
        model: model || getModel(),
        messages: messages.map(m => ({ role: m.role, content: m.content })) as any,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in JSON chat response');
      }

      return JSON.parse(content);
    } catch (err: any) {
      lastError = err;
      console.warn(`jsonChat attempt ${attempt} failed:`, err?.message || err);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 600;
        await delay(backoffMs);
      }
    }
  }

  throw lastError || new Error('Failed to complete JSON chat after retries');
}
