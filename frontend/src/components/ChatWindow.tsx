import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { fetchConversationMessages, streamChatMessage } from '../api/chat';
import { useEmotionStore } from '../features/emotion/store';
import { useTTS } from '../hooks/useTTS';
import type { ChatMessage as Msg, Conversation } from '../types';

interface Props {
  conversationId: string | null;
  onConversationCreated?: (conv: Conversation) => void;
}

export function ChatWindow({ conversationId, onConversationCreated }: Props) {
  const emotion = useEmotionStore((s) => s.current);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggle: speak, stop: stopSpeaking, isSpeaking, speakingMessageId, isSupported: ttsSupported } = useTTS();

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchConversationMessages(conversationId);
        if (!cancelled) setMessages(res.messages);
      } catch {
        // Silent — new conversation might have no messages
        if (!cancelled) setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSpeak = useCallback((text: string, id: string) => {
    speak(text, id);
  }, [speak]);

  const send = async (content: string) => {
    setError(null);
    const userMsg: Msg = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      emotionAtTime: emotion,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    setStreamingText('');
    let acc = '';
    await streamChatMessage(content, emotion, {
      onConversationId: (id) => {
        // If this was a new conversation (no conversationId), notify parent
        if (!conversationId && onConversationCreated) {
          onConversationCreated({
            id,
            title: null,
            startedAt: new Date().toISOString(),
            lastEmotion: emotion,
            messageCount: 1,
          });
        }
      },
      onDelta: (chunk) => {
        acc += chunk;
        setStreamingText(acc);
      },
      onDone: () => {
        setMessages((m) => [
          ...m,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: acc,
            emotionAtTime: emotion,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreamingText(null);
        setBusy(false);
      },
      onError: (msg) => {
        setStreamingText(null);
        setBusy(false);
        setError(
          msg === 'GroqApiKeyNotConfigured'
            ? 'La API de Groq no está configurada en el servidor.'
            : msg === 'TooManyRequests'
              ? 'Demasiados mensajes. Espera un momento.'
              : 'No se pudo obtener respuesta. Intenta de nuevo.'
        );
      },
    }, conversationId).catch((err: Error) => {
      setStreamingText(null);
      setBusy(false);
      setError(err.message);
    });
  };

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-1 pb-2"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && !streamingText && (
          <div className="text-center py-16 animate-fadeIn">
            <div className="text-4xl mb-4">💬</div>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Dile algo a UNIA para comenzar.
            </p>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1 opacity-60">
              También puedes usar el micrófono 🎤
            </p>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            onSpeak={ttsSupported ? handleSpeak : undefined}
            onStopSpeaking={stopSpeaking}
            isSpeaking={speakingMessageId === m.id && isSpeaking}
          />
        ))}
        {streamingText !== null && (
          <ChatMessage
            streaming
            message={{
              id: 'stream',
              role: 'assistant',
              content: streamingText || '…',
              emotionAtTime: emotion,
              createdAt: new Date().toISOString(),
            }}
          />
        )}
      </div>
      {error && (
        <div
          className="text-sm rounded-xl p-3 mb-2"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}
      <ChatInput onSubmit={send} disabled={busy} />
    </div>
  );
}
