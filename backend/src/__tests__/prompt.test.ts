import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompts/system.js';

describe('buildSystemPrompt', () => {
  it('includes base persona in all emotions', () => {
    for (const e of ['happy', 'sad', 'angry', 'disgusted', 'surprised', 'neutral'] as const) {
      const p = buildSystemPrompt(e);
      expect(p).toContain('Eres UNIA');
      expect(p).toContain('Línea 106');
    }
  });

  it('differs between emotions (injects emotion context)', () => {
    const happy = buildSystemPrompt('happy');
    const sad = buildSystemPrompt('sad');
    expect(happy).not.toBe(sad);
    expect(sad).toContain('triste');
    expect(happy).toContain('alegre');
  });

  it('never contains phrases that break tone (RF-18)', () => {
    const p = buildSystemPrompt('sad');
    expect(p).toContain('Nunca digas "detecto que estás..."');
  });
});
