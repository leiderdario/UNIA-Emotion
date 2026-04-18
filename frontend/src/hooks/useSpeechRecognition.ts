import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechStatus = 'idle' | 'listening' | 'error';

interface SpeechRecognitionResult {
  /** Accumulated final transcript */
  transcript: string;
  /** Current interim (partial) transcript */
  interimTranscript: string;
  status: SpeechStatus;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  clearTranscript: () => void;
}

// Augment window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedRef = useRef('');

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Tu navegador no soporta reconocimiento de voz');
      setStatus('error');
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-CO';

    recognition.onstart = () => {
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalChunk) {
        accumulatedRef.current += finalChunk;
        setTranscript(accumulatedRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        // Don't treat these as real errors — just keep idle
        return;
      }
      setError(
        event.error === 'not-allowed'
          ? 'Permiso de micrófono denegado'
          : 'Error de reconocimiento de voz'
      );
      setStatus('error');
    };

    recognition.onend = () => {
      // If still in listening mode (wasn't manually stopped), restart
      // This handles the browser auto-stopping after silence
      if (recognitionRef.current === recognition && status === 'listening') {
        try { recognition.start(); } catch { setStatus('idle'); }
        return;
      }
      setStatus('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionAPI, status]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null; // prevent auto-restart in onend
    if (rec) {
      try { rec.stop(); } catch { /* ignore */ }
    }
    setStatus('idle');
    setInterimTranscript('');
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') {
      stop();
    } else {
      start();
    }
  }, [status, start, stop]);

  const clearTranscript = useCallback(() => {
    accumulatedRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  return { transcript, interimTranscript, status, error, isSupported, start, stop, toggle, clearTranscript };
}
