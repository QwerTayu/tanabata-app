"use client";

import { useState, type FormEvent } from "react";
import { updateRoomLimits } from "@/lib/rooms";

interface RoomLimitsFormProps {
  roomId: string;
  maxTanzakuPerUser: number;
  maxLikesPerTanzaku: number;
}

// 管理者用: ルームごとの投稿上限・いいね上限を編集する。
// 親側でkeyに現在値を渡し、他の管理者が更新したときは入力欄を作り直して最新値に合わせる。
export function RoomLimitsForm({
  roomId,
  maxTanzakuPerUser,
  maxLikesPerTanzaku,
}: RoomLimitsFormProps) {
  const [tanzakuInput, setTanzakuInput] = useState(String(maxTanzakuPerUser));
  const [likesInput, setLikesInput] = useState(String(maxLikesPerTanzaku));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextTanzaku = Number(tanzakuInput);
    const nextLikes = Number(likesInput);
    if (
      !Number.isInteger(nextTanzaku) ||
      nextTanzaku < 1 ||
      !Number.isInteger(nextLikes) ||
      nextLikes < 1
    ) {
      setError("1以上の整数を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateRoomLimits(roomId, {
        maxTanzakuPerUser: nextTanzaku,
        maxLikesPerTanzaku: nextLikes,
      });
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  const unchanged =
    tanzakuInput === String(maxTanzakuPerUser) &&
    likesInput === String(maxLikesPerTanzaku);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 border-b border-white/20 px-3 py-2 text-xs"
    >
      <label className="flex items-center gap-1">
        投稿上限
        <input
          type="number"
          min={1}
          step={1}
          value={tanzakuInput}
          onChange={(e) => setTanzakuInput(e.target.value)}
          className="w-14 rounded border border-white/30 bg-white/90 px-1 py-0.5 text-gray-900"
        />
        個/人
      </label>
      <label className="flex items-center gap-1">
        いいね上限
        <input
          type="number"
          min={1}
          step={1}
          value={likesInput}
          onChange={(e) => setLikesInput(e.target.value)}
          className="w-14 rounded border border-white/30 bg-white/90 px-1 py-0.5 text-gray-900"
        />
        回/短冊
      </label>
      <button
        type="submit"
        disabled={saving || unchanged}
        className="rounded bg-white/20 px-3 py-1 disabled:opacity-50"
      >
        {saving ? "保存中…" : "上限を保存"}
      </button>
      {error && <p className="w-full text-red-300">{error}</p>}
    </form>
  );
}
