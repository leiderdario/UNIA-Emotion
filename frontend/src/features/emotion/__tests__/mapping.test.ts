import { describe, it, expect } from 'vitest';
import {
  EmotionDebouncer,
  mapExpressionToEmotion,
  CONFIDENCE_THRESHOLD,
} from '../mapping';

const baseExpr = {
  happy: 0,
  sad: 0,
  angry: 0,
  disgusted: 0,
  surprised: 0,
  neutral: 0,
  fearful: 0,
};

describe('mapExpressionToEmotion', () => {
  it('returns the winning expression above threshold', () => {
    const result = mapExpressionToEmotion({ ...baseExpr, happy: 0.85, neutral: 0.1 });
    expect(result).toEqual({ emotion: 'happy', confidence: 0.85 });
  });

  it('returns null when nothing exceeds threshold', () => {
    const result = mapExpressionToEmotion({ ...baseExpr, happy: 0.4, neutral: 0.3 });
    expect(result).toBeNull();
  });

  it('maps fearful as its own emotion', () => {
    const result = mapExpressionToEmotion({ ...baseExpr, fearful: 0.9 });
    expect(result?.emotion).toBe('fearful');
    expect(result?.confidence).toBe(0.9);
  });

  it('respects exactly the threshold', () => {
    const result = mapExpressionToEmotion({ ...baseExpr, happy: CONFIDENCE_THRESHOLD });
    expect(result?.emotion).toBe('happy');
  });
});

describe('EmotionDebouncer', () => {
  it('prunes samples older than the window', () => {
    const d = new EmotionDebouncer(1000, 0.6);
    d.push({ ts: 0, emotion: 'happy', confidence: 0.9 });
    d.push({ ts: 500, emotion: 'happy', confidence: 0.9 });
    d.push({ ts: 2000, emotion: 'neutral', confidence: 0.8 });
    expect(d.size()).toBe(1);
  });

  it('returns the dominant emotion when it occupies ≥60% of samples', () => {
    const d = new EmotionDebouncer(5000, 0.6);
    for (let i = 0; i < 7; i++) {
      d.push({ ts: i * 100, emotion: 'sad', confidence: 0.8 });
    }
    for (let i = 0; i < 3; i++) {
      d.push({ ts: 700 + i * 100, emotion: 'happy', confidence: 0.8 });
    }
    const resolved = d.resolve('neutral');
    expect(resolved?.emotion).toBe('sad');
  });

  it('returns null when no emotion reaches dominance', () => {
    const d = new EmotionDebouncer(5000, 0.6);
    d.push({ ts: 0, emotion: 'happy', confidence: 0.8 });
    d.push({ ts: 100, emotion: 'sad', confidence: 0.8 });
    d.push({ ts: 200, emotion: 'angry', confidence: 0.8 });
    expect(d.resolve('neutral')).toBeNull();
  });

  it('does not emit change when dominant emotion equals current', () => {
    const d = new EmotionDebouncer(5000, 0.6);
    for (let i = 0; i < 5; i++) {
      d.push({ ts: i * 100, emotion: 'happy', confidence: 0.9 });
    }
    expect(d.resolve('happy')).toBeNull();
  });

  it('computes average confidence of the winning emotion', () => {
    const d = new EmotionDebouncer(5000, 0.5);
    d.push({ ts: 0, emotion: 'happy', confidence: 0.7 });
    d.push({ ts: 100, emotion: 'happy', confidence: 0.9 });
    d.push({ ts: 200, emotion: 'happy', confidence: 0.8 });
    const resolved = d.resolve('neutral');
    expect(resolved?.confidence).toBeCloseTo(0.8, 2);
  });
});
