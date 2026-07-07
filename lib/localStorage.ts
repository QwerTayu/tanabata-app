const CLIENT_ID_KEY = "tanabata:clientId";
const HANDLE_KEY = "tanabata:handle";

function likesKey(roomId: string): string {
  return `tanabata:${roomId}:likes`;
}

function createdCountKey(roomId: string): string {
  return `tanabata:${roomId}:createdCount`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getClientId(): string {
  if (!isBrowser()) return "";
  let clientId = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export function getHandle(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(HANDLE_KEY) ?? "";
}

export function setHandle(handle: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(HANDLE_KEY, handle);
}

export function getCreatedCount(roomId: string): number {
  if (!isBrowser()) return 0;
  const stored = window.localStorage.getItem(createdCountKey(roomId));
  return stored ? Number(stored) || 0 : 0;
}

export function incrementCreatedCount(roomId: string): void {
  if (!isBrowser()) return;
  const next = getCreatedCount(roomId) + 1;
  window.localStorage.setItem(createdCountKey(roomId), String(next));
}

function getLikesMap(roomId: string): Record<string, number> {
  if (!isBrowser()) return {};
  const stored = window.localStorage.getItem(likesKey(roomId));
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, number>;
  } catch {
    return {};
  }
}

export function getLikeCount(roomId: string, tanzakuId: string): number {
  const likes = getLikesMap(roomId);
  return likes[tanzakuId] ?? 0;
}

export function incrementLikeCount(roomId: string, tanzakuId: string): void {
  if (!isBrowser()) return;
  const likes = getLikesMap(roomId);
  likes[tanzakuId] = (likes[tanzakuId] ?? 0) + 1;
  window.localStorage.setItem(likesKey(roomId), JSON.stringify(likes));
}
