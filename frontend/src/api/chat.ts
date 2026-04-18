import { apiRequest, API_URL, getAccessToken } from './client';
import type { ChatMessage, Conversation, Emotion } from '../types';

// ─── Conversations CRUD ─────────────────────────────────────────────

export async function fetchConversations(): Promise<{ conversations: Conversation[] }> {
  return apiRequest('/chat/conversations');
}

export async function createConversation(): Promise<Conversation> {
  return apiRequest('/chat/conversations', { method: 'POST' });
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<{ messages: ChatMessage[] }> {
  return apiRequest(`/chat/conversations/${conversationId}/messages`);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiRequest(`/chat/conversations/${conversationId}`, { method: 'DELETE' });
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  await apiRequest(`/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    body: { title },
  });
}

// ─── Legacy ─────────────────────────────────────────────────────────

export async function fetchChatHistory(): Promise<{ messages: ChatMessage[] }> {
  return apiRequest('/chat/history');
}

// ─── Streaming chat ─────────────────────────────────────────────────

interface StreamHandlers {
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  onConversationId?: (id: string) => void;
  signal?: AbortSignal;
}

export async function streamChatMessage(
  message: string,
  emotion: Emotion,
  handlers: StreamHandlers,
  conversationId?: string | null
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      emotion,
      ...(conversationId ? { conversationId } : {}),
    }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errMsg = (body as { error?: string }).error ?? errMsg;
    } catch { /* empty */ }
    handlers.onError(errMsg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice('data: '.length);
      try {
        const parsed = JSON.parse(payload) as
          | { type: 'delta'; value: string }
          | { type: 'done' }
          | { type: 'error'; error: string }
          | { type: 'conversationId'; value: string };
        if (parsed.type === 'delta') handlers.onDelta(parsed.value);
        else if (parsed.type === 'done') handlers.onDone();
        else if (parsed.type === 'error') handlers.onError(parsed.error);
        else if (parsed.type === 'conversationId') handlers.onConversationId?.(parsed.value);
      } catch {
        // ignora líneas mal formadas
      }
    }
  }
}
