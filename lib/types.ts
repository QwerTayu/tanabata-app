import type { Timestamp } from "firebase/firestore";

export interface RoomDoc {
  createdAt: Timestamp;
  revealed: boolean;
}

export type TanzakuColor = "red" | "yellow" | "blue";

export interface TanzakuDoc {
  wish: string;
  handle: string; // 空文字許容
  color: TanzakuColor;
  likeCount: number;
  authorClientId: string;
  createdAt: Timestamp;
}

// Firestoreドキュメントにidを合成したクライアント側の表示用型
export interface Tanzaku extends TanzakuDoc {
  id: string;
}
