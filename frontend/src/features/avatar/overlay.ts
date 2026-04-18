import type { CSSProperties } from 'react';
import type { FaceTraits } from '../../types';

export function traitsToStyle(traits: FaceTraits | null): CSSProperties {
  if (!traits) return {};
  const { skinHueRotate, skinSepia, faceShape } = traits;
  const scaleX = faceShape === 'square' ? 1.05 : faceShape === 'oval' ? 0.95 : 1;
  const scaleY = faceShape === 'oval' ? 1.05 : faceShape === 'square' ? 0.95 : 1;
  return {
    filter: `hue-rotate(${skinHueRotate}deg) sepia(${skinSepia}%) saturate(1.1)`,
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'center center',
    transition: 'filter 400ms ease, transform 400ms ease',
  };
}
