"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PenLine } from 'lucide-react';

interface TextSelectionPopoverProps {
  onAskNiyara: (selectedText: string) => void;
  onWrite: (selectedText: string) => void;
}

export function TextSelectionPopover({ onAskNiyara, onWrite }: TextSelectionPopoverProps) {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText('');
      setPosition(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setSelectedText('');
      setPosition(null);
      return;
    }

    // Do not trigger if selection is inside an editable input or textarea
    const anchorNode = selection.anchorNode;
    if (anchorNode) {
      const parentElement = anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement;
      if (parentElement?.closest('textarea, input, [contenteditable="true"]')) {
        setSelectedText('');
        setPosition(null);
        return;
      }
    }

    try {
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          // Position floating pill centered right above the selected bounding box
          const x = Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2));
          const y = Math.max(40, rect.top - 10);

          setSelectedText(text);
          setPosition({ x, y });
        }
      }
    } catch (err) {
      // Ignored
    }
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      // Small timeout to allow selection to settle after drag release
      setTimeout(checkSelection, 30);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
        setTimeout(checkSelection, 30);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      // Hide button immediately when starting a new mouse drag/click
      setSelectedText('');
      setPosition(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [checkSelection]);

  const handleAskAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      onAskNiyara(selectedText);
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setPosition(null);
    }
  };

  const handleWriteAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      onWrite(selectedText);
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setPosition(null);
    }
  };

  if (!position || !selectedText) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.92, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: 99999,
        }}
        className="pointer-events-auto select-none"
      >
        <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-[#14141d]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/[0.15] rounded-2xl shadow-xl dark:shadow-2xl shadow-black/10 dark:shadow-black/80 ring-1 ring-blue-500/20">
          {/* Action 1: Ask Niyara */}
          <button
            onMouseDown={handleAskAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Niyara</span>
          </button>

          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-0.5" />

          {/* Action 2: Write */}
          <button
            onMouseDown={handleWriteAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Write</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
