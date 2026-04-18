import { useCallback, useRef, useState } from 'react';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

/** Provider interface */
export interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
}

/**
 * Browser-native Web Speech API provider (free, no API key needed).
 * Uses a Spanish voice when available.
 */
class WebSpeechProvider implements TTSProvider {
  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'es-CO';
      utt.rate = 0.95;
      utt.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
      if (spanishVoice) utt.voice = spanishVoice;

      utt.onend = () => resolve();
      utt.onerror = (e) => reject(e);
      window.speechSynthesis.speak(utt);
    });
  }

  stop(): void {
    window.speechSynthesis.cancel();
  }
}

/**
 * ElevenLabs provider.
 * ⚠️ SEGURIDAD: Mueve la API key a una variable de entorno en producción
 * (import.meta.env.VITE_ELEVENLABS_API_KEY).
 *
 * Caching: el audio generado se guarda en un Map por texto para evitar
 * llamadas repetidas a la API cuando se reproduce el mismo mensaje.
 */
class ElevenLabsProvider implements TTSProvider {
  private client: ElevenLabsClient;
  private audio: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // text → objectURL

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY ?? 'sk_f5698bf73cfd796e1700ae960b59049640e04c86d55b7f27',
    });
  }

  private async fetchAudioUrl(text: string): Promise<string> {
    if (this.audioCache.has(text)) {
      return this.audioCache.get(text)!;
    }

    const { data } = await this.client.textToSpeech
      .convert('EXAVITQu4vr4xnSDxMaL', { // Bella — voz gratuita, funciona bien en español
        text,
        modelId: 'eleven_multilingual_v2',
      })
      .withRawResponse();

    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ReadableStream) {
      blob = await new Response(data).blob();
    } else {
      blob = new Blob([data as any], { type: 'audio/mpeg' });
    }

    const url = URL.createObjectURL(blob);
    this.audioCache.set(text, url);
    return url;
  }

  async speak(text: string): Promise<void> {
    this.stop();

    try {
      const audioUrl = await this.fetchAudioUrl(text);
      this.audio = new Audio(audioUrl);

      await new Promise<void>((resolve, reject) => {
        if (!this.audio) return resolve();
        this.audio.onended = () => resolve();
        this.audio.onerror = (e) => reject(e);
        this.audio.play();
      });
    } catch (error) {
      console.error('Error con ElevenLabs TTS:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }
}

export type TTSProviderType = 'browser' | 'elevenlabs';

const providers: Record<TTSProviderType, () => TTSProvider> = {
  browser: () => new WebSpeechProvider(),
  elevenlabs: () => new ElevenLabsProvider(),
};

export function useTTS(providerType: TTSProviderType = 'elevenlabs') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const providerRef = useRef<TTSProvider>(providers[providerType]());
  // Ref para saber el messageId activo sin depender de closures desactualizados
  const activeIdRef = useRef<string | null>(null);

  /**
   * toggle(text, messageId):
   * - Si está hablando/cargando el mismo mensaje → lo detiene.
   * - Si está hablando otro mensaje → detiene el actual y empieza el nuevo.
   * - Si está quieto → empieza a hablar.
   */
  const toggle = useCallback(async (text: string, messageId?: string) => {
    const incomingId = messageId ?? text; // usa el texto como ID si no hay messageId
    const isSameMessage = activeIdRef.current === incomingId;

    // Si ya está activo este mensaje → cancelar (toggle off)
    if (isSameMessage) {
      providerRef.current.stop();
      setIsSpeaking(false);
      setIsLoading(false);
      setSpeakingMessageId(null);
      activeIdRef.current = null;
      return;
    }

    // Detener cualquier audio previo
    providerRef.current.stop();
    setIsSpeaking(false);
    setIsLoading(false);
    setSpeakingMessageId(null);
    activeIdRef.current = null;

    // Iniciar nuevo audio
    activeIdRef.current = incomingId;
    setSpeakingMessageId(incomingId);

    try {
      setIsLoading(true);
      const speakPromise = providerRef.current.speak(text);
      setIsLoading(false);
      setIsSpeaking(true);
      await speakPromise;
    } catch {
      // Falla silenciosa
    } finally {
      // Solo limpiar si este mensaje sigue siendo el activo
      if (activeIdRef.current === incomingId) {
        setIsSpeaking(false);
        setIsLoading(false);
        setSpeakingMessageId(null);
        activeIdRef.current = null;
      }
    }
  }, []);

  const stop = useCallback(() => {
    providerRef.current.stop();
    setIsSpeaking(false);
    setIsLoading(false);
    setSpeakingMessageId(null);
    activeIdRef.current = null;
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { toggle, stop, isSpeaking, isLoading, speakingMessageId, isSupported };
}