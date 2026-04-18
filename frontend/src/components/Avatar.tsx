import { useEffect, useRef, useState } from 'react';
import type { Emotion, FaceTraits, EmotionFacePhotos } from '../types';

interface Props {
  emotion: Emotion;
  traits: FaceTraits | null;
  facePhoto?: string | null;
  emotionPhotos?: EmotionFacePhotos | null;
  size?: number;
  className?: string;
  showGlow?: boolean;
}

const GIF_SRC: Record<Emotion, string> = {
  happy: '/avatars/happy.gif',
  sad: '/avatars/sad.gif',
  angry: '/avatars/angry.gif',
  disgusted: '/avatars/disgusted.gif',
  surprised: '/avatars/surprised.gif',
  fearful: '/avatars/fearful.gif',
  neutral: '/avatars/neutral.gif',
};

/**
 * Emotion-based CSS filters applied to the user's face photo.
 */
const EMOTION_FACE_STYLE: Record<Emotion, React.CSSProperties> = {
  neutral: { filter: 'none' },
  happy: { filter: 'brightness(1.08) saturate(1.15) contrast(1.02)' },
  sad: { filter: 'brightness(0.88) saturate(0.65) contrast(0.95)' },
  angry: { filter: 'brightness(0.92) saturate(1.3) contrast(1.1) hue-rotate(-3deg)' },
  disgusted: { filter: 'brightness(0.88) saturate(0.8) hue-rotate(8deg)' },
  surprised: { filter: 'brightness(1.12) saturate(1.1) contrast(1.05)' },
  fearful: { filter: 'brightness(0.82) saturate(0.55) contrast(0.9)' },
};

/**
 * Avatar Component — Three display modes:
 *
 * 1. **With emotionPhotos**: User's face changes to match the detected emotion
 *    (e.g., shows their happy face when happy is detected)
 *
 * 2. **With facePhoto only**: User's face with CSS emotion filters
 *
 * 3. **Without any photo (fallback)**: Shows the original GIF/PNG avatar
 */
export function Avatar({
  emotion,
  facePhoto,
  emotionPhotos,
  size = 220,
  className = '',
  showGlow = true,
}: Props) {
  const [gifLoaded, setGifLoaded] = useState(false);
  const gifRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setGifLoaded(false);
  }, [emotion]);

  // Determine which face photo to show based on emotion
  const activeFacePhoto = emotionPhotos?.[emotion] ?? facePhoto;
  const hasFace = Boolean(activeFacePhoto);

  // ── Mode A: User has a face photo → Show their face as main avatar ──
  if (hasFace && activeFacePhoto) {
    return (
      <div className={`avatar-container animate-float ${className}`}>
        {showGlow && <div className="avatar-glow-bg" />}
        {showGlow && <div className="avatar-pulse-ring" />}

        {/* Emotion GIF as animated ring/border (behind the face) */}
        <div
          className="avatar-emotion-ring"
          style={{ width: size + 24, height: size + 24 }}
        >
          <img
            ref={gifRef}
            src={GIF_SRC[emotion]}
            alt=""
            className="avatar-ring-gif"
            onLoad={() => setGifLoaded(true)}
            style={{ opacity: gifLoaded ? 0.35 : 0 }}
            draggable={false}
            aria-hidden="true"
          />
        </div>

        {/* User's real face — the main avatar */}
        <div
          className="avatar-face-frame emotion-border"
          style={{
            width: size,
            height: size,
            borderWidth: 3,
          }}
        >
          <img
            src={activeFacePhoto}
            alt="Tu avatar"
            className="avatar-face-photo"
            style={{
              ...EMOTION_FACE_STYLE[emotion],
              transition: 'filter 1s ease',
            }}
            draggable={false}
          />
        </div>

        {/* Small emotion GIF badge in corner */}
        <div
          className="avatar-emotion-badge"
          style={{ width: '150px', height: '150px', bottom: '-30px', right: '-70px' }}
        >
          <img
            src={GIF_SRC[emotion]}
            alt={`Emoción: ${emotion}`}
            className="avatar-badge-gif"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>
      </div>
    );
  }

  // ── Mode B: No face photo → Show emotion GIF directly ──────────────
  return (
    <div className={`avatar-container animate-float ${className}`}>
      {showGlow && <div className="avatar-glow-bg" />}
      {showGlow && <div className="avatar-pulse-ring" />}
      <div
        className="rounded-full overflow-hidden emotion-border"
        style={{
          width: size,
          height: size,
          borderWidth: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <img
          src={GIF_SRC[emotion]}
          alt={`Avatar ${emotion}`}
          width={size - 8}
          height={size - 8}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            transition: 'opacity 0.5s ease',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
