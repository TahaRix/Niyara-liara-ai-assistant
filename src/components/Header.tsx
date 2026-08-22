"use client";

import { Menu, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex-none h-14 px-4 border-b border-zinc-200 dark:border-white/[0.07] bg-white/80 dark:bg-[#0b0b0f]/80 backdrop-blur-xl z-20 flex items-center justify-between sticky top-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label="تغییر وضعیت نوار کناری"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center p-1 overflow-hidden shadow-sm">
            <img src="/favicon.ico" alt="Niyara" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight">Niyara</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">دستیار هوشمند لیارا</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <a
          href="https://docs.liara.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.06] rounded-lg transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">مستندات اصلی لیارا</span>
        </a>
      </div>
    </header>
  );
}
