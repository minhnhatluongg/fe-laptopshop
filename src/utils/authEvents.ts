// Lightweight event bus để client.ts notify UI layer khi refresh token fail
// Tránh circular dependency giữa api/client.ts ↔ context/

type AuthEventType = "session-expired";

const listeners = new Map<AuthEventType, Set<() => void>>();

export const authEvents = {
  on(event: AuthEventType, cb: () => void) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(cb);
    return () => listeners.get(event)?.delete(cb); // unsubscribe
  },
  emit(event: AuthEventType) {
    listeners.get(event)?.forEach((cb) => cb());
  },
};
