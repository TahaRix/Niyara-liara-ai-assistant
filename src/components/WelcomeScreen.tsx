"use client";

import { motion } from 'framer-motion';
import { Server, Database, Globe, Cpu, ArrowLeft, Terminal } from 'lucide-react';

interface WelcomeScreenProps {
  onSelect: (text: string) => void;
}

export function WelcomeScreen({ onSelect }: WelcomeScreenProps) {
  const suggestions = [
    {
      title: "استقرار برنامه",
      desc: "نحوه استقرار پروژه‌های NodeJS، Django یا لاراول با Liara CLI",
      prompt: "چگونه پروژه Node.js را با Liara CLI در لیارا مستقر کنم؟",
      icon: <Server className="w-4 h-4 text-blue-400" />,
      badge: "Deploy"
    },
    {
      title: "دیتابیس ابری",
      desc: "راه‌اندازی و اتصال پایگاه‌داده مدیریت‌شده PostgreSQL یا Redis",
      prompt: "نحوه ساخت دیتابیس PostgreSQL و اتصال امن به برنامه چگونه است؟",
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      badge: "Database"
    },
    {
      title: "اتصال دامنه اختصاصی",
      desc: "پیکربندی DNS و صدور گواهی SSL خودکار برای برنامه‌ها",
      prompt: "چگونه دامنه اختصاصی و SSL رایگان برای برنامه‌ام تنظیم کنم؟",
      icon: <Globe className="w-4 h-4 text-sky-400" />,
      badge: "Networking"
    },
    {
      title: "سرویس‌های هوش مصنوعی",
      desc: "استفاده از مدل‌های زبان بزرگ، پردازش تصویر و هاستینگ هوش مصنوعی",
      prompt: "امکانات و مدل‌های هاستینگ هوش مصنوعی لیارا کدام‌اند؟",
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      badge: "AI Cloud"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center max-w-2xl w-full text-center px-4 py-8 select-none"
    >
      {/* Brand Hero Glow with favicon.ico */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-600/15 dark:bg-blue-600/25 rounded-3xl blur-2xl -z-10" />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-white to-zinc-100 dark:from-[#161622] dark:to-[#1e1e2d] flex items-center justify-center shadow-lg dark:shadow-xl shadow-blue-500/10 dark:shadow-blue-500/20 border border-zinc-200/80 dark:border-blue-500/30 p-3">
          <img
            src="/favicon.ico"
            alt="Niyara"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
        Niyara
      </h1>
      <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base font-medium mb-2">
        دستیار هوشمند لیارا
      </p>
      <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed mb-8">
        پاسخ‌گویی سریع، دقیق و با استناد مستقیم به مستندات رسمی برای توسعه‌دهندگان پلتفرم لیارا
      </p>

      {/* Quick Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-right">
        {suggestions.map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(item.prompt)}
            className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#14141c]/80 hover:bg-zinc-50 dark:hover:bg-[#181824] border border-zinc-200/80 dark:border-white/[0.07] hover:border-blue-500/40 cursor-pointer transition-all duration-200 shadow-sm dark:shadow-md dark:shadow-black/20"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.06] group-hover:border-blue-500/30 transition-colors">
                  {item.icon}
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-white/[0.06]">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                {item.desc}
              </p>
            </div>

            <div className="flex items-center justify-end gap-1 mt-3 pt-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>پرسیدن این سوال</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-black/[0.02] dark:bg-white/[0.02] border border-zinc-200/60 dark:border-white/[0.05] px-3.5 py-1.5 rounded-full">
        <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
        <span>برای فوکوس روی فیلد ورودی کلید</span>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/[0.05] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-white/[0.1]">Ctrl + K</kbd>
        <span>را فشار دهید</span>
      </div>
    </motion.div>
  );
}
