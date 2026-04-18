import { create } from 'zustand';
import type { Emotion } from '../../types';

interface EmotionStore {
  current: Emotion;
  confidence: number;
  lastChangeAt: number;
  detecting: boolean;
  setEmotion: (e: Emotion, confidence: number) => void;
  setDetecting: (d: boolean) => void;
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  current: 'neutral',
  confidence: 0,
  lastChangeAt: 0,
  detecting: false,
  setEmotion: (emotion, confidence) => {
    set({ current: emotion, confidence, lastChangeAt: Date.now() });
  },
  setDetecting: (detecting) => set({ detecting }),
}));
