"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getRandomTanzakuColor,
  MAX_TANZAKU_PER_ROOM_PER_USER,
  TANZAKU_COLORS,
  WISH_MAX_LENGTH,
} from "@/lib/constants";
import {
  getCreatedCount,
  getShowHandle,
  incrementCreatedCount,
  setShowHandle as saveShowHandle,
} from "@/lib/localStorage";
import { createTanzaku } from "@/lib/tanzaku";
import type { TanzakuColor } from "@/lib/types";

interface TanzakuFormProps {
  roomId: string;
  clientId: string;
  handle: string;
}

export function TanzakuForm({ roomId, clientId, handle }: TanzakuFormProps) {
  const [wish, setWish] = useState("");
  const [showHandle, setShowHandleValue] = useState(true);
  // SSR時とクライアントの初回描画でランダム値が食い違うと不一致を起こすため、
  // 初期値は固定にしておき、マウント後のeffectでランダムな色に差し替える
  const [color, setColor] = useState<TanzakuColor>("red");
  const [createdCount, setCreatedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ブラウザのlocalStorageから読むだけの初期化なので、マウント/roomId変更後1回だけ実行する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHandleValue(getShowHandle());
    setColor(getRandomTanzakuColor());
    setCreatedCount(getCreatedCount(roomId));
  }, [roomId]);

  const remaining = MAX_TANZAKU_PER_ROOM_PER_USER - createdCount;
  const reachedLimit = remaining <= 0;

  function handleToggleShowHandle(checked: boolean) {
    setShowHandleValue(checked);
    saveShowHandle(checked);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedWish = wish.trim();
    if (!trimmedWish || reachedLimit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createTanzaku(roomId, {
        wish: trimmedWish.slice(0, WISH_MAX_LENGTH),
        handle: showHandle ? handle : "",
        color,
        authorClientId: clientId,
      });
      incrementCreatedCount(roomId);
      setCreatedCount((c) => c + 1);
      setWish("");
      setColor(getRandomTanzakuColor());
    } catch {
      setError("投稿に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (reachedLimit) {
    return (
      <div className="w-full border-t border-white/20 bg-black/30 px-4 py-3 text-center text-sm text-white">
        このルームでの投稿上限({MAX_TANZAKU_PER_ROOM_PER_USER}個)に達しました
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-wrap items-center gap-2 border-t border-white/20 bg-black/30 px-3 py-3"
    >
      <label className="flex items-center gap-1 text-xs text-white">
        <input
          type="checkbox"
          checked={!showHandle}
          onChange={(e) => handleToggleShowHandle(!e.target.checked)}
        />
        匿名で投稿
      </label>

      <div className="flex gap-1">
        {(Object.keys(TANZAKU_COLORS) as TanzakuColor[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setColor(key)}
            aria-label={TANZAKU_COLORS[key].label}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              color === key
                ? "border-gray-900"
                : "border-white/40"
            }`}
            style={{ backgroundColor: TANZAKU_COLORS[key].bg }}
          >
            {color === key && (
              <span className="text-xs font-bold text-gray-900">✓</span>
            )}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={wish}
        onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX_LENGTH))}
        placeholder="願い事を書いてね(50文字まで)"
        className="min-w-[160px] flex-1 rounded border border-white/30 bg-white/90 px-2 py-1 text-sm text-gray-900"
      />

      <button
        type="submit"
        disabled={submitting || !wish.trim()}
        className="rounded bg-yellow-400 px-4 py-1.5 text-sm font-bold text-gray-900 disabled:opacity-50"
      >
        {submitting ? "送信中…" : "飾る"}
      </button>

      {error && <p className="w-full text-xs text-red-300">{error}</p>}
      <p className="w-full text-right text-[10px] text-white/60">
        残り{remaining}枚
      </p>
    </form>
  );
}
