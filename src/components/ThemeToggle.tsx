"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08]" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] transition-colors cursor-pointer"
        aria-label="تغییر تم"
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 text-zinc-700" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>{isDark ? "تغییر به تم روشن (Light)" : "تغییر به تم تاریک (Dark)"}</span>
      </TooltipContent>
    </Tooltip>
  );
}