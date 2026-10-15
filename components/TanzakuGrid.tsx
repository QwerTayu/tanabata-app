"use client";

import { useCallback, useState } from "react";
import { LimitReachedError, likeTanzaku } from "@/lib/tanzaku";
import type { Tanzaku } from "@/lib/types";
import { TanzakuCard } from "./TanzakuCard";

interface TanzakuGridProps {
  roomId: string;
  tanzakuList: Tanzaku[];
  uid: string;
  maxLikesPerTanzaku: number;
  isAdmin: boolean;
  onDelete?: (tanzakuId: string) => void;
}

export function TanzakuGrid({
  roomId,
  tanzakuList,
  uid,
  maxLikesPerTanzaku,
  isAdmin,
  onDelete,
}: TanzakuGridProps) {
  // いいね回数の真実の情報源はFirestore(likedBy/{uid})。短冊ごとに購読するとreadが嵩むため、
  // ここではセッション内で分かった回数だけを持ち、ボタンの無効化に使う(リロードで消える)。
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const handleLike = useCallback(
    async (tanzakuId: string) => {
      try {
        const count = await likeTanzaku(roomId, tanzakuId, uid);
        setLikeCounts((prev) => ({ ...prev, [tanzakuId]: count }));
      } catch (e) {
        if (!(e instanceof LimitReachedError)) throw e;
        // リロード前に押した分で既に上限に達していた
        setLikeCounts((prev) => ({ ...prev, [tanzakuId]: maxLikesPerTanzaku }));
      }
    },
    [roomId, uid, maxLikesPerTanzaku],
  );

  if (tanzakuList.length === 0) {
    return (
      <div className="flex w-full items-center justify-center px-3 py-10 text-sm text-white/70">
        まだ短冊がありません。下のフォームから書いてみましょう。
      </div>
    );
  }

  return (
    <div className="flex w-full gap-3 overflow-x-auto overflow-y-hidden px-3 py-4">
      {tanzakuList.map((tanzaku) => (
        <TanzakuCard
          key={tanzaku.id}
          tanzaku={tanzaku}
          isAdmin={isAdmin}
          canLike={(likeCounts[tanzaku.id] ?? 0) < maxLikesPerTanzaku}
          onLike={handleLike}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
