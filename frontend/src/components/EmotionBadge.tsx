import { useEmotionStore } from '../features/emotion/store';
import { EMOTION_LABEL } from '../features/emotion/mapping';

export function EmotionBadge() {
  const { current, confidence, detecting } = useEmotionStore();
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
      <span
        className={`w-2.5 h-2.5 rounded-full emotion-bg ${detecting ? 'animate-pulse' : 'opacity-40'}`}
      />
      <span className="font-medium emotion-text">{EMOTION_LABEL[current]}</span>
      {confidence > 0 && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
