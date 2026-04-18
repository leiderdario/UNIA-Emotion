import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';
import { useEmotionStore } from '../features/emotion/store';
import { Avatar } from '../components/Avatar';
import { CameraFeed } from '../components/CameraFeed';
import { EmotionBadge } from '../components/EmotionBadge';
import { ChatWindow } from '../components/ChatWindow';
import { ChatSidebar } from '../components/ChatSidebar';
import { useCamera } from '../hooks/useCamera';
import { loadFaceApiModels } from '../features/emotion/faceApi';
import { startDetector, type DetectorHandle } from '../features/emotion/detector';
import { fetchFaceProfile } from '../api/user';
import { fetchConversations, deleteConversation as apiDeleteConversation } from '../api/chat';
import { EMOTION_LABEL } from '../features/emotion/mapping';
import type { FaceTraits, Conversation, EmotionFacePhotos } from '../types';

// SVG Icons
const CameraOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const CameraOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v9" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const emotion = useEmotionStore((s) => s.current);
  const navigate = useNavigate();
  const { videoRef, start, stop, status: camStatus, error: camError } = useCamera();
  const [traits, setTraits] = useState<FaceTraits | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [emotionPhotos, setEmotionPhotos] = useState<EmotionFacePhotos | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectorRef = useRef<DetectorHandle | null>(null);

  // Face mismatch warning
  const [faceMismatch, setFaceMismatch] = useState(false);

  // Chat history state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load face profile and models on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const fp = await fetchFaceProfile();
        if (mounted) {
          setTraits(fp.faceTraits);
          setFacePhoto(fp.facePhoto);
          setFaceDescriptor(fp.faceDescriptor);
          setEmotionPhotos(fp.emotionPhotos);
        }
      } catch {
        // sin rasgos, avatar neutro
      }
      try {
        await loadFaceApiModels();
        if (mounted) setModelsLoaded(true);
      } catch {
        if (mounted) setLoadError('No se pudieron cargar los modelos de detección.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load conversations on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchConversations();
        if (mounted) {
          setConversations(res.conversations);
          if (res.conversations.length > 0) {
            setActiveConvId(res.conversations[0].id);
          }
        }
      } catch {
        // no conversations yet
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle face mismatch callback
  const handleFaceMismatch = useCallback(() => {
    setFaceMismatch(true);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      detectorRef.current?.stop();
      detectorRef.current = null;
      stop();
      setCameraEnabled(false);
      setReady(false);
    } else {
      if (!modelsLoaded) return;
      await start();
      setCameraEnabled(true);
      setReady(true);
    }
  }, [cameraEnabled, modelsLoaded, start, stop]);

  // Start detector when camera is active
  useEffect(() => {
    if (!ready || camStatus !== 'active' || !videoRef.current) return;
    const handle = startDetector(videoRef.current, {
      registeredDescriptor: faceDescriptor,
      onFaceMismatch: handleFaceMismatch,
    });
    detectorRef.current = handle;
    return () => {
      handle.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, camStatus, faceDescriptor, handleFaceMismatch]);

  // Chat history handlers
  const handleNewConversation = useCallback(() => {
    setActiveConvId(null);
    setSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setSidebarOpen(false);
  }, []);

  const handleConversationCreated = useCallback((conv: Conversation) => {
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await apiDeleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    } catch {
      // silent
    }
  }, [activeConvId]);

  if (!user) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Chat Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelect={handleSelectConversation}
        onCreate={handleNewConversation}
        onDelete={handleDeleteConversation}
      />

      {/* Face mismatch warning */}
      {faceMismatch && (
        <div className="face-mismatch-overlay animate-fadeIn">
          <div className="glass-card-strong p-8 max-w-md text-center animate-slideUp">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: '#fbbf24' }}>
              Rostro no reconocido
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              El rostro detectado no coincide con el usuario registrado en esta cuenta.
              ¿Deseas cerrar sesión?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="btn-primary"
                style={{ background: '#f87171' }}
              >
                Cerrar sesión
              </button>
              <button
                onClick={() => setFaceMismatch(false)}
                className="btn-secondary"
              >
                Soy yo, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold emotion-text tracking-tight">UNIA</h1>
          <span style={{ color: 'var(--text-muted)' }} className="text-sm hidden sm:inline">
            Hola, {user.fullName.split(' ')[0]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <EmotionBadge />
          <button
            onClick={toggleCamera}
            disabled={!modelsLoaded}
            className={`btn-icon ${cameraEnabled ? 'active' : ''}`}
            title={cameraEnabled ? 'Desactivar cámara' : 'Activar cámara'}
            aria-label={cameraEnabled ? 'Desactivar cámara' : 'Activar cámara'}
          >
            {cameraEnabled ? <CameraOnIcon /> : <CameraOffIcon />}
          </button>
          <Link
            to="/profile"
            className="btn-icon"
            title="Perfil"
            aria-label="Ir a perfil"
          >
            <UserIcon />
          </Link>
        </div>
      </header>

      {/* Alerts */}
      <div className="px-6 pt-2">
        {loadError && (
          <div
            className="rounded-xl p-3 mb-2 text-sm animate-fadeIn"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
            }}
          >
            {loadError}
          </div>
        )}
        {camError && cameraEnabled && (
          <div
            className="rounded-xl p-3 mb-2 text-sm animate-fadeIn"
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              color: '#fbbf24',
            }}
          >
            No se pudo acceder a tu cámara. La detección emocional está desactivada.
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden grid lg:grid-cols-[1fr_1.2fr] gap-0">
        {/* Left panel — Avatar */}
        <section className="flex flex-col items-center justify-center p-8 lg:p-12">
          <div className="animate-slideUp">
            <Avatar
              emotion={emotion}
              traits={traits}
              facePhoto={facePhoto}
              emotionPhotos={emotionPhotos}
              size={300}
            />
          </div>
          <div className="mt-6 text-center animate-fadeIn">
            <p className="text-lg font-medium emotion-text">
              {EMOTION_LABEL[emotion]}
            </p>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
              {cameraEnabled
                ? 'Tu avatar refleja tu estado emocional actual'
                : 'Activa la cámara para detectar emociones'}
            </p>
          </div>
        </section>

        {/* Right panel — Chat */}
        <section className="flex flex-col border-l p-6" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title || 'Chat con UNIA'
                : 'Nuevo chat'}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>En línea</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <ChatWindow
              conversationId={activeConvId}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </section>
      </main>

      {/* Camera PiP */}
      {cameraEnabled && camStatus === 'active' && (
        <div className="camera-pip animate-fadeIn">
          <CameraFeed ref={videoRef} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Hidden video when camera enabled but not yet active */}
      {cameraEnabled && camStatus !== 'active' && (
        <div className="hidden">
          <CameraFeed ref={videoRef} />
        </div>
      )}
    </div>
  );
}
