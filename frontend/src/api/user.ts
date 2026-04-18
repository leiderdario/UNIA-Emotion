import { apiRequest } from './client';
import type { FaceTraits, User, EmotionFacePhotos } from '../types';

export async function updateProfile(payload: {
  fullName?: string;
  phone?: string;
  whatsapp?: string;
  emergencyEmail?: string;
}): Promise<{ user: User }> {
  return apiRequest('/user/me', { method: 'PATCH', body: payload });
}

export async function saveFaceProfile(payload: {
  descriptor: number[];
  traits: FaceTraits;
  facePhoto?: string;
  emotionPhotos?: EmotionFacePhotos;
}): Promise<{ user: User; faceTraits: FaceTraits }> {
  return apiRequest('/user/me/face', { method: 'PATCH', body: payload });
}

export async function fetchFaceProfile(): Promise<{
  hasFaceProfile: boolean;
  faceTraits: FaceTraits | null;
  facePhoto: string | null;
  faceDescriptor: number[] | null;
  emotionPhotos: EmotionFacePhotos | null;
}> {
  return apiRequest('/user/me/face');
}

export async function deleteAccount(): Promise<void> {
  await apiRequest('/user/me', { method: 'DELETE' });
}
