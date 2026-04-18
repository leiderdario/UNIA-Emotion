import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';
import { updateProfile, saveFaceProfile } from '../api/user';
import { Avatar } from '../components/Avatar';
import Welcome from './Welcome';

const ScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showRescan, setShowRescan] = useState(false);
  const [deletingFace, setDeletingFace] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone);
    setWhatsapp(user.whatsapp);
    setEmergencyEmail(user.emergencyEmail);
  }, [user]);

  if (!user) return null;

  // Show re-scan overlay
  if (showRescan) {
    return (
      <Welcome
        isRescan
        onComplete={() => {
          setShowRescan(false);
          // Refresh user data
          window.location.reload();
        }}
      />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateProfile({ fullName, phone, whatsapp, emergencyEmail });
      setUser(res.user);
      setMessage('Perfil actualizado');
    } catch {
      setMessage('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFace = async () => {
    setDeletingFace(true);
    try {
      // Save empty face data to clear the photo
      const res = await saveFaceProfile({
        descriptor: Array(128).fill(0),
        traits: { skinHueRotate: 0, skinSepia: 0, faceShape: 'oval', landmarks: [] },
        facePhoto: '',
      });
      setUser(res.user);
      setMessage('Foto de avatar eliminada');
    } catch {
      setMessage('No se pudo eliminar la foto');
    } finally {
      setDeletingFace(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xl animate-slideUp">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm hover:underline mb-6 inline-flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Volver al panel
        </button>

        <h1 className="text-2xl font-light emotion-text mb-6">Perfil</h1>

        {/* Avatar section */}
        <div className="glass-card-strong p-6 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <Avatar
              emotion="neutral"
              traits={null}
              facePhoto={user.facePhoto}
              emotionPhotos={user.emotionPhotos}
              size={120}
              showGlow={false}
            />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {user.hasFaceProfile
              ? 'Tu rostro se usa como avatar.'
              : 'No has escaneado tu rostro aún.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowRescan(true)}
              className="btn-primary text-sm"
              style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
            >
              <ScanIcon />
              {user.hasFaceProfile ? 'Re-escanear rostro' : 'Escanear rostro'}
            </button>
            {user.hasFaceProfile && (
              <button
                onClick={handleDeleteFace}
                disabled={deletingFace}
                className="btn-secondary text-sm"
                style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem', color: '#f87171' }}
              >
                <TrashIcon />
                Eliminar foto
              </button>
            )}
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={onSubmit} className="space-y-4 glass-card-strong p-8">
          <Labelled label="Correo (no editable)">
            <input type="email" disabled value={user.email} className="input-dark opacity-50" />
          </Labelled>
          <Labelled label="Nombre completo">
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-dark" />
          </Labelled>
          <Labelled label="Celular">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-dark" />
          </Labelled>
          <Labelled label="WhatsApp">
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input-dark" />
          </Labelled>
          <Labelled label="Correo de emergencia">
            <input type="email" value={emergencyEmail} onChange={(e) => setEmergencyEmail(e.target.value)} className="input-dark" />
          </Labelled>

          {message && (
            <p className="text-sm" style={{ color: message.includes('actualizado') || message.includes('eliminada') ? '#4ade80' : '#f87171' }}>
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="btn-secondary"
                style={{ color: '#facc15' }}
              >
                ⭐ Panel Admin
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              className="btn-secondary ml-auto"
              style={{ color: '#f87171' }}
            >
              Cerrar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
