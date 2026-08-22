"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Sparkles, RotateCw, ThumbsUp, ThumbsDown, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ChatMessage as IChatMessage } from '../types';
import { SourceCard } from './SourceCard';
import { InsufficientEvidence } from './InsufficientEvidence';
import { SuggestionChip } from './SuggestionChip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatMessageProps {
  message: IChatMessage;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onSuggestionClick?: (text: string) => void;
  onExplainSource?: (title: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({
  message,
  isStreaming,
  isLastAssistant,
  onSuggestionClick,
  onExplainSource,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const textContent = typeof message.content === 'string' ? message.content : '';
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [isCopiedResponse, setIsCopiedResponse] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    });
  };

  const handleCopyResponse = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent).then(() => {
      setIsCopiedResponse(true);
      setTimeout(() => setIsCopiedResponse(false), 2000);
    });
  };

  const handleLike = () => {
    setReaction((prev) => (prev === 'like' ? null : 'like'));
  };

  const handleDislike = () => {
    setReaction((prev) => (prev === 'dislike' ? null : 'dislike'));
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col transition-all duration-200 select-text",
        isUser ? "items-end mb-6" : "items-start mb-8"
      )}
    >
      {isUser ? (
        /* USER MESSAGE - Compact premium bubble right-aligned (RTL) */
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] gap-2 select-text">
          {/* User Attachments Preview if present */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {message.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-zinc-300 backdrop-blur-md shadow-sm"
                >
                  {att.type.startsWith('image/') ? (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span className="truncate max-w-[160px] font-mono text-[11px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* User Text Bubble */}
          <div className="bg-[#2563eb] text-white rounded-3xl rounded-tr-md px-5 py-3 text-sm sm:text-[15px] leading-relaxed shadow-lg shadow-blue-600/15 border border-blue-400/20 font-medium select-text">
            <p className="whitespace-pre-wrap select-text">{textContent}</p>
          </div>
        </div>
      ) : (
        /* ASSISTANT MESSAGE - Clean Unboxed Reading Surface (ChatGPT/Claude style) */
        <div className="w-full flex items-start gap-4 group/msg select-text">
          {/* Niyara AI Avatar with favicon.ico */}
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#141420] border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm dark:shadow-md dark:shadow-blue-500/15 p-1.5 overflow-hidden select-none">
            <img src="/favicon.ico" alt="Niyara" className="w-full h-full object-contain" />
          </div>

          {/* Assistant Content Canvas */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 text-zinc-800 dark:text-zinc-200 select-text">
            {/* Loading / Typing Indicator */}
            {message.content === '' && !message.insufficientEvidence && (
              <div className="flex items-center gap-1.5 py-2 select-none">
                <div className="w-2 h-2 rounded-full bg-blue-500 bounce-dot" />
                <div className="w-2 h-2 rounded-full bg-blue-500 bounce-dot" style={{ animationDelay: '-0.16s' }} />
                <div className="w-2 h-2 rounded-full bg-blue-500 bounce-dot" style={{ animationDelay: '0s' }} />
              </div>
            )}

            {/* Conflicting Information Alert */}
            {message.conflicting && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 select-text">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5 select-none" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex flex-col gap-1 select-text">
                  <span className="font-semibold select-text">توجه: اطلاعات متناقض در منابع</span>
                  <span className="text-amber-700 dark:text-amber-300/80 leading-relaxed select-text">{message.conflictDetails}</span>
                </div>
              </div>
            )}

            {/* Insufficient Evidence Gate */}
            {message.insufficientEvidence ? (
              <InsufficientEvidence />
            ) : (
              /* Markdown Prose */
              <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 select-text">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props: any) {
                      const { children, className, node, ...rest } = props;
                      const rawMeta = className || '';
                      const langMatch = /language-([^\s]+)/.exec(rawMeta);
                      const fullTag = langMatch ? langMatch[1] : '';
                      const [language, filename] = fullTag.includes(':')
                        ? fullTag.split(':')
                        : [fullTag, undefined];
                      const codeContent = String(children).replace(/\n$/, '');
                      const codeId = Math.abs(codeContent.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
                      const isCopied = copiedCodeIndex === codeId;

                      return langMatch ? (
                        <div className="relative group my-4 rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-[#0b0b12] dark:bg-[#07070b] overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40 select-text">
                          {/* Code Header Bar */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 dark:bg-white/[0.04] border-b border-zinc-800 dark:border-white/[0.06] text-xs select-none">
                            <div className="flex items-center gap-2">
                              {/* macOS style window dots */}
                              <div className="flex items-center gap-1.5 pl-1 opacity-70">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                              </div>
                              <span className="font-mono text-[11px] font-semibold text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 uppercase tracking-wider">
                                {language || 'code'}
                              </span>
                              {filename && (
                                <span className="font-mono text-[11px] text-zinc-400">
                                  {filename}
                                </span>
                              )}
                            </div>

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyCode(codeContent, codeId)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-all text-[11px] font-medium border border-white/[0.08] active:scale-95 cursor-pointer"
                              aria-label="کپی کد"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied ✓</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Code Highlighter with Line Numbers & Monospace Font */}
                          <div className="overflow-x-auto p-1 font-mono text-xs sm:text-[13px] leading-relaxed scrollbar-thin">
                            <SyntaxHighlighter
                              {...rest}
                              PreTag="div"
                              language={language || 'text'}
                              style={vscDarkPlus}
                              showLineNumbers={true}
                              lineNumberStyle={{
                                minWidth: '2.5em',
                                paddingRight: '1em',
                                paddingLeft: '0.25em',
                                textAlign: 'right',
                                userSelect: 'none',
                                opacity: 0.35,
                                color: '#94a3b8',
                                fontSize: '0.85em',
                              }}
                              dir="ltr"
                              className="!p-3.5 !m-0 !bg-transparent font-mono leading-relaxed select-text"
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ) : (
                        <code {...rest} className="px-1.5 py-0.5 rounded-md bg-blue-500/10 dark:bg-white/[0.08] text-blue-600 dark:text-sky-400 font-mono text-[0.85em] font-medium select-text">
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {textContent}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-blink mr-1 align-middle rounded-sm select-none" />
                )}
              </div>
            )}

            {/* Source Citations Carousel - Render ONLY when sufficient evidence and not insufficientEvidence */}
            {!message.insufficientEvidence && message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/[0.06] flex flex-col gap-2.5 select-none">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    <span>مستندات و منابع استناد شده ({message.sources.length}):</span>
                  </div>
                  {message.groundingScore && message.groundingScore.documentEvidence > 0 && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">اتکا به مستندات:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{message.groundingScore.documentEvidence}%</span>
                      <span className="text-zinc-400">/</span>
                      <span className="text-zinc-500 dark:text-zinc-400">استدلال هوش مصنوعی:</span>
                      <span className="text-zinc-600 dark:text-zinc-300 font-semibold">{message.groundingScore.aiReasoning}%</span>
                    </div>
                  )}
                </div>
                <div className="flex overflow-x-auto pb-2 pt-1 gap-3 snap-x scrollbar-thin">
                  {message.sources.map((src, i) => (
                    <div key={i} className="snap-start">
                      <SourceCard
                        title={src.title}
                        url={src.url}
                        section={src.section}
                        score={src.score}
                        totalScore={message.sources?.reduce((acc, s) => acc + (s.score || 0), 0) || 1}
                        groundingPct={message.groundingScore?.documentEvidence}
                        onExplain={onExplainSource ? () => onExplainSource(src.title) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assistant Action Bar (Copy, Regenerate, Like, Dislike) */}
            {!isStreaming && textContent && (
              <div className="flex items-center gap-1.5 pt-1 text-zinc-400 select-none">
                {/* Copy Button */}
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleCopyResponse}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 cursor-pointer",
                      isCopiedResponse
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-zinc-200 dark:border-white/[0.06]"
                    )}
                    aria-label="کپی پاسخ"
                  >
                    {isCopiedResponse ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isCopiedResponse ? "Copied to clipboard" : "Copy response"}
                  </TooltipContent>
                </Tooltip>

                {/* Regenerate Action for the last response */}
                {isLastAssistant && onRegenerate && (
                  <Tooltip>
                    <TooltipTrigger
                      onClick={onRegenerate}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/[0.06] transition-all duration-150 active:scale-95 cursor-pointer"
                      aria-label="تولید مجدد پاسخ"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Regenerate response
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Like Button */}
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleLike}
                    className={cn(
                      "p-1.5 rounded-lg text-xs border transition-all duration-150 active:scale-95 cursor-pointer",
                      reaction === 'like'
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-zinc-200 dark:border-white/[0.06]"
                    )}
                    aria-label="پاسخ مفید بود"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    پاسخ خوب بود
                  </TooltipContent>
                </Tooltip>

                {/* Dislike Button */}
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleDislike}
                    className={cn(
                      "p-1.5 rounded-lg text-xs border transition-all duration-150 active:scale-95 cursor-pointer",
                      reaction === 'dislike'
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                        : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border-zinc-200 dark:border-white/[0.06]"
                    )}
                    aria-label="پاسخ ضعیف بود"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    پاسخ نیاز به بهبود دارد
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Follow-up Suggestions Chips */}
            {message.suggestions && message.suggestions.length > 0 && onSuggestionClick && (
              <div className="mt-2 flex flex-wrap gap-2 pt-2 select-none">
                {message.suggestions.map((suggestion, i) => (
                  <SuggestionChip
                    key={i}
                    text={suggestion}
                    onClick={onSuggestionClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
