import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store';
import { fetchAdminUsers, fetchAdminStats, deleteUser } from '../api/admin';
import type { AdminUser } from '../types';

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function AdminPanel() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<{ userCount: number; conversationCount: number; messageCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    (async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetchAdminUsers(),
          fetchAdminStats(),
        ]);
        setUsers(usersRes.users);
        setStats(statsRes);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const handleDelete = async (userId: string) => {
    if (confirmDelete !== userId) {
      setConfirmDelete(userId);
      return;
    }
    setDeletingId(userId);
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (stats) {
        setStats({ ...stats, userCount: stats.userCount - 1 });
      }
    } catch {
      // Handle error
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-full p-6">
      <div className="max-w-5xl mx-auto animate-slideUp">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm hover:underline mb-6 inline-flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Volver al panel
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="emotion-text">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-2xl font-light emotion-text">Panel de Administración</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Gestión de usuarios de UNIA-Emotion
            </p>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass-card-strong p-5 text-center">
              <p className="text-3xl font-light emotion-text">{stats.userCount}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Usuarios</p>
            </div>
            <div className="glass-card-strong p-5 text-center">
              <p className="text-3xl font-light emotion-text">{stats.conversationCount}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Conversaciones</p>
            </div>
            <div className="glass-card-strong p-5 text-center">
              <p className="text-3xl font-light emotion-text">{stats.messageCount}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mensajes</p>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="glass-card-strong overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Usuarios registrados
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 emotion-border" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <p style={{ color: 'var(--text-muted)' }}>No hay usuarios registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Nombre</th>
                    <th className="text-left p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Email</th>
                    <th className="text-center p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Rol</th>
                    <th className="text-center p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Rostro</th>
                    <th className="text-center p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Chats</th>
                    <th className="text-center p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Registro</th>
                    <th className="text-center p-3 font-medium" style={{ color: 'var(--text-muted)' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="admin-row"
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                      <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          {u.facePhoto ? (
                            <img src={u.facePhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--bg-card)' }}>
                              {u.fullName[0]}
                            </div>
                          )}
                          {u.fullName}
                        </div>
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td className="p-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: u.role === 'admin' ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.06)',
                            color: u.role === 'admin' ? '#facc15' : 'var(--text-muted)',
                          }}
                        >
                          {u.role === 'admin' ? '⭐ Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span style={{ color: u.hasFaceProfile ? '#4ade80' : 'var(--text-muted)' }}>
                          {u.hasFaceProfile ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="p-3 text-center" style={{ color: 'var(--text-secondary)' }}>
                        {u.conversationCount}
                      </td>
                      <td className="p-3 text-center" style={{ color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="p-3 text-center">
                        {u.role === 'admin' ? (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                            className="admin-delete-btn"
                            title={confirmDelete === u.id ? 'Click otra vez para confirmar' : 'Eliminar usuario'}
                            style={{
                              color: confirmDelete === u.id ? '#fff' : '#f87171',
                              background: confirmDelete === u.id ? 'rgba(239,68,68,0.8)' : 'transparent',
                            }}
                          >
                            {deletingId === u.id ? (
                              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : confirmDelete === u.id ? (
                              '¿Seguro?'
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
