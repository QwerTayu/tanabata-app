"use client";

import { useEffect, useState } from "react";
import { getClientId } from "@/lib/localStorage";
import { subscribeRoom } from "@/lib/rooms";
import { subscribeTanzaku } from "@/lib/tanzaku";
import type { Tanzaku } from "@/lib/types";

export function useRoomTanzaku(roomId: string, isAdmin: boolean) {
  const [tanzakuList, setTanzakuList] = useState<Tanzaku[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeRoom(roomId, (room) => {
      if (!room) {
        setError("ルームが見つかりません");
        return;
      }
      setError(null);
      setRevealed(room.revealed);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (error) return;
    const showAll = isAdmin || revealed;
    const clientId = getClientId();
    // revealed/isAdminの切り替え時に再購読するための明示的なローディング状態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsubscribe = subscribeTanzaku(
      roomId,
      showAll ? {} : { authorClientId: clientId },
      (list) => {
        setTanzakuList(list);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [roomId, isAdmin, revealed, error]);

  return { tanzakuList, revealed, loading, error };
}
