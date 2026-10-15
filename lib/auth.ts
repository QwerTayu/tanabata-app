import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase/client";

// 匿名サインインに失敗したときに画面へ出す情報。codeはFirebaseのエラーコードそのもの
export interface AuthSignInError {
  title: string;
  detail: string;
  code: string;
}

// Firebaseのエラーコードから、原因の見当がつく説明に変換する
export function describeSignInError(e: unknown): AuthSignInError {
  const code = e instanceof FirebaseError ? e.code : "unknown";

  if (
    code === "auth/admin-restricted-operation" ||
    code === "auth/operation-not-allowed"
  ) {
    return {
      title: "匿名サインインが有効になっていません",
      detail:
        "Firebase Console の Authentication で「匿名」プロバイダが無効になっています。ルームの作成者に伝えてください。",
      code,
    };
  }
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") {
    return {
      title: "アクセスが集中しています",
      detail:
        "同じネットワークからのサインインが上限(1時間あたり100件)に達した可能性があります。時間をおくか、モバイル回線など別のネットワークで試してください。",
      code,
    };
  }
  if (code === "auth/network-request-failed") {
    return {
      title: "ネットワークに接続できません",
      detail:
        "通信状態を確認してください。学内ネットワークなどで Google の認証サーバーへの通信がブロックされている場合もあります。",
      code,
    };
  }
  if (
    code === "auth/invalid-api-key" ||
    code.startsWith("auth/api-key-not-valid") ||
    code.startsWith("auth/requests-from-referer")
  ) {
    return {
      title: "このURLからはサインインできません",
      detail:
        "Firebase の API キーの設定で、このドメインからの利用が許可されていません。ルームの作成者に伝えてください。",
      code,
    };
  }
  return {
    title: "サインインに失敗しました",
    detail: "時間をおいてもう一度お試しください。",
    code,
  };
}

// 匿名サインインを試みる。成功するとonAuthStateChanged経由でuidが流れてくる
export async function signInAnonymouslyOrThrow(): Promise<void> {
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error("匿名サインインに失敗しました", e);
    throw describeSignInError(e);
  }
}

// 匿名認証のuidを購読する。未サインインなら匿名サインインを行い、失敗したらonErrorに原因を渡す。
// 再試行はsignInAnonymouslyOrThrowを呼ぶ。
export function subscribeAuthUid(
  cb: (uid: string | null) => void,
  onError: (error: AuthSignInError) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      cb(user.uid);
      return;
    }
    cb(null);
    signInAnonymouslyOrThrow().catch(onError);
  });
}
