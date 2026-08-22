"use client";

import { useRef, useEffect, useState } from 'react';
import { ChatMessage as IChatMessage } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput, AttachedContext } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { ChevronDown } from 'lucide-react';
import { TextSelectionPopover } from './TextSelectionPopover';

interface ChatContainerProps {
  messages: IChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, files?: File[]) => void;
  onRegenerateLast?: () => void;
}

export function ChatContainer({ messages, isLoading, onSendMessage, onRegenerateLast }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    if (isAtBottom || (messages.length > 0 && messages[messages.length - 1].role === 'user')) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  // Track scroll position for floating scroll button
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      setShowScrollButton(!isAtBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Handlers for floating selection toolbar
  const handleAskNiyara = (selectedText: string) => {
    setAttachedContext({ text: selectedText, mode: 'ask' });
  };

  const handleWrite = (selectedText: string) => {
    setAttachedContext({ text: selectedText, mode: 'write' });
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-background overflow-hidden transition-colors duration-200">
      {/* Floating Selection Assistant Menu */}
      <TextSelectionPopover onAskNiyara={handleAskNiyara} onWrite={handleWrite} />

      {/* Scrollable Conversation Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full relative scrollbar-thin"
      >
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 pt-6 pb-48 min-h-full flex flex-col justify-start">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center my-auto">
              <WelcomeScreen onSelect={(text) => onSendMessage(text)} />
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
                  isLastAssistant={idx === messages.length - 1 && msg.role === 'assistant'}
                  onSuggestionClick={(text) => onSendMessage(text)}
                  onExplainSource={(title) => onSendMessage(`توضیح بیشتر درباره: ${title}`)}
                  onRegenerate={onRegenerateLast}
                />
              ))}
              <div ref={messagesEndRef} className="h-6" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-[#181822] hover:bg-zinc-100 dark:hover:bg-[#20202e] border border-zinc-200 dark:border-white/10 rounded-full shadow-lg dark:shadow-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white z-20 transition-all active:scale-95 animate-fade-in cursor-pointer"
          aria-label="اسکرول به انتهای پیام‌ها"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Floating Composer Bar at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-background via-background/90 to-transparent z-10 pointer-events-none transition-colors duration-200">
        <div className="pointer-events-auto">
          <ChatInput
            onSend={onSendMessage}
            disabled={isLoading}
            attachedContext={attachedContext}
            onClearContext={() => setAttachedContext(null)}
          />
        </div>
      </div>
    </div>
  );
}
