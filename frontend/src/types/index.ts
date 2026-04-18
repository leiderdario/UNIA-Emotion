/** Per-emotion face photos captured during the scanner */
export type EmotionFacePhotos = Partial<Record<Emotion, string>>;

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  emergencyEmail: string;
  role: 'user' | 'admin';
  hasFaceProfile: boolean;
  facePhoto?: string | null;
  emotionPhotos?: EmotionFacePhotos | null;
}

export interface AdminUser extends User {
  createdAt: string;
  conversationCount: number;
}

export interface FaceTraits {
  skinHueRotate: number;
  skinSepia: number;
  faceShape: 'oval' | 'round' | 'square';
  landmarks: Array<{ x: number; y: number }>;
}

export type Emotion = 'happy' | 'sad' | 'angry' | 'disgusted' | 'surprised' | 'fearful' | 'neutral';

export interface EmotionState {
  current: Emotion;
  confidence: number;
  lastChangeAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotionAtTime: Emotion;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  startedAt: string;
  lastEmotion?: Emotion;
  messageCount?: number;
}
