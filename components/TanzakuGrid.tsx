"use client";

import { useCallback, useState } from "react";
import { MAX_LIKES_PER_TANZAKU_PER_USER } from "@/lib/constants";
import { getLikeCount, incrementLikeCount } from "@/lib/localStorage";
import { likeTanzaku } from "@/lib/tanzaku";
import type { Tanzaku } from "@/lib/types";
import { TanzakuCard } from "./TanzakuCard";

interface TanzakuGridProps {
  roomId: string;
  tanzakuList: Tanzaku[];
  isAdmin: boolean;
  onDelete?: (tanzakuId: string) => void;
}

export function TanzakuGrid({
  roomId,
  tanzakuList,
  isAdmin,
  onDelete,
}: TanzakuGridProps) {
  // localStorageのいいね回数はReactのstateではないため、更新後に再描画させるための小さなカウンタ
  const [, forceRender] = useState(0);

  const handleLike = useCallback(
    async (tanzakuId: string) => {
      if (getLikeCount(roomId, tanzakuId) >= MAX_LIKES_PER_TANZAKU_PER_USER) {
        return;
      }
      await likeTanzaku(roomId, tanzakuId);
      incrementLikeCount(roomId, tanzakuId);
      forceRender((tick) => tick + 1);
    },
    [roomId],
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
          canLike={
            getLikeCount(roomId, tanzaku.id) < MAX_LIKES_PER_TANZAKU_PER_USER
          }
          onLike={handleLike}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
