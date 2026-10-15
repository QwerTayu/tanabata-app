"use client";

import { useCallback, useRef, useState } from "react";
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
  // いいねの書き込みが終わるまで同じ短冊への次のいいねを受け付けない(連打で処理が並行しないように)。
  // 再描画前の連続クリックも止めるためrefで判定し、ボタンの見た目用にstateも持つ
  const pendingRef = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const handleLike = useCallback(
    async (tanzakuId: string) => {
      if (pendingRef.current.has(tanzakuId)) return;
      pendingRef.current.add(tanzakuId);
      setPendingIds(new Set(pendingRef.current));
      try {
        const count = await likeTanzaku(roomId, tanzakuId, uid);
        setLikeCounts((prev) => ({ ...prev, [tanzakuId]: count }));
      } catch (e) {
        if (e instanceof LimitReachedError) {
          // リロード前に押した分で既に上限に達していた
          setLikeCounts((prev) => ({ ...prev, [tanzakuId]: maxLikesPerTanzaku }));
        } else {
          console.error("いいねに失敗しました", e);
        }
      } finally {
        pendingRef.current.delete(tanzakuId);
        setPendingIds(new Set(pendingRef.current));
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
          canLike={
            !pendingIds.has(tanzaku.id) &&
            (likeCounts[tanzaku.id] ?? 0) < maxLikesPerTanzaku
          }
          onLike={handleLike}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
