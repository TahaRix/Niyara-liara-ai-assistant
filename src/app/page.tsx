"use client";

import { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatContainer } from '../components/ChatContainer';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    sendMessage,
    regenerateLastMessage,
    resetChat,
    switchSession,
    deleteSession
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard shortcuts setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus input on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector('textarea');
        if (input) input.focus();
      }
      // Escape clears input focus
      if (e.key === 'Escape') {
        const input = document.querySelector('textarea');
        if (input) input.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground font-sans antialiased transition-colors duration-200">
      {/* Desktop Sidebar with smooth collapse */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block h-full overflow-hidden shrink-0 border-l border-border z-30 select-none bg-sidebar text-sidebar-foreground"
          >
            <Sidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onNewChat={resetChat}
              onSelectSession={switchSession}
              onDeleteSession={deleteSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Backdrop & Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="lg:hidden fixed inset-y-0 right-0 w-[280px] max-w-[85vw] bg-sidebar text-sidebar-foreground z-50 shadow-2xl border-l border-border select-none"
            >
              <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={() => {
                  resetChat();
                  setIsMobileOpen(false);
                }}
                onSelectSession={(id) => {
                  switchSession(id);
                  setIsMobileOpen(false);
                }}
                onDeleteSession={deleteSession}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main AI Workspace Canvas */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Header
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-background">
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            onRegenerateLast={regenerateLastMessage}
          />
        </main>
      </div>
    </div>
  );
}
