import { EmotionDebouncer, mapExpressionToEmotion, type FaceApiExpressions } from './mapping';
import { faceapi } from './faceApi';
import { useEmotionStore } from './store';

const TARGET_FPS = 12;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

/** Euclidean distance between two face descriptors */
function descriptorDistance(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Threshold for face identity match (lower = stricter) */
const FACE_MATCH_THRESHOLD = 0.55;
/** How often to check face identity (every N frames) */
const IDENTITY_CHECK_INTERVAL = 30; // ~every 2.5s at 12fps

export interface DetectorHandle {
  stop: () => void;
}

export interface DetectorOptions {
  /** Registered face descriptor for identity verification */
  registeredDescriptor?: number[] | null;
  /** Called when a different face is detected */
  onFaceMismatch?: () => void;
}

export function startDetector(
  video: HTMLVideoElement,
  options?: DetectorOptions
): DetectorHandle {
  const debouncer = new EmotionDebouncer();
  let stopped = false;
  let lastFrameAt = 0;
  let frameCount = 0;
  let mismatchCount = 0;
  const MISMATCH_THRESHOLD = 3; // Must detect mismatch 3 consecutive times

  useEmotionStore.getState().setDetecting(true);

  const loop = async () => {
    if (stopped) return;
    const now = performance.now();
    if (now - lastFrameAt < FRAME_INTERVAL) {
      requestAnimationFrame(() => void loop());
      return;
    }
    lastFrameAt = now;
    frameCount++;

    if (video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
      try {
        // Use withFaceDescriptor for identity checks when needed
        const needsIdentityCheck =
          options?.registeredDescriptor &&
          options?.onFaceMismatch &&
          frameCount % IDENTITY_CHECK_INTERVAL === 0;

        if (needsIdentityCheck) {
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptor();

          if (detection) {
            // Check face identity
            const distance = descriptorDistance(
              detection.descriptor,
              options!.registeredDescriptor!,
            );
            if (distance > FACE_MATCH_THRESHOLD) {
              mismatchCount++;
              if (mismatchCount >= MISMATCH_THRESHOLD) {
                options!.onFaceMismatch!();
                mismatchCount = 0;
              }
            } else {
              mismatchCount = 0;
            }

            // Also process emotion
            const expr = detection.expressions as unknown as FaceApiExpressions;
            const mapped = mapExpressionToEmotion(expr);
            if (mapped) {
              debouncer.push({ ts: now, emotion: mapped.emotion, confidence: mapped.confidence });
              const currentEmotion = useEmotionStore.getState().current;
              const resolved = debouncer.resolve(currentEmotion);
              if (resolved) {
                useEmotionStore.getState().setEmotion(resolved.emotion, resolved.confidence);
              } else {
                const store = useEmotionStore.getState();
                if (mapped.emotion === store.current) {
                  useEmotionStore.setState({ confidence: mapped.confidence });
                }
              }
            }
          }
        } else {
          // Normal expression-only detection (faster)
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceExpressions();

          if (detection) {
            const expr = detection.expressions as unknown as FaceApiExpressions;
            const mapped = mapExpressionToEmotion(expr);
            if (mapped) {
              debouncer.push({ ts: now, emotion: mapped.emotion, confidence: mapped.confidence });
              const currentEmotion = useEmotionStore.getState().current;
              const resolved = debouncer.resolve(currentEmotion);
              if (resolved) {
                useEmotionStore.getState().setEmotion(resolved.emotion, resolved.confidence);
              } else {
                const store = useEmotionStore.getState();
                if (mapped.emotion === store.current) {
                  useEmotionStore.setState({ confidence: mapped.confidence });
                }
              }
            }
          }
        }
      } catch {
        // frame fallido: continúa
      }
    }

    requestAnimationFrame(() => void loop());
  };

  loop();

  return {
    stop: () => {
      stopped = true;
      useEmotionStore.getState().setDetecting(false);
    },
  };
}
