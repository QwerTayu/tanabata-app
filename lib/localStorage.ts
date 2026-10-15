// 投稿上限・いいね上限のカウントはFirestore側が真実の情報源なので、ここでは表示名の設定だけを扱う
const HANDLE_KEY = "tanabata:handle";
const SHOW_HANDLE_KEY = "tanabata:showHandle";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getHandle(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(HANDLE_KEY) ?? "";
}

export function setHandle(handle: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(HANDLE_KEY, handle);
}

export function getShowHandle(): boolean {
  if (!isBrowser()) return true;
  const stored = window.localStorage.getItem(SHOW_HANDLE_KEY);
  return stored === null ? true : stored === "true";
}

export function setShowHandle(value: boolean): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SHOW_HANDLE_KEY, String(value));
}
