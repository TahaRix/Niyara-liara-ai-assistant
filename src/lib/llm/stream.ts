import { SSEEventType } from '../../types';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
}

export function encodeSSE(event: SSEEvent): string {
  // We send standard SSE where data contains our JSON object
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createStream(
  generator: () => AsyncGenerator<string, void, unknown>
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator()) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        controller.close();
      }
    }
  });
}