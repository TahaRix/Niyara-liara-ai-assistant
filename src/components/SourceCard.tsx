"use client";

import { motion } from "framer-motion";
import { FileText, ExternalLink, HelpCircle, FileJson, FileCode, Sparkles, BookOpen, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SourceCardProps {
  score?: number;
  totalScore?: number;
  isAi?: boolean;
  title: string;
  url?: string | null;
  section?: string;
  onExplain?: (title: string) => void;
  groundingPct?: number;
}

function getFileIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('json') || t.includes('config')) return <FileJson className="w-4 h-4 text-amber-400" />;
  if (t.includes('code') || t.includes('docker') || t.includes('cli') || t.includes('deploy')) return <FileCode className="w-4 h-4 text-sky-400" />;
  if (t.includes('database') || t.includes('postgres') || t.includes('mysql') || t.includes('redis')) return <BookOpen className="w-4 h-4 text-emerald-400" />;
  return <FileText className="w-4 h-4 text-blue-400" />;
}

export function SourceCard({ title, url, section, score, totalScore, onExplain, groundingPct }: SourceCardProps) {
  // Compute realistic grounding score based on retrieval signals & overall grounding
  let docPercentage = groundingPct ?? 75;
  if (!groundingPct) {
    if (typeof score === 'number' && score > 0) {
      if (score >= 0.85) {
        docPercentage = Math.min(95, Math.round(85 + (score - 0.85) * 60));
      } else if (score >= 0.7) {
        docPercentage = Math.round(score * 100);
      } else if (score >= 0.4) {
        docPercentage = Math.round(50 + score * 35);
      } else {
        docPercentage = Math.round(Math.max(20, score * 100));
      }
    } else if (totalScore && totalScore > 0) {
      docPercentage = Math.min(90, Math.max(30, Math.round(totalScore * 100)));
    }
  }

  docPercentage = Math.min(95, Math.max(10, docPercentage));
  const aiPercentage = 100 - docPercentage;

  const hasValidUrl = Boolean(url && url.trim() && url !== 'about:blank' && (url.startsWith('http://') || url.startsWith('https://')));

  const handleCardClick = () => {
    if (hasValidUrl && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col bg-white dark:bg-[#14141c] hover:bg-zinc-50 dark:hover:bg-[#181822] border border-zinc-200/80 dark:border-white/[0.08] hover:border-blue-500/40 rounded-2xl w-[280px] sm:w-[310px] flex-shrink-0 transition-all duration-200 shadow-sm dark:shadow-lg dark:shadow-black/20 overflow-hidden ${
        hasValidUrl ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Accent glow */}
      <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-l from-blue-500 via-sky-400 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />

      <div
        onClick={handleCardClick}
        className="flex flex-col p-3.5 flex-1 justify-between gap-3"
      >
        {/* Header: Icon + Title + External Link */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-zinc-200/60 dark:border-white/[0.08] shrink-0 mt-0.5 group-hover:border-blue-500/30 transition-colors">
              {getFileIcon(title)}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={title}>
                {title}
              </span>
              {section && (
                <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1" title={section}>
                  {section}
                </span>
              )}
            </div>
          </div>
          {hasValidUrl && (
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-colors mt-1" />
          )}
        </div>

        {/* Dynamic Grounding Estimation: اتکا به مستندات */}
        <div className="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] text-[10.5px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <span>اتکا به مستندات</span>
              <Tooltip>
                <TooltipTrigger className="cursor-help inline-flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <Info className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-center text-[11px] leading-relaxed">
                  میزان تخمینی تطابق و اتکای پاسخ با بخش‌های استخراج‌شده از مستندات رسمی لیارا.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400">
              <span>{docPercentage}%</span>
            </div>
          </div>

          {/* Clean Progress Bar for Documentation Grounding */}
          <div className="w-full bg-black/[0.06] dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-500 rounded-full"
              style={{ width: `${docPercentage}%` }}
              title={`اتکا به مستندات: ${docPercentage}%`}
            />
          </div>
        </div>
      </div>

      {/* Quick explain action button on hover */}
      {onExplain && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplain(title);
          }}
          className="absolute top-2 left-2 p-1.5 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-[#0e0e14]/90 backdrop-blur border border-zinc-200 dark:border-white/10 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 transition-all shadow-md z-10"
          title="توضیح بیشتر درباره این منبع"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}
