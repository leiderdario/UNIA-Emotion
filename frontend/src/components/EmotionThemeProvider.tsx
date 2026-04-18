import { useEffect } from 'react';
import { useEmotionStore } from '../features/emotion/store';
import { EMOTION_COLOR } from '../features/emotion/mapping';

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

export function EmotionThemeProvider({ children }: { children: React.ReactNode }) {
  const emotion = useEmotionStore((s) => s.current);

  useEffect(() => {
    const color = EMOTION_COLOR[emotion];
    const [r, g, b] = hexToRgb(color);
    const soft = `rgba(${r}, ${g}, ${b}, 0.1)`;
    const medium = `rgba(${r}, ${g}, ${b}, 0.25)`;
    document.documentElement.style.setProperty('--emotion-color', color);
    document.documentElement.style.setProperty('--emotion-color-soft', soft);
    document.documentElement.style.setProperty('--emotion-color-medium', medium);
    document.documentElement.style.setProperty('--meta-emotion-color', color);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }, [emotion]);

  return (
    <>
      {/* Dynamic gradient background that reacts to emotion */}
      <div className="emotion-bg-gradient" aria-hidden="true" />
      {children}
    </>
  );
}
