"use client";

import { Sparkles, ArrowLeft } from 'lucide-react';

interface SuggestionChipProps {
  text: string;
  onClick: (text: string) => void;
}

export function SuggestionChip({ text, onClick }: SuggestionChipProps) {
  return (
    <button
      onClick={() => onClick(text)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.04] hover:bg-blue-600/10 dark:hover:bg-blue-600/15 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-zinc-200/80 dark:border-white/[0.08] hover:border-blue-500/30 transition-all duration-150 shadow-sm active:scale-95 group text-right cursor-pointer"
    >
      <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
      <span>{text}</span>
      <ArrowLeft className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500 dark:text-blue-400" />
    </button>
  );
}
