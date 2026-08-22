"use client";

import { MessageSquare, Plus, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { ChatSession } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-l border-sidebar-border select-none transition-all duration-300 relative w-full">
      {/* Top Header Section with Logo & New Chat */}
      <div className="p-3.5 flex flex-col gap-3 border-b border-sidebar-border">
        {/* Brand: Niyara - دستیار هوشمند لیارا */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-md shadow-blue-500/10 p-1.5 shrink-0 overflow-hidden">
              <img
                src="/favicon.ico"
                alt="Niyara Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">Niyara</span>
                <span className="text-[10px] font-medium bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 px-1.5 py-0.2 rounded-full">AI</span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">دستیار هوشمند لیارا</span>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm hover:shadow shadow-blue-600/20 border border-blue-400/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>گفتگوی جدید</span>
        </Button>

        {/* Search Box */}
        <div className="relative mt-0.5">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <Input
            placeholder="جستجو در گفتگوها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8.5 text-xs bg-black/[0.03] dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-white/[0.12] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 rounded-lg pr-9 pl-3 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors"
          />
        </div>
      </div>

      {/* Middle Session List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
        <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span>تاریخچه گفتگوها</span>
          <span className="text-[10px] bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">{filteredSessions.length}</span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-3 text-center space-y-2 text-zinc-400 dark:text-zinc-500">
            <div className="w-10 h-10 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 opacity-40" />
            </div>
            <p className="text-xs">{searchQuery ? 'نتیجه‌ای پیدا نشد' : 'هنوز گفتگویی ایجاد نشده'}</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = currentSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "group relative flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150",
                  isActive
                    ? "bg-black/[0.06] dark:bg-white/[0.08] text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200/80 dark:border-white/[0.08]"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-colors",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                    )}
                  />
                  <span className="truncate text-right">{session.title}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="حذف گفتگو"
                    className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Profile & Actions */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/60 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-600/30 border border-blue-500/30 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
              LA
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">کاربر لیارا</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">liara-user@cloud.ir</span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
        </div>
      </div>
    </aside>
  );
}
