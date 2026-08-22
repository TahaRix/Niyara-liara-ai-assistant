"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, ArrowUp, X, FileText, Image as ImageIcon, Sparkles, Quote, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AttachedContext {
  text: string;
  mode: 'ask' | 'write';
}

interface ChatInputProps {
  onSend: (text: string, files?: File[]) => void;
  disabled: boolean;
  attachedContext?: AttachedContext | null;
  onClearContext?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  attachedContext,
  onClearContext,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus textarea when attachedContext arrives
  useEffect(() => {
    if (attachedContext && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [attachedContext]);

  // Auto-resize textarea smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Generate previews for images
  useEffect(() => {
    files.forEach((file) => {
      if (file.type.startsWith('image/') && !previews[file.name]) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [file.name]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    });
  }, [files, previews]);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || files.length > 0 || attachedContext) && !disabled) {
      let finalMessage = trimmed;

      if (attachedContext) {
        if (attachedContext.mode === 'write') {
          finalMessage = `Rewrite this text:\n${attachedContext.text}\n\nInstruction:\n${trimmed || 'Rewrite and improve professionally'}`;
        } else {
          // 'ask' mode
          if (trimmed) {
            finalMessage = `${trimmed} based on selected text:\n${attachedContext.text}`;
          } else {
            finalMessage = `Please explain this selected text:\n${attachedContext.text}`;
          }
        }
      }

      onSend(finalMessage, files.length > 0 ? files : undefined);
      setText('');
      setFiles([]);
      setPreviews({});
      if (onClearContext) onClearContext();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter((file) => {
        if (file.size > 2 * 1024 * 1024) {
          alert(`فایل ${file.name} بیشتر از ۲ مگابایت است.`);
          return false;
        }
        return true;
      });
      setFiles((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (idx: number) => {
    const fileToRemove = files[idx];
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (fileToRemove?.name && previews[fileToRemove.name]) {
      setPreviews((prev) => {
        const updated = { ...prev };
        delete updated[fileToRemove.name];
        return updated;
      });
    }
  };

  const canSubmit = !disabled && (text.trim().length > 0 || files.length > 0 || !!attachedContext);

  const placeholderText = attachedContext
    ? attachedContext.mode === 'write'
      ? 'دستور ویرایش یا بازنویسی این متن را بنویسید (مثلاً: بازنویسی حرفه‌ای)...'
      : 'سوال خود درباره این متن انتخاب‌شده را بنویسید (مثلاً: این بخش را توضیح دهید)...'
    : 'سوال خود درباره استقرار و سرویس‌های لیارا را بپرسید...';

  return (
    <div className="w-full max-w-[760px] mx-auto flex flex-col items-center">
      {/* Floating Composer Container */}
      <div className="w-full relative rounded-[24px] bg-white/95 dark:bg-[#181822]/90 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/[0.1] shadow-xl dark:shadow-2xl shadow-black/5 dark:shadow-black/60 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 overflow-hidden">

        {/* Attached Selection Context Badge */}
        <AnimatePresence>
          {attachedContext && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3.5 pt-3 pb-1 border-b border-zinc-200 dark:border-white/[0.06] bg-blue-50/50 dark:bg-blue-950/20"
            >
              <div className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#12121a] border border-blue-500/20 text-xs shadow-xs">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    {attachedContext.mode === 'write' ? (
                      <PenLine className="w-3.5 h-3.5" />
                    ) : (
                      <Quote className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px] text-blue-600 dark:text-blue-400">
                      <span>{attachedContext.mode === 'write' ? 'Write Mode' : 'Attached Context'}</span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px] line-clamp-2 mt-0.5 leading-relaxed dir-auto">
                      {attachedContext.text}
                    </p>
                  </div>
                </div>
                {onClearContext && (
                  <button
                    onClick={onClearContext}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors shrink-0"
                    aria-label="حذف متن پیوست"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment Previews Tray */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2.5 px-4 pt-3.5 pb-1 border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02]"
            >
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className="relative group flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.04] dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.1] rounded-xl text-xs text-zinc-700 dark:text-zinc-200 shrink-0 shadow-sm"
                >
                  {f.type.startsWith('image/') && previews[f.name] ? (
                    <div className="w-6 h-6 rounded-md overflow-hidden bg-black/10 dark:bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previews[f.name]} alt={f.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  )}
                  <span className="truncate max-w-[130px] font-mono text-[11px]">{f.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                    aria-label="حذف فایل"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer Textarea & Action Row */}
        <div className="flex flex-col p-2.5 sm:p-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholderText}
            rows={1}
            dir="rtl"
            className="w-full bg-transparent resize-none border-0 focus:outline-none focus:ring-0 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 py-1.5 px-2 max-h-[180px] leading-relaxed scrollbar-thin"
          />

          {/* Bottom Tool Bar */}
          <div className="flex items-center justify-between pt-2 px-1 mt-1 border-t border-zinc-100 dark:border-white/[0.04]">
            {/* Left Controls: File Attachment */}
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.txt,.md,.log,package.json,Dockerfile,.png,.jpg,.jpeg,.webp"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-8 w-8 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
                title="افزودن فایل یا تصویر"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>

            {/* Right Controls: Send Button */}
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!canSubmit}
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center shadow-md",
                canSubmit
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-95 cursor-pointer"
                  : "bg-black/[0.05] dark:bg-white/[0.06] text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              )}
              aria-label="ارسال پیام"
            >
              {disabled ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 dark:border-white/20 border-t-blue-600 dark:border-t-white animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Caption */}
      <div className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400 select-none flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
        <span>پاسخ‌ها مستقیماً با استناد به مستندات رسمی لیارا تولید می‌شوند</span>
      </div>
    </div>
  );
}
