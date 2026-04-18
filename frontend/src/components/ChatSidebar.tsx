import type { Conversation, Emotion } from '../types';
import { EMOTION_COLOR } from '../features/emotion/mapping';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function ChatSidebar({ conversations, activeId, isOpen, onToggle, onSelect, onCreate, onDelete }: Props) {
  return (
    <>
      {/* Toggle button (always visible) */}
      <button
        onClick={onToggle}
        className="btn-icon sidebar-toggle"
        title="Historial de chats"
        aria-label="Historial de chats"
      >
        <HistoryIcon />
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop animate-fadeIn"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside className={`chat-sidebar ${isOpen ? 'chat-sidebar-open' : ''}`}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Historial
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreate}
              className="btn-icon"
              style={{ width: '2rem', height: '2rem' }}
              title="Nuevo chat"
              aria-label="Nuevo chat"
            >
              <PlusIcon />
            </button>
            <button
              onClick={onToggle}
              className="btn-icon"
              style={{ width: '2rem', height: '2rem' }}
              title="Cerrar historial"
              aria-label="Cerrar historial"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="sidebar-conversations">
          {conversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="text-3xl mb-3 opacity-50">💬</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No tienes conversaciones aún.
              </p>
              <button onClick={onCreate} className="btn-primary mt-4" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                Iniciar chat
              </button>
            </div>
          )}

          {conversations.map((conv) => {
            const isActive = conv.id === activeId;
            const emotionColor = EMOTION_COLOR[(conv.lastEmotion as Emotion) ?? 'neutral'];

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`sidebar-conv-item ${isActive ? 'sidebar-conv-active' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(conv.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: emotionColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {conv.title || 'Conversación sin título'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(conv.startedAt)}
                      {conv.messageCount ? ` · ${conv.messageCount} msgs` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="sidebar-delete-btn"
                  title="Eliminar conversación"
                  aria-label="Eliminar conversación"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
