"use client";

import { motion } from 'framer-motion';

export function InsufficientEvidence() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed select-text"
    >
      <p>این مورد در مستندات لیارا پیدا نشد. اگر اطلاعات بیشتری دارید ارسال کنید تا بررسی کنم.</p>
    </motion.div>
  );
}
