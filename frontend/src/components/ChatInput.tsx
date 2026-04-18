import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

// SVG icons inline to avoid external deps
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export function ChatInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');

  const {
    transcript,
    interimTranscript,
    status: voiceStatus,
    isSupported,
    toggle: toggleVoice,
    clearTranscript,
  } = useSpeechRecognition();

  const isListening = voiceStatus === 'listening';

  // Sync speech transcript into the textarea in real time
  useEffect(() => {
    if (isListening) {
      const display = transcript + (interimTranscript || '');
      setText(display);
    }
  }, [transcript, interimTranscript, isListening]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    // Stop listening if active
    if (isListening) {
      toggleVoice();
    }
    onSubmit(trimmed);
    setText('');
    clearTranscript();
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  return (
    <form onSubmit={onFormSubmit} className="flex gap-2 items-end">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
        rows={1}
        placeholder={
          isListening
            ? '🎤 Escuchando... habla ahora'
            : disabled
              ? 'UNIA está respondiendo...'
              : 'Escribe un mensaje...'
        }
        className="input-dark flex-1 resize-none"
        style={{
          minHeight: '2.5rem',
          maxHeight: '6rem',
          borderColor: isListening ? 'var(--emotion-color)' : undefined,
          boxShadow: isListening ? '0 0 0 3px var(--emotion-color-soft)' : undefined,
        }}
      />
      {isSupported && (
        <button
          type="button"
          onClick={toggleVoice}
          disabled={disabled}
          className={`btn-icon ${isListening ? 'active voice-recording' : ''}`}
          title={isListening ? 'Detener dictado' : 'Dictar por voz'}
          aria-label={isListening ? 'Detener dictado' : 'Dictar por voz'}
        >
          {isListening ? <StopIcon /> : <MicIcon />}
        </button>
      )}
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="btn-icon"
        style={
          text.trim() && !disabled
            ? { background: 'var(--emotion-color)', color: '#0a0a0f' }
            : undefined
        }
        title="Enviar mensaje"
        aria-label="Enviar mensaje"
      >
        <SendIcon />
      </button>
    </form>
  );
}
