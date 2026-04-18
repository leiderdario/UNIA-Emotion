import type { ChatMessage as Msg } from '../types';

interface Props {
  message: Msg;
  streaming?: boolean;
  onSpeak?: (text: string, id: string) => void;
  onStopSpeaking?: () => void;
  isSpeaking?: boolean;
}

const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const StopSpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

export function ChatMessage({ message, streaming, onSpeak, onStopSpeaking, isSpeaking }: Props) {
  const isUser = message.role === 'user';
  const time = new Date(message.createdAt);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fadeIn`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={
            isUser
              ? 'emotion-bg rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap'
              : 'glass-card rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap'
          }
          style={isUser ? { color: '#0a0a0f' } : { color: 'var(--text-primary)' }}
          aria-live={streaming ? 'polite' : undefined}
        >
          {message.content}
          {streaming && (
            <span className="inline-block w-1.5 h-4 align-middle ml-1 animate-pulse rounded-sm emotion-bg" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {timeStr}
          </span>
          {/* TTS button — only on assistant messages, not while streaming */}
          {!isUser && !streaming && onSpeak && (
            <button
              onClick={() => {
                if (isSpeaking) {
                  onStopSpeaking?.();
                } else {
                  onSpeak(message.content, message.id);
                }
              }}
              className={`tts-btn ${isSpeaking ? 'tts-btn-active' : ''}`}
              title={isSpeaking ? 'Detener lectura' : 'Escuchar respuesta'}
              aria-label={isSpeaking ? 'Detener lectura' : 'Escuchar respuesta'}
            >
              {isSpeaking ? <StopSpeakerIcon /> : <SpeakerIcon />}
              {isSpeaking && <span className="tts-waves" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
