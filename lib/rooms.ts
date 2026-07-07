import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/client";
import {
  ROOM_KEY_CHARS,
  ROOM_KEY_CREATE_MAX_RETRIES,
  ROOM_KEY_LENGTH,
} from "./constants";
import type { RoomDoc } from "./types";

export function generateRoomKey(): string {
  let key = "";
  for (let i = 0; i < ROOM_KEY_LENGTH; i++) {
    const index = Math.floor(Math.random() * ROOM_KEY_CHARS.length);
    key += ROOM_KEY_CHARS[index];
  }
  return key;
}

export async function createRoom(): Promise<string> {
  for (let attempt = 0; attempt < ROOM_KEY_CREATE_MAX_RETRIES; attempt++) {
    const roomKey = generateRoomKey();
    const roomRef = doc(db, "rooms", roomKey);
    const existing = await getDoc(roomRef);
    if (existing.exists()) continue;

    await setDoc(roomRef, {
      createdAt: serverTimestamp(),
      revealed: false,
    });
    return roomKey;
  }
  throw new Error("ルーム作成に失敗しました。もう一度お試しください。");
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  const snap = await getDoc(doc(db, "rooms", roomId));
  return snap.exists() ? (snap.data() as RoomDoc) : null;
}

export function subscribeRoom(
  roomId: string,
  cb: (room: RoomDoc | null) => void,
): () => void {
  return onSnapshot(doc(db, "rooms", roomId), (snap) => {
    cb(snap.exists() ? (snap.data() as RoomDoc) : null);
  });
}

export async function setRevealed(
  roomId: string,
  revealed: boolean,
): Promise<void> {
  await updateDoc(doc(db, "rooms", roomId), { revealed });
}

export async function deleteRoomCascade(roomId: string): Promise<void> {
  const tanzakuSnap = await getDocs(collection(db, "rooms", roomId, "tanzaku"));
  const batch = writeBatch(db);
  tanzakuSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "rooms", roomId));
  await batch.commit();
}
