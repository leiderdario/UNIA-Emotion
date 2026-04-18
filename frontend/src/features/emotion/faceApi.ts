import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    loaded = true;
  })();
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function isLoaded() {
  return loaded;
}

export { faceapi };
