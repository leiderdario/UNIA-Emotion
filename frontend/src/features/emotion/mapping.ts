import type { Emotion } from '../../types';

export const EMOTION_COLOR: Record<Emotion, string> = {
  happy: '#F5C842',
  angry: '#E24B4A',
  sad: '#378ADD',
  disgusted: '#639922',
  surprised: '#D4537E',
  fearful: '#9B59B6',
  neutral: '#888780',
};

export const EMOTION_LABEL: Record<Emotion, string> = {
  happy: 'Felicidad',
  angry: 'Enojo',
  sad: 'Tristeza',
  disgusted: 'Asco',
  surprised: 'Sorpresa',
  fearful: 'Miedo',
  neutral: 'Neutral',
};

export const CONFIDENCE_THRESHOLD = 0.4;
export const DEBOUNCE_WINDOW_MS = 1500;
export const DOMINANCE_RATIO = 0.5;

export interface FaceApiExpressions {
  happy: number;
  sad: number;
  angry: number;
  disgusted: number;
  surprised: number;
  neutral: number;
  fearful: number;
}

/**
 * Mapea el resultado de face-api a una emoción UNIA.
 * Devuelve null si ninguna expresión supera el umbral.
 */
export function mapExpressionToEmotion(
  expressions: FaceApiExpressions
): { emotion: Emotion; confidence: number } | null {
  const normalized: Record<Emotion, number> = {
    happy: expressions.happy,
    angry: expressions.angry,
    sad: expressions.sad,
    disgusted: expressions.disgusted,
    surprised: expressions.surprised,
    fearful: expressions.fearful,
    neutral: expressions.neutral,
  };
  let winner: Emotion = 'neutral';
  let best = -Infinity;
  for (const e of Object.keys(normalized) as Emotion[]) {
    if (normalized[e] > best) {
      best = normalized[e];
      winner = e;
    }
  }
  if (best < CONFIDENCE_THRESHOLD) return null;
  return { emotion: winner, confidence: best };
}

interface FrameSample {
  ts: number;
  emotion: Emotion;
  confidence: number;
}

/**
 * Buffer circular que almacena muestras dentro de una ventana temporal.
 * Determina si una emoción domina una fracción del buffer (RF-12).
 */
export class EmotionDebouncer {
  private samples: FrameSample[] = [];

  constructor(
    private windowMs: number = DEBOUNCE_WINDOW_MS,
    private dominance: number = DOMINANCE_RATIO
  ) {}

  push(sample: FrameSample) {
    this.samples.push(sample);
    const cutoff = sample.ts - this.windowMs;
    while (this.samples.length && this.samples[0].ts < cutoff) {
      this.samples.shift();
    }
  }

  /**
   * Devuelve la emoción que domina el buffer con confianza promedio,
   * o null si ninguna alcanza el ratio.
   * `currentEmotion` se usa para no emitir cambio si ya estás en esa emoción.
   */
  resolve(currentEmotion: Emotion | null): { emotion: Emotion; confidence: number } | null {
    if (this.samples.length === 0) return null;
    const counts = new Map<Emotion, { count: number; sumConfidence: number }>();
    for (const s of this.samples) {
      const entry = counts.get(s.emotion) ?? { count: 0, sumConfidence: 0 };
      entry.count++;
      entry.sumConfidence += s.confidence;
      counts.set(s.emotion, entry);
    }
    let bestEmotion: Emotion | null = null;
    let bestCount = 0;
    let bestConfidence = 0;
    for (const [emotion, { count, sumConfidence }] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestEmotion = emotion;
        bestConfidence = sumConfidence / count;
      }
    }
    if (!bestEmotion) return null;
    const ratio = bestCount / this.samples.length;
    if (ratio < this.dominance) return null;
    if (bestEmotion === currentEmotion) return null;
    return { emotion: bestEmotion, confidence: bestConfidence };
  }

  reset() {
    this.samples = [];
  }

  size() {
    return this.samples.length;
  }
}
