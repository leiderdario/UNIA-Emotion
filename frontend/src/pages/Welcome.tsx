import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';
import { useCamera } from '../hooks/useCamera';
import { CameraFeed } from '../components/CameraFeed';
import { Avatar } from '../components/Avatar';
import { loadFaceApiModels, faceapi } from '../features/emotion/faceApi';
import { descriptorToArray, extractTraits } from '../features/avatar/traits';
import { fetchFaceProfile, saveFaceProfile } from '../api/user';
import { EMOTION_LABEL, EMOTION_COLOR } from '../features/emotion/mapping';
import type { FaceTraits, Emotion, EmotionFacePhotos } from '../types';

type Step =
  | 'consent'
  | 'loading-models'
  | 'positioning'
  | 'scanning-neutral' // Capture neutral + descriptor
  | 'emotion-capture'  // Guide user through each emotion
  | 'preview'
  | 'error'
  | 'skipped';

const SCAN_DURATION_MS = 6000;

type FaceGuideStatus = 'no-face' | 'too-far' | 'too-close' | 'off-center' | 'good';

interface FaceGuideResult {
  status: FaceGuideStatus;
  message: string;
}

/** Emotions to capture (order matters — neutral is handled separately first) */
const EMOTIONS_TO_CAPTURE: Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'fearful'];

/** Emoji for each emotion instruction */
const EMOTION_EMOJI: Record<Emotion, string> = {
  neutral: '😐',
  happy: '😄',
  sad: '😢',
  angry: '😠',
  surprised: '😮',
  fearful: '😨',
  disgusted: '🤢',
};

/** Instructions for each emotion */
const EMOTION_INSTRUCTION: Record<Emotion, string> = {
  neutral: 'Mantén un rostro relajado y natural',
  happy: '¡Sonríe ampliamente!',
  sad: 'Pon una cara triste',
  angry: 'Pon cara de enojado',
  surprised: '¡Pon cara de sorpresa con la boca abierta!',
  fearful: 'Pon cara de miedo o susto',
  disgusted: 'Pon cara de asco',
};

/** Landmark groups for visualization */
const LANDMARK_GROUPS = {
  jawline: { start: 0, end: 16, color: 'rgba(255,255,255,0.4)' },
  leftEyebrow: { start: 17, end: 21, color: 'rgba(74,222,128,0.7)' },
  rightEyebrow: { start: 22, end: 26, color: 'rgba(74,222,128,0.7)' },
  noseBridge: { start: 27, end: 30, color: 'rgba(96,165,250,0.7)' },
  noseBottom: { start: 30, end: 35, color: 'rgba(96,165,250,0.7)' },
  leftEye: { start: 36, end: 41, color: 'rgba(250,204,21,0.8)', closed: true },
  rightEye: { start: 42, end: 47, color: 'rgba(250,204,21,0.8)', closed: true },
  outerLips: { start: 48, end: 59, color: 'rgba(248,113,113,0.7)', closed: true },
  innerLips: { start: 60, end: 67, color: 'rgba(248,113,113,0.5)', closed: true },
} as const;

function evaluateFacePosition(
  box: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number,
): FaceGuideResult {
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const videoCenterX = videoWidth / 2;
  const videoCenterY = videoHeight / 2;
  const faceArea = box.width * box.height;
  const videoArea = videoWidth * videoHeight;
  const faceRatio = faceArea / videoArea;

  if (faceRatio < 0.02) return { status: 'too-far', message: 'Acércate más a la cámara' };
  if (faceRatio > 0.45) return { status: 'too-close', message: 'Aléjate un poco de la cámara' };
  const dx = Math.abs(faceCenterX - videoCenterX) / videoWidth;
  const dy = Math.abs(faceCenterY - videoCenterY) / videoHeight;
  if (dx > 0.25 || dy > 0.25) return { status: 'off-center', message: 'Centra tu rostro en el óvalo' };
  return { status: 'good', message: '¡Perfecto! Detectando rasgos faciales...' };
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }>,
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
) {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const [, group] of Object.entries(LANDMARK_GROUPS)) {
    const points = landmarks.slice(group.start, group.end + 1);
    if (points.length === 0) continue;
    ctx.strokeStyle = group.color;
    ctx.fillStyle = group.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * scaleX, points[i].y * scaleY);
    if ('closed' in group && group.closed) ctx.closePath();
    ctx.stroke();
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x * scaleX, pt.y * scaleY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pupil centers
  for (const [s, e] of [[36, 42], [42, 48]] as const) {
    const pts = landmarks.slice(s, e);
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    ctx.beginPath();
    ctx.arc(cx * scaleX, cy * scaleY, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx * scaleX, cy * scaleY, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74,222,128,1)';
    ctx.fill();
  }
}

function captureFacePhoto(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
): string {
  const canvas = document.createElement('canvas');
  const photoSize = 256;
  canvas.width = photoSize;
  canvas.height = photoSize;
  const ctx = canvas.getContext('2d')!;
  const padding = 0.35;
  const x = Math.max(0, box.x - box.width * padding);
  const y = Math.max(0, box.y - box.height * padding);
  const w = Math.min(video.videoWidth - x, box.width * (1 + padding * 2));
  const h = Math.min(video.videoHeight - y, box.height * (1 + padding * 2));
  ctx.beginPath();
  ctx.arc(photoSize / 2, photoSize / 2, photoSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(video, x, y, w, h, 0, 0, photoSize, photoSize);
  return canvas.toDataURL('image/jpeg', 0.85);
}

interface WelcomeProps {
  isRescan?: boolean;
  onComplete?: () => void;
}

export default function Welcome({ isRescan = false, onComplete }: WelcomeProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const { videoRef, start, stop, status: camStatus, error: camError } = useCamera();
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<Step>('consent');
  const [progress, setProgress] = useState(0);
  const [traits, setTraits] = useState<FaceTraits | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [emotionPhotos, setEmotionPhotos] = useState<EmotionFacePhotos>({});
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guideStatus, setGuideStatus] = useState<FaceGuideResult>({ status: 'no-face', message: 'Buscando tu rostro...' });
  const [goodFrames, setGoodFrames] = useState(0);
  const GOOD_FRAMES_TO_START = 30;

  // Emotion capture state
  const [currentEmotionIdx, setCurrentEmotionIdx] = useState(0);
  const [emotionDetected, setEmotionDetected] = useState(false);
  const [emotionProgress, setEmotionProgress] = useState(0);
  const currentTargetEmotion = EMOTIONS_TO_CAPTURE[currentEmotionIdx] || 'happy';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || isRescan) return;
      if (user.hasFaceProfile) {
        const fp = await fetchFaceProfile().catch(() => null);
        if (!cancelled && fp?.faceTraits) {
          navigate('/dashboard', { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate, isRescan]);

  const beginScan = useCallback(async () => {
    setErrorMsg(null);
    setStep('loading-models');
    try {
      await loadFaceApiModels();
    } catch {
      setErrorMsg('No se pudieron cargar los modelos. Recarga la página.');
      setStep('error');
      return;
    }
    await start();
    setStep('positioning');
    setGoodFrames(0);
  }, [start]);

  // ── Positioning phase ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'positioning' || camStatus !== 'active' || !videoRef.current) return;
    const video = videoRef.current;
    const abort = new AbortController();
    let raf = 0;

    const tick = async () => {
      if (abort.signal.aborted) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
            .withFaceLandmarks();
          if (detection) {
            const box = detection.detection.box;
            const result = evaluateFacePosition(
              { x: box.x, y: box.y, width: box.width, height: box.height },
              video.videoWidth, video.videoHeight,
            );
            setGuideStatus(result);
            const lc = landmarkCanvasRef.current;
            if (lc) {
              const lcCtx = lc.getContext('2d');
              if (lcCtx) drawLandmarks(lcCtx, detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y })), lc.width, lc.height, video.videoWidth, video.videoHeight);
            }
            if (result.status === 'good') {
              setGoodFrames((prev) => {
                const next = prev + 1;
                if (next >= GOOD_FRAMES_TO_START) setStep('scanning-neutral');
                return next;
              });
            } else {
              setGoodFrames(0);
            }
          } else {
            setGuideStatus({ status: 'no-face', message: 'Buscando tu rostro...' });
            setGoodFrames(0);
            const lc = landmarkCanvasRef.current;
            if (lc) lc.getContext('2d')?.clearRect(0, 0, lc.width, lc.height);
          }
        } catch { /* ignore */ }
      }
      raf = requestAnimationFrame(() => void tick());
    };
    tick();
    return () => { abort.abort(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, camStatus]);

  // ── Neutral scan — captures face photo + traits + descriptor ──────
  useEffect(() => {
    if (step !== 'scanning-neutral' || camStatus !== 'active' || !videoRef.current) return;
    const video = videoRef.current;
    const abort = new AbortController();
    let raf = 0;
    const started = performance.now();
    const samples: Array<{ traits: FaceTraits; descriptor: number[]; box: { x: number; y: number; width: number; height: number } }> = [];

    const tick = async () => {
      if (abort.signal.aborted) return;
      const elapsed = performance.now() - started;
      setProgress(Math.min(1, elapsed / SCAN_DURATION_MS));
      if (video.readyState >= 2) {
        try {
          const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })).withFaceLandmarks().withFaceDescriptor();
          if (detection) {
            const box = detection.detection.box;
            const landmarks = detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
            const lc = landmarkCanvasRef.current;
            if (lc) {
              const lcCtx = lc.getContext('2d');
              if (lcCtx) drawLandmarks(lcCtx, landmarks, lc.width, lc.height, video.videoWidth, video.videoHeight);
            }
            const t = extractTraits(video, { box: { x: box.x, y: box.y, width: box.width, height: box.height }, landmarks, descriptor: detection.descriptor });
            samples.push({ traits: t, descriptor: descriptorToArray(detection.descriptor), box: { x: box.x, y: box.y, width: box.width, height: box.height } });
          }
        } catch (e) {
          console.error("Detection error during scan:", e);
          setErrorMsg('Error interno en el escaneo: ' + (e instanceof Error ? e.message : String(e)));
          setStep('error');
          return;
        }
      }
      // Si ya pasó el tiempo ideal de escaneo (para la UI) y tenemos al menos una muestra
      if (elapsed >= SCAN_DURATION_MS && samples.length > 0) {
        const last = samples[samples.length - 1];
        setTraits(last.traits);
        setDescriptor(last.descriptor);
        const photo = captureFacePhoto(video, last.box);
        setFacePhoto(photo);
        setEmotionPhotos((prev) => ({ ...prev, neutral: photo }));
        // Move to emotion capture
        setCurrentEmotionIdx(0);
        setEmotionDetected(false);
        setStep('emotion-capture');
        return;
      }
      
      // Si pasaron 20 segundos y aún no hay muestras, entonces sí fallamos
      if (elapsed >= 20000 && samples.length === 0) {
        setErrorMsg('El escaneo tardó demasiado y no se detectó el rostro con claridad. Inténtalo de nuevo en un lugar mejor iluminado.');
        setStep('error');
        return;
      }
      raf = requestAnimationFrame(() => void tick());
    };
    tick();
    return () => { abort.abort(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, camStatus]);

  // ── Emotion capture — detect each emotion and capture photo ────────
  useEffect(() => {
    if (step !== 'emotion-capture' || camStatus !== 'active' || !videoRef.current) return;
    const video = videoRef.current;
    const abort = new AbortController();
    let raf = 0;
    let detectionCount = 0;
    const DETECTIONS_TO_CAPTURE = 5; // Must detect emotion 5 times to confirm

    const tick = async () => {
      if (abort.signal.aborted) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detection) {
            const lc = landmarkCanvasRef.current;
            if (lc) {
              const lcCtx = lc.getContext('2d');
              if (lcCtx) drawLandmarks(lcCtx, detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y })), lc.width, lc.height, video.videoWidth, video.videoHeight);
            }

            const expressions = detection.expressions as unknown as Record<string, number>;
            const targetScore = expressions[currentTargetEmotion] || 0;

            // Check if the target emotion is detected with sufficient confidence
            if (targetScore > 0.4) {
              detectionCount++;
              setEmotionProgress(detectionCount / DETECTIONS_TO_CAPTURE);

              if (detectionCount >= DETECTIONS_TO_CAPTURE) {
                // Capture the photo for this emotion
                const box = detection.detection.box;
                const photo = captureFacePhoto(video, { x: box.x, y: box.y, width: box.width, height: box.height });
                setEmotionPhotos((prev) => ({ ...prev, [currentTargetEmotion]: photo }));
                setEmotionDetected(true);

                // Wait a moment, then advance
                setTimeout(() => {
                  if (abort.signal.aborted) return;
                  const nextIdx = currentEmotionIdx + 1;
                  if (nextIdx < EMOTIONS_TO_CAPTURE.length) {
                    setCurrentEmotionIdx(nextIdx);
                    setEmotionDetected(false);
                    setEmotionProgress(0);
                    detectionCount = 0;
                  } else {
                    // All done! Show preview
                    setStep('preview');
                    stop();
                    // Save everything
                    if (descriptor && traits) {
                      saveFaceProfile({
                        descriptor,
                        traits,
                        facePhoto: facePhoto!,
                        emotionPhotos: { ...emotionPhotos, [currentTargetEmotion]: photo },
                      })
                        .then((res) => setUser(res.user))
                        .catch(() => setErrorMsg('Tu avatar se generó, pero no pudimos guardarlo.'));
                    }
                  }
                }, 800);
                return; // Stop the loop during the transition
              }
            } else {
              // Reset if emotion is not sustained
              if (detectionCount > 0) detectionCount = Math.max(0, detectionCount - 1);
              setEmotionProgress(detectionCount / DETECTIONS_TO_CAPTURE);
            }
          }
        } catch { /* ignore */ }
      }
      raf = requestAnimationFrame(() => void tick());
    };
    tick();
    return () => { abort.abort(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, camStatus, currentEmotionIdx, currentTargetEmotion]);

  const skip = () => {
    stop();
    if (isRescan) {
      onComplete?.();
    } else {
      // Save what we have so far
      if (descriptor && traits && facePhoto) {
        saveFaceProfile({ descriptor, traits, facePhoto, emotionPhotos })
          .then((res) => setUser(res.user))
          .catch(() => {});
      }
      navigate('/dashboard', { replace: true });
    }
  };

  const finish = () => {
    if (isRescan) {
      onComplete?.();
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  if (!user) return null;

  const ovalClass =
    guideStatus.status === 'good'
      ? 'scan-oval detected'
      : guideStatus.status === 'no-face'
        ? 'scan-oval'
        : 'scan-oval warning';

  const emotionCapturedCount = Object.keys(emotionPhotos).length;
  const totalEmotions = EMOTIONS_TO_CAPTURE.length + 1; // +1 for neutral

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-2xl animate-slideUp">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light emotion-text mb-2">
            {isRescan ? 'Re-escaneo facial' : `¡Hola, ${user.fullName.split(' ')[0]}!`}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {step === 'emotion-capture'
              ? `Capturando emociones (${emotionCapturedCount}/${totalEmotions})`
              : isRescan
                ? 'Vamos a actualizar la foto de tu avatar.'
                : 'Para personalizar tu avatar necesitamos un breve escaneo facial.'}
          </p>
        </div>

        {/* ── Consent ─────────────────────────────────────────────── */}
        {step === 'consent' && (
          <div className="glass-card-strong p-8 space-y-5 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'var(--emotion-color-soft)' }}>
                🔒
              </div>
              <div className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>Aviso de privacidad:</strong> Activaremos tu cámara durante el escaneo. Los frames se procesan localmente.</p>
                <p>El escáner capturará tu rostro en <strong style={{ color: 'var(--text-primary)' }}>cada emoción</strong> (neutral, feliz, triste, enojado, sorprendido, con miedo) para que tu avatar refleje expresiones reales.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={beginScan} className="btn-primary">{isRescan ? 'Iniciar re-escaneo' : 'Acepto, iniciar escaneo'}</button>
              <button onClick={skip} className="btn-secondary ml-auto">{isRescan ? 'Cancelar' : 'Saltar por ahora'}</button>
            </div>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {step === 'loading-models' && (
          <div className="glass-card-strong p-12 text-center animate-fadeIn">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4 emotion-border" />
            <p style={{ color: 'var(--text-secondary)' }}>Cargando modelos de detección facial...</p>
          </div>
        )}

        {/* ── Camera Phases ─────────────────────────────────────────── */}
        {(step === 'positioning' || step === 'scanning-neutral' || step === 'emotion-capture') && (
          <div className="glass-card-strong p-6 animate-fadeIn">
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-5 relative">
              <CameraFeed ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={landmarkCanvasRef} width={640} height={480} className="landmark-overlay" />

              {/* Positioning Overlays */}
              {step === 'positioning' && (
                <div className="scan-overlay">
                  <div className={ovalClass}>
                    <div className="scan-instruction">{guideStatus.message}</div>
                  </div>
                </div>
              )}

              {/* Scanning Overlays */}
              {step === 'scanning-neutral' && (
                <div className="scan-badge animate-fadeIn"><span className="scan-badge-dot" />Escaneando 68 puntos faciales</div>
              )}

              {/* Emotion Overlays */}
              {step === 'emotion-capture' && (
                <>
                  <div className="emotion-capture-overlay">
                    <div className="emotion-capture-card" style={{ borderColor: emotionDetected ? '#4ade80' : EMOTION_COLOR[currentTargetEmotion] }}>
                      <span className="text-3xl">{EMOTION_EMOJI[currentTargetEmotion]}</span>
                      <p className="text-sm font-medium" style={{ color: emotionDetected ? '#4ade80' : '#fff' }}>
                        {emotionDetected ? '¡Capturado!' : EMOTION_INSTRUCTION[currentTargetEmotion]}
                      </p>
                    </div>
                  </div>

                  {emotionDetected && (
                    <div className="scan-badge animate-fadeIn" style={{ background: 'rgba(74,222,128,0.3)', color: '#4ade80' }}>
                      <span className="scan-badge-dot" />✓ {EMOTION_LABEL[currentTargetEmotion]} capturada
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Content */}
            {step === 'positioning' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{ width: `${Math.round((goodFrames / GOOD_FRAMES_TO_START) * 100)}%`, background: guideStatus.status === 'good' ? '#4ade80' : guideStatus.status === 'no-face' ? 'var(--text-muted)' : '#facc15' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{guideStatus.status === 'good' ? 'Preparando...' : 'Posiciónate'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="glass-card p-2 rounded-lg"><span className="text-lg">👁️</span><p className="mt-1">Pupilas</p></div>
                  <div className="glass-card p-2 rounded-lg"><span className="text-lg">👄</span><p className="mt-1">Boca</p></div>
                  <div className="glass-card p-2 rounded-lg"><span className="text-lg">👃</span><p className="mt-1">Nariz</p></div>
                  <div className="glass-card p-2 rounded-lg"><span className="text-lg">💡</span><p className="mt-1">Luz</p></div>
                </div>
              </div>
            )}

            {step === 'scanning-neutral' && (
              <div className="space-y-2">
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  😐 Capturando rostro neutral... ({Math.round(progress * 100)}%)
                </p>
              </div>
            )}

            {step === 'emotion-capture' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{ width: `${Math.round(emotionProgress * 100)}%`, background: emotionDetected ? '#4ade80' : EMOTION_COLOR[currentTargetEmotion], transition: 'width 0.2s ease' }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: EMOTION_COLOR[currentTargetEmotion] }}>
                    {EMOTION_LABEL[currentTargetEmotion]}
                  </span>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <div className="emotion-chip captured">
                    <span>😐</span>
                    <span className="text-xs">✓</span>
                  </div>
                  {EMOTIONS_TO_CAPTURE.map((em, idx) => {
                    const isCaptured = Boolean(emotionPhotos[em]);
                    const isCurrent = idx === currentEmotionIdx;
                    return (
                      <div
                        key={em}
                        className={`emotion-chip ${isCaptured ? 'captured' : ''} ${isCurrent ? 'current' : ''}`}
                        style={isCurrent ? { borderColor: EMOTION_COLOR[em] } : undefined}
                      >
                        <span>{EMOTION_EMOJI[em]}</span>
                        {isCaptured && <span className="text-xs">✓</span>}
                      </div>
                    );
                  })}
                </div>

                <button onClick={skip} className="btn-secondary text-xs w-full" style={{ padding: '0.4rem' }}>
                  Saltar emociones restantes →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Preview ─────────────────────────────────────────────── */}
        {step === 'preview' && traits && (
          <div className="glass-card-strong p-8 text-center animate-slideUp">
            <h2 className="text-xl font-medium mb-6 emotion-text">
              {isRescan ? '¡Rostro actualizado!' : '¡Tu avatar está listo!'}
            </h2>
            <div className="flex justify-center mb-4">
              <Avatar emotion="neutral" traits={traits} facePhoto={facePhoto} emotionPhotos={emotionPhotos} size={160} showGlow={false} />
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Emociones capturadas: {Object.keys(emotionPhotos).length}/{totalEmotions}
            </p>
            {/* Preview captured emotions */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {Object.entries(emotionPhotos).map(([em, photo]) => (
                <div key={em} className="text-center">
                  <img src={photo} alt={em} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: EMOTION_COLOR[em as Emotion] }} />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{EMOTION_EMOJI[em as Emotion]}</p>
                </div>
              ))}
            </div>
            <button onClick={finish} className="btn-primary">{isRescan ? 'Listo' : 'Continuar al panel'}</button>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="glass-card-strong p-8 text-center space-y-4 animate-fadeIn">
            <div className="text-4xl mb-2">😅</div>
            <p style={{ color: '#f87171' }}>{errorMsg ?? camError ?? 'Algo salió mal.'}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { setStep('consent'); setErrorMsg(null); setGoodFrames(0); }} className="btn-primary">Reintentar</button>
              <button onClick={skip} className="btn-secondary">{isRescan ? 'Cancelar' : 'Saltar'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
