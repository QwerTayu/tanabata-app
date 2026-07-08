import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase/client";
import type { Tanzaku, TanzakuColor, TanzakuDoc } from "./types";

export async function createTanzaku(
  roomId: string,
  input: {
    wish: string;
    handle: string;
    color: TanzakuColor;
    authorClientId: string;
  },
): Promise<string> {
  const ref = await addDoc(collection(db, "rooms", roomId, "tanzaku"), {
    wish: input.wish,
    handle: input.handle,
    color: input.color,
    authorClientId: input.authorClientId,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Firestoreの`where(authorClientId==...).orderBy(createdAt)`は複合インデックスが
// 必要になり詰まりやすいため、orderByはFirestore側でかけずクライアント側でソートする。
export function subscribeTanzaku(
  roomId: string,
  opts: { authorClientId?: string },
  cb: (list: Tanzaku[]) => void,
): () => void {
  const collectionRef = collection(db, "rooms", roomId, "tanzaku");
  const q = opts.authorClientId
    ? query(collectionRef, where("authorClientId", "==", opts.authorClientId))
    : query(collectionRef);

  return onSnapshot(q, (snap) => {
    const list: Tanzaku[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as TanzakuDoc),
    }));
    // 表示順(作成順/いいね順の切り替え)はUI側(RoomView)の責務なので、
    // ここでは購読のたびに順序が安定するよう投稿順のみで揃えておく。
    list.sort(
      (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0),
    );
    cb(list);
  });
}

export async function likeTanzaku(
  roomId: string,
  tanzakuId: string,
): Promise<void> {
  await updateDoc(doc(db, "rooms", roomId, "tanzaku", tanzakuId), {
    likeCount: increment(1),
  });
}

export async function deleteTanzaku(
  roomId: string,
  tanzakuId: string,
): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "tanzaku", tanzakuId));
}
