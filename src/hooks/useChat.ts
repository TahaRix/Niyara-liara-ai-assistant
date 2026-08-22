import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, SSEEventType, ChatSession } from '../types';

const STORAGE_KEY = 'liara_ai_sessions';

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }, []);

  // Save sessions when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const updateCurrentSession = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === currentSessionId);
      if (sessionIndex === -1) return prevSessions;

      const newSessions = [...prevSessions];
      const updatedMessages = updater(newSessions[sessionIndex].messages);

      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        messages: updatedMessages,
        updatedAt: Date.now()
      };

      return newSessions;
    });
  }, [currentSessionId]);

  const sendMessage = useCallback(async (text: string, files?: File[], customHistory?: ChatMessage[]) => {
    if (!text.trim() && (!files || files.length === 0)) return;

    // Create session if none exists
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: text.slice(0, 30) + (text.length > 30 ? '...' : '') || 'پیوست فایل',
        updatedAt: Date.now(),
        messages: []
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      activeSessionId = newSession.id;
    }

    const attachments = files ? await Promise.all(files.map(async f => ({
        name: f.name,
        type: f.type,
        content: f.type.startsWith('image/')
            ? await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(f);
              })
            : await f.text()
    }))) : undefined;

    const newUserMessage: ChatMessage = {
        role: 'user',
        content: text,
        attachments
    };

    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prevSessions;

      const newSessions = [...prevSessions];
      const baseMsgs = customHistory !== undefined ? customHistory : newSessions[sessionIndex].messages;
      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        messages: [...baseMsgs, newUserMessage],
        updatedAt: Date.now()
      };
      return newSessions;
    });

    setIsLoading(true);
    setError(null);

    // Initial empty assistant message to append to
    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prevSessions;

      const newSessions = [...prevSessions];
      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        messages: [...newSessions[sessionIndex].messages, { role: 'assistant', content: '' }]
      };
      return newSessions;
    });

    try {
      // Get latest messages for history
      const currentMsgs = customHistory !== undefined
        ? customHistory
        : (sessions.find(s => s.id === activeSessionId)?.messages || []);
      const historyForApi = [...currentMsgs, newUserMessage];
      const history = historyForApi.filter(m => !m.insufficientEvidence && !m.conflicting);

      // summarize context to last 4 messages to save tokens (Phase 5 req)
      const compressedHistory = history.slice(-4);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: compressedHistory, attachments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ارتباط با سرور');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not readable');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep incomplete part in buffer

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            try {
              const dataStr = part.replace('data: ', '').trim();
              if (!dataStr) continue;

              const event = JSON.parse(dataStr);
              handleSSEEvent(event, activeSessionId);
            } catch (e) {
              console.error('Failed to parse SSE event:', part, e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setSessions(prevSessions => {
         const sessionIndex = prevSessions.findIndex(s => s.id === activeSessionId);
         if (sessionIndex === -1) return prevSessions;

         const newSessions = [...prevSessions];
         const msgs = [...newSessions[sessionIndex].messages];
         msgs[msgs.length - 1].content = `خطا: ${err.message}`;

         newSessions[sessionIndex] = {
           ...newSessions[sessionIndex],
           messages: msgs
         };
         return newSessions;
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, sessions]);

  const regenerateLastMessage = useCallback(() => {
    if (!currentSessionId) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || session.messages.length < 2) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const userMessage = session.messages[lastUserIndex];
    const userText = typeof userMessage.content === 'string' ? userMessage.content : '';
    const historyBeforeUser = session.messages.slice(0, lastUserIndex);

    // Call sendMessage with sliced history
    sendMessage(userText, undefined, historyBeforeUser);
  }, [currentSessionId, sessions, sendMessage]);

  const handleSSEEvent = (event: { type: SSEEventType, data: any }, sessionId: string) => {
    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return prevSessions;

      const newSessions = [...prevSessions];
      const newMsgs = [...newSessions[sessionIndex].messages];
      const lastMsg = { ...newMsgs[newMsgs.length - 1] };

      if (!lastMsg || lastMsg.role !== 'assistant') return prevSessions;

      newMsgs[newMsgs.length - 1] = lastMsg;

      switch (event.type) {
        case 'chunk':
          lastMsg.content += event.data;
          break;
        case 'sources':
          lastMsg.sources = event.data;
          break;
        case 'grounding':
          lastMsg.groundingScore = event.data;
          break;
        case 'suggestions':
          lastMsg.suggestions = event.data;
          break;
        case 'insufficient_evidence':
          lastMsg.insufficientEvidence = true;
          break;
        case 'clarification':
          lastMsg.content = event.data;
          break;
        case 'conflict_warning':
          lastMsg.conflicting = true;
          lastMsg.conflictDetails = event.data;
          break;
        case 'done':
          break;
      }

      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        messages: newMsgs
      };

      return newSessions;
    });
  };

  const resetChat = useCallback(() => {
    setCurrentSessionId(null);
    setError(null);
  }, []);

  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    setError(null);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return filtered;
    });
  }, [currentSessionId]);

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    error,
    sendMessage,
    regenerateLastMessage,
    resetChat,
    switchSession,
    deleteSession
  };
}
