import type { FaceTraits } from '../../types';

interface Landmark {
  x: number;
  y: number;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function sampleSkinHSL(video: HTMLVideoElement, box: FaceBox): [number, number, number] {
  const canvas = document.createElement('canvas');
  // muestreo: franja central horizontal del rostro (mejillas)
  const sampleW = Math.max(8, Math.floor(box.width * 0.5));
  const sampleH = Math.max(8, Math.floor(box.height * 0.2));
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const sx = box.x + box.width * 0.25;
  const sy = box.y + box.height * 0.45;
  ctx.drawImage(video, sx, sy, sampleW, sampleH, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  return rgbToHsl(r / n, g / n, b / n);
}

function shapeFromBox(box: FaceBox): FaceTraits['faceShape'] {
  const ratio = box.height / box.width;
  if (ratio > 1.25) return 'oval';
  if (ratio < 0.95) return 'square';
  return 'round';
}

/**
 * Convierte el HSL de la piel en filtros CSS aplicables sobre un SVG base (piel neutra ≈ hsl(30, 50%, 70%)).
 * hueRotate = delta de matiz respecto al baseline; sepia ayuda a modular saturación percibida.
 */
function skinToFilters(hue: number, saturation: number): { hueRotate: number; sepia: number } {
  const BASELINE_HUE = 30;
  const hueRotate = ((hue - BASELINE_HUE + 540) % 360) - 180;
  const sepia = Math.max(0, Math.min(60, saturation - 20));
  return { hueRotate: Math.round(hueRotate), sepia: Math.round(sepia) };
}

export interface RawDetection {
  box: FaceBox;
  landmarks: Landmark[];
  descriptor: Float32Array | number[];
}

export function extractTraits(video: HTMLVideoElement, detection: RawDetection): FaceTraits {
  const [hue, saturation] = sampleSkinHSL(video, detection.box);
  const { hueRotate, sepia } = skinToFilters(hue, saturation);
  return {
    skinHueRotate: hueRotate,
    skinSepia: sepia,
    faceShape: shapeFromBox(detection.box),
    landmarks: detection.landmarks,
  };
}

export function descriptorToArray(descriptor: Float32Array | number[]): number[] {
  return Array.from(descriptor);
}
