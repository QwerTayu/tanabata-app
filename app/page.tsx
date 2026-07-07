"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ROOM_KEY_LENGTH } from "@/lib/constants";
import { createRoom, getRoom } from "@/lib/rooms";

export default function HomePage() {
  const router = useRouter();
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    const roomKey = roomKeyInput.trim().toUpperCase();
    if (roomKey.length !== ROOM_KEY_LENGTH) {
      setError(`ルームキーは${ROOM_KEY_LENGTH}桁で入力してください`);
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const room = await getRoom(roomKey);
      if (!room) {
        setError("ルームが見つかりません");
        return;
      }
      router.push(`/${roomKey}`);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setJoining(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const roomKey = await createRoom();
      router.push(`/${roomKey}/admin`);
    } catch {
      setError("ルーム作成に失敗しました。もう一度お試しください。");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-white">
      <h1 className="text-2xl font-bold">七夕オンライン短冊</h1>

      <form onSubmit={handleJoin} className="flex flex-col items-center gap-3">
        <input
          type="text"
          value={roomKeyInput}
          onChange={(e) =>
            setRoomKeyInput(
              e.target.value.toUpperCase().slice(0, ROOM_KEY_LENGTH),
            )
          }
          placeholder="ルームキー(6桁)"
          maxLength={ROOM_KEY_LENGTH}
          className="room-key w-48 rounded border border-white/30 bg-white/90 px-3 py-2 text-center text-lg text-gray-900 uppercase"
        />
        <button
          type="submit"
          disabled={joining}
          className="w-48 rounded bg-yellow-400 px-4 py-2 font-bold text-gray-900 disabled:opacity-50"
        >
          {joining ? "確認中…" : "参加する"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-white/50">
        <span className="h-px w-16 bg-white/30" />
        <span className="text-xs">または</span>
        <span className="h-px w-16 bg-white/30" />
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="w-48 rounded border border-white/50 px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {creating ? "作成中…" : "ルームを作成する"}
      </button>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </main>
  );
}
