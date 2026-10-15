import type { Timestamp } from "firebase/firestore";

export interface RoomDoc {
  createdAt: Timestamp;
  revealed: boolean;
  maxTanzakuPerUser: number;
  maxLikesPerTanzaku: number;
}

export type TanzakuColor = "red" | "yellow" | "blue";

export interface TanzakuDoc {
  wish: string;
  handle: string; // 空文字許容
  color: TanzakuColor;
  likeCount: number;
  authorUid: string;
  createdAt: Timestamp;
}

// Firestoreドキュメントにidを合成したクライアント側の表示用型
export interface Tanzaku extends TanzakuDoc {
  id: string;
}

// rooms/{roomId}/authorCounters/{uid}: そのuidがこのルームで作成した短冊の数
export interface AuthorCounterDoc {
  tanzakuCount: number;
}

// rooms/{roomId}/tanzaku/{tanzakuId}/likedBy/{uid}: そのuidがこの短冊にいいねした回数
export interface LikedByDoc {
  count: number;
}
