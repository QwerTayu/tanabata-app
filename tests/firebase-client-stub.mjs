// テストで lib/firebase/client.ts の代わりに読み込ませるモジュール。db はテストから差し替える
export let db;

export function setDb(next) {
  db = next;
}
