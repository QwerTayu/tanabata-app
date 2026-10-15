import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase/client";
import type {
  AuthorCounterDoc,
  LikedByDoc,
  RoomDoc,
  Tanzaku,
  TanzakuColor,
  TanzakuDoc,
} from "./types";

// ルームごとの投稿上限・いいね上限に達したときに投げる。UI側はこのエラーかどうかで表示を切り替える
export class LimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitReachedError";
  }
}

// 投稿カウンタ(authorCounters/{uid})の+1と短冊の作成を1つのトランザクションで行う。
// Firestoreルール側も「同じ書き込みでカウンタが+1されていること」と、
// 短冊IDが`{uid}__{+1後のカウンタ値}`であることを検証している(カウンタ1つにつき短冊1件)。
export async function createTanzaku(
  roomId: string,
  input: {
    wish: string;
    handle: string;
    color: TanzakuColor;
    authorUid: string;
  },
): Promise<string> {
  const roomRef = doc(db, "rooms", roomId);
  const counterRef = doc(db, "rooms", roomId, "authorCounters", input.authorUid);

  return runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const counterSnap = await tx.get(counterRef);
    if (!roomSnap.exists()) throw new Error("ルームが見つかりません");

    const max = (roomSnap.data() as RoomDoc).maxTanzakuPerUser;
    const count = counterSnap.exists()
      ? (counterSnap.data() as AuthorCounterDoc).tanzakuCount
      : 0;
    if (count >= max) {
      throw new LimitReachedError(`このルームでの投稿上限(${max}個)に達しました`);
    }

    const tanzakuId = `${input.authorUid}__${count + 1}`;
    tx.set(counterRef, { tanzakuCount: count + 1 });
    tx.set(doc(db, "rooms", roomId, "tanzaku", tanzakuId), {
      wish: input.wish,
      handle: input.handle,
      color: input.color,
      authorUid: input.authorUid,
      likeCount: 0,
      createdAt: serverTimestamp(),
    });
    return tanzakuId;
  });
}

// Firestoreの`where(authorUid==...).orderBy(createdAt)`は複合インデックスが
// 必要になり詰まりやすいため、orderByはFirestore側でかけずクライアント側でソートする。
export function subscribeTanzaku(
  roomId: string,
  opts: { authorUid?: string },
  cb: (list: Tanzaku[]) => void,
): () => void {
  const collectionRef = collection(db, "rooms", roomId, "tanzaku");
  const q = opts.authorUid
    ? query(collectionRef, where("authorUid", "==", opts.authorUid))
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

// いいね回数(likedBy/{uid})の+1と短冊のlikeCountの+1を1つのトランザクションで行う。
// 戻り値はこのuidがこの短冊にいいねした通算回数(UIの上限表示に使う)。
export async function likeTanzaku(
  roomId: string,
  tanzakuId: string,
  uid: string,
): Promise<number> {
  const roomRef = doc(db, "rooms", roomId);
  const tanzakuRef = doc(db, "rooms", roomId, "tanzaku", tanzakuId);
  const likedByRef = doc(tanzakuRef, "likedBy", uid);

  return runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    const likedBySnap = await tx.get(likedByRef);
    if (!roomSnap.exists()) throw new Error("ルームが見つかりません");

    const max = (roomSnap.data() as RoomDoc).maxLikesPerTanzaku;
    const count = likedBySnap.exists()
      ? (likedBySnap.data() as LikedByDoc).count
      : 0;
    if (count >= max) {
      throw new LimitReachedError(`この短冊へのいいねは${max}回までです`);
    }

    tx.set(likedByRef, { count: count + 1 });
    tx.update(tanzakuRef, { likeCount: increment(1) });
    return count + 1;
  });
}

export async function deleteTanzaku(
  roomId: string,
  tanzakuId: string,
): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "tanzaku", tanzakuId));
}
