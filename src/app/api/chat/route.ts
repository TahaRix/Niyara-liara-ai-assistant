import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/security/rate-limit';
import { validateChatRequest } from '../../../lib/security/validate';
import { planQuery } from '../../../lib/rag/query-planner';
import { retrieve } from '../../../lib/rag/retriever';
import { evaluateGrounding } from '../../../lib/rag/grounding-gate';
import { streamChat } from '../../../lib/llm/client';
import { ANSWER_PROMPT, CONFLICT_ANSWER_PROMPT, buildContextPrompt } from '../../../lib/llm/prompts';
import { encodeSSE, createStream } from '../../../lib/llm/stream';
import { log } from '../../../lib/logger';
import { ChatMessage } from '../../../types';

export const dynamic = 'force-dynamic';

function isIdentityQuery(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return (
    normalized.includes('اسمت چیه') ||
    normalized.includes('اسم شما چیه') ||
    normalized.includes('نامت چیست') ||
    normalized.includes('تو کی هستی') ||
    normalized.includes('شما کی هستید') ||
    normalized.includes('خودت رو معرفی کن') ||
    normalized.includes('خودتو معرفی کن') ||
    normalized.includes('who are you') ||
    normalized.includes('what is your name') ||
    normalized.includes('what are you')
  );
}

export async function POST(req: Request) {
  const startTime = Date.now();
  let body: any;

  // Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    log({ event: "chat_request", error: "rate_limited", endpoint: "/api/chat" });
    return NextResponse.json({
      error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفا لحظاتی دیگر تلاش کنید.",
      retryAfter
    }, { status: 429 });
  }

  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  // 1) Validate Input
  const { valid, error, cleanMessage, cleanHistory, attachments } = validateChatRequest(body);
  if (!valid || (cleanMessage === "" && (!attachments || attachments.length === 0))) {
    log({ event: "chat_request", error: "validation_failed", details: error });
    return NextResponse.json({ error }, { status: 400 });
  }

  const message = cleanMessage || "";
  const history = cleanHistory || [];

  // Prepare base text and vision content
  let textContent = message;
  let hasImages = false;
  let visionContent: any[] = [];

  if (message) {
    visionContent.push({ type: "text", text: message });
  }

  if (attachments && attachments.length > 0) {
    const textAttachments = attachments.filter(a => !a.type.startsWith('image/'));
    const imageAttachments = attachments.filter(a => a.type.startsWith('image/'));

    if (textAttachments.length > 0) {
      const attachmentsText = textAttachments.map((a: any) => `\n\n--- پیوست: ${a.name} ---\n${a.content}\n--- پایان پیوست ---`).join('');
      textContent += `\n\nفایل‌های پیوست شده توسط کاربر:${attachmentsText}`;

      const textItem = visionContent.find(i => i.type === 'text');
      if (textItem) {
        textItem.text += `\n\nفایل‌های پیوست شده توسط کاربر:${attachmentsText}`;
      } else {
        visionContent.push({ type: "text", text: `فایل‌های پیوست شده توسط کاربر:${attachmentsText}` });
      }
    }

    if (imageAttachments.length > 0) {
      hasImages = true;
      for (const img of imageAttachments) {
        let url = img.content;
        if (!url.startsWith('data:')) {
          url = `data:${img.type};base64,${url}`;
        }
        visionContent.push({
          type: "image_url",
          image_url: { url }
        });
      }
    }
  }

  return new NextResponse(
    createStream(async function* () {
      try {
        // Direct identity intent check
        if (isIdentityQuery(textContent)) {
          const llmMessages: ChatMessage[] = [
            { role: 'system', content: ANSWER_PROMPT },
            ...history.slice(-4),
            { role: 'user', content: textContent }
          ];

          let tokens = 0;
          const stream = streamChat(llmMessages);
          for await (const chunk of stream) {
            tokens++;
            yield encodeSSE({ type: 'chunk', data: chunk });
          }

          yield encodeSSE({ type: 'suggestions', data: ["امکانات لیارا", "استقرار برنامه", "پایگاه‌های داده"] });
          yield encodeSSE({ type: 'done', data: null });
          log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: 'identity', grounding_verdict: 'identity' });
          return;
        }

        // 2) Query Planner
        const plan = await planQuery(textContent, history);

        if (plan.intent === 'identity') {
          const llmMessages: ChatMessage[] = [
            { role: 'system', content: ANSWER_PROMPT },
            ...history.slice(-4),
            { role: 'user', content: textContent }
          ];

          let tokens = 0;
          const stream = streamChat(llmMessages);
          for await (const chunk of stream) {
            tokens++;
            yield encodeSSE({ type: 'chunk', data: chunk });
          }

          yield encodeSSE({ type: 'suggestions', data: ["امکانات لیارا", "استقرار برنامه", "پایگاه‌های داده"] });
          yield encodeSSE({ type: 'done', data: null });
          log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: plan.intent, grounding_verdict: 'identity' });
          return;
        }

        if (plan.needsClarification) {
          yield encodeSSE({ type: 'clarification', data: plan.clarificationQuestion });
          yield encodeSSE({ type: 'done', data: null });
          log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: plan.intent, grounding_verdict: 'clarification_requested' });
          return;
        }

        // 3) Retriever
        const evidence = await retrieve(plan.queries);

        // 4) Grounding Gate
        const grounding = evaluateGrounding(evidence);

        if (grounding.verdict === 'insufficient') {
          yield encodeSSE({ type: 'insufficient_evidence', data: null });
          yield encodeSSE({ type: 'done', data: null });
          log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: plan.intent, grounding_verdict: 'insufficient' });
          return;
        }

        if (grounding.verdict === 'conflicting') {
           yield encodeSSE({ type: 'sources', data: grounding.evidence });
           if (grounding.groundingScore) {
             yield encodeSSE({ type: 'grounding', data: grounding.groundingScore });
           }
           yield encodeSSE({ type: 'conflict_warning', data: grounding.conflictDetails });

           const contextPrompt = buildContextPrompt(grounding.evidence || []);
           const messages: ChatMessage[] = [
             { role: 'system', content: CONFLICT_ANSWER_PROMPT },
             { role: 'user', content: hasImages ?
                [ { type: "text", text: `${contextPrompt}\n\nسوال کاربر:\n` }, ...visionContent ] :
                `${contextPrompt}\n\nسوال کاربر: ${textContent}` }
           ];

           let tokens = 0;
           const stream = streamChat(messages);
           for await (const chunk of stream) {
             tokens++;
             yield encodeSSE({ type: 'chunk', data: chunk });
           }

           yield encodeSSE({ type: 'done', data: null });
           log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: plan.intent, grounding_verdict: 'conflicting', tokens_used: tokens });
           return;
        }

        // Sufficient Evidence Path
        yield encodeSSE({ type: 'sources', data: grounding.evidence });
        if (grounding.groundingScore) {
          yield encodeSSE({ type: 'grounding', data: grounding.groundingScore });
        }

        const contextPrompt = buildContextPrompt(grounding.evidence || []);

        // Build LLM messages (System + History + User(Context+Message))
        let systemPrompt = ANSWER_PROMPT;

        if (plan.intent === 'deployment_debugging' || plan.intent === 'debug') {
            systemPrompt += `\n\nحالت دیباگ فعال است: در پاسخ خود سعی کنید به صورت قدم‌به‌قدم مشکل را عیب‌یابی کنید. ابتدا از کاربر بخواهید اگر لاگ خطایی دارد ارسال کند یا چک کند تنظیمات فایل‌ها درست است.`;
        }

        const llmMessages: ChatMessage[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Add history
        history.slice(-4).forEach(m => llmMessages.push(m));

        let userContent: any = hasImages ?
            [ { type: "text", text: `${contextPrompt}\n\nسوال کاربر:\n` }, ...visionContent ] :
            `${contextPrompt}\n\nسوال کاربر: ${textContent}`;

        llmMessages.push({
            role: 'user',
            content: userContent
        });

        // Stream Answer
        let tokens = 0;
        const stream = streamChat(llmMessages);
        for await (const chunk of stream) {
            tokens++;
            yield encodeSSE({ type: 'chunk', data: chunk });
        }

        const suggestions = plan.intent === 'deploy' ? ["استقرار دیتابیس", "اتصال دامنه"] :
                            plan.intent === 'pricing' ? ["پلن‌های لیارا", "کاهش هزینه‌ها"] :
                            ["خواندن مستندات بیشتر"];
        yield encodeSSE({ type: 'suggestions', data: suggestions });

        yield encodeSSE({ type: 'done', data: null });

        log({ event: "chat_request", latency_ms: Date.now() - startTime, query_plan_intent: plan.intent, grounding_verdict: 'sufficient', tokens_used: tokens });

      } catch (err: any) {
        console.error("Stream generation error:", err);
        log({ event: "chat_request", latency_ms: Date.now() - startTime, error: err.message });
        yield encodeSSE({ type: 'chunk', data: "\n\n**خطا:** مشکلی در ارتباط با سرور به وجود آمد." });
        yield encodeSSE({ type: 'done', data: null });
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    }
  );
}
