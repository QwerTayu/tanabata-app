"use client";

import type { CSSProperties } from "react";
import { CARD_ASPECT_RATIO, TANZAKU_COLORS } from "@/lib/constants";
import { getGlowStyle } from "@/lib/glow";
import type { Tanzaku } from "@/lib/types";

interface TanzakuCardProps {
  tanzaku: Tanzaku;
  isAdmin: boolean;
  canLike: boolean;
  onLike: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TanzakuCard({
  tanzaku,
  isAdmin,
  canLike,
  onLike,
  onDelete,
}: TanzakuCardProps) {
  const colorInfo = TANZAKU_COLORS[tanzaku.color];
  const displayHandle = tanzaku.handle.trim() || "名無しさん";

  const cardStyle: CSSProperties = {
    aspectRatio: CARD_ASPECT_RATIO,
    backgroundColor: colorInfo.bg,
    backgroundImage: `url(${colorInfo.imageSrc})`,
    backgroundSize: "100% 100%",
    contentVisibility: "auto",
    containIntrinsicSize: "100px 274px",
    ...getGlowStyle(tanzaku.likeCount),
  };

  return (
    <div
      className="relative w-[100px] shrink-0 overflow-hidden rounded-md sm:w-[120px]"
      style={cardStyle}
    >
      {isAdmin && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(tanzaku.id)}
          aria-label="削除"
          className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-black/40 text-xs leading-5 text-white"
        >
          ×
        </button>
      )}

      <div className="absolute inset-x-0 top-[18%] bottom-[22%] flex flex-col items-center overflow-hidden px-1">
        <p className="writing-vertical flex-1 overflow-hidden text-[13px] leading-relaxed text-gray-800">
          {tanzaku.wish}
        </p>

        <div className="mt-6 flex shrink-0 flex-col items-center gap-1 pb-1">
          <span className="max-w-[90%] text-center text-[10px] leading-tight break-words text-gray-700">
            {displayHandle}
          </span>
          <button
            type="button"
            onClick={() => canLike && onLike(tanzaku.id)}
            disabled={!canLike}
            aria-label="いいね"
            className="flex items-center gap-1 disabled:opacity-50"
          >
            <span className="text-xl leading-none">
              {tanzaku.likeCount > 0 ? "❤" : "♡"}
            </span>
            {isAdmin && (
              <span className="text-[10px] text-gray-700">
                {tanzaku.likeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
