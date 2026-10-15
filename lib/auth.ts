import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase/client";

// 匿名認証のuidを購読する。未サインインなら匿名サインインを行い、完了後にuidが流れてくる。
export function subscribeAuthUid(
  cb: (uid: string | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      cb(user.uid);
      return;
    }
    cb(null);
    signInAnonymously(auth).catch((e) => {
      console.error("匿名サインインに失敗しました", e);
    });
  });
}
