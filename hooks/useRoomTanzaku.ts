"use client";

import { useEffect, useState } from "react";
import { subscribeRoom } from "@/lib/rooms";
import { subscribeTanzaku } from "@/lib/tanzaku";
import type { RoomDoc, Tanzaku } from "@/lib/types";

// uidがnull(匿名サインイン待ち)の間は、自分の短冊だけの購読を始めない
export function useRoomTanzaku(
  roomId: string,
  isAdmin: boolean,
  uid: string | null,
) {
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [tanzakuList, setTanzakuList] = useState<Tanzaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const revealed = room?.revealed ?? false;
  const showAll = isAdmin || revealed;
  // 全件購読中はuidの到着で再購読しないよう、絞り込みに使うときだけuidを依存に含める
  const filterUid = showAll ? null : uid;

  useEffect(() => {
    const unsubscribe = subscribeRoom(roomId, (room) => {
      if (!room) {
        setError("ルームが見つかりません");
        return;
      }
      setError(null);
      setRoom(room);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (error) return;
    if (!showAll && !filterUid) return;
    // 全件/自分のみの切り替え時に再購読するための明示的なローディング状態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsubscribe = subscribeTanzaku(
      roomId,
      filterUid ? { authorUid: filterUid } : {},
      (list) => {
        setTanzakuList(list);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [roomId, showAll, filterUid, error]);

  return { room, tanzakuList, revealed, loading, error };
}
