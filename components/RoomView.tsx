"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRoomTanzaku } from "@/hooks/useRoomTanzaku";
import { HANDLE_MAX_LENGTH } from "@/lib/constants";
import {
  getClientId,
  getHandle,
  setHandle as saveHandle,
} from "@/lib/localStorage";
import { deleteRoomCascade, setRevealed } from "@/lib/rooms";
import { sortTanzaku, type SortMode } from "@/lib/sortTanzaku";
import { deleteTanzaku } from "@/lib/tanzaku";
import { ShareModal } from "./ShareModal";
import { TanzakuForm } from "./TanzakuForm";
import { TanzakuGrid } from "./TanzakuGrid";

interface RoomViewProps {
  roomId: string;
  isAdmin: boolean;
}

export function RoomView({ roomId, isAdmin }: RoomViewProps) {
  const router = useRouter();
  const { tanzakuList, revealed, loading, error } = useRoomTanzaku(
    roomId,
    isAdmin,
  );
  const [clientId, setClientId] = useState("");
  // null = localStorage未読込、"" = 読込済みだが未設定、それ以外 = 設定済み
  const [handle, setHandleState] = useState<string | null>(null);
  const [gateHandleInput, setGateHandleInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("likeCount");

  const sortedTanzakuList = useMemo(
    () => sortTanzaku(tanzakuList, sortMode),
    [tanzakuList, sortMode],
  );

  useEffect(() => {
    // ブラウザのlocalStorageから読むだけの初期化なので、マウント後1回だけ実行する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientId(getClientId());
    setHandleState(getHandle());
  }, []);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-white">
        <p className="text-lg">{error}</p>
        <Link href="/" className="underline">
          トップに戻る
        </Link>
      </main>
    );
  }

  if (loading || !clientId || handle === null) {
    return (
      <main className="flex flex-1 items-center justify-center text-white/70">
        読み込み中…
      </main>
    );
  }

  function handleGateSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = gateHandleInput.trim();
    if (!trimmed) {
      setGateError("ハンドルネームを入力してください");
      return;
    }
    saveHandle(trimmed);
    setHandleState(trimmed);
  }

  if (handle === "") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-white">
        <p>このルームに入るにはハンドルネームが必要です</p>
        <form
          onSubmit={handleGateSubmit}
          className="flex flex-col items-center gap-3"
        >
          <input
            type="text"
            value={gateHandleInput}
            onChange={(e) =>
              setGateHandleInput(e.target.value.slice(0, HANDLE_MAX_LENGTH))
            }
            placeholder="ハンドルネーム(必須)"
            maxLength={HANDLE_MAX_LENGTH}
            className="w-48 rounded border border-white/30 bg-white/90 px-3 py-2 text-center text-gray-900"
          />
          <button
            type="submit"
            className="w-48 rounded bg-yellow-400 px-4 py-2 font-bold text-gray-900"
          >
            入室する
          </button>
          {gateError && <p className="text-sm text-red-300">{gateError}</p>}
        </form>
      </main>
    );
  }

  async function handleToggleReveal() {
    setToggling(true);
    try {
      await setRevealed(roomId, !revealed);
    } finally {
      setToggling(false);
    }
  }

  async function handleDeleteRoom() {
    if (!window.confirm("このルームを削除します。よろしいですか？")) return;
    setDeletingRoom(true);
    try {
      await deleteRoomCascade(roomId);
      router.push("/");
    } finally {
      setDeletingRoom(false);
    }
  }

  async function handleDeleteTanzaku(tanzakuId: string) {
    await deleteTanzaku(roomId, tanzakuId);
  }

  return (
    <main className="flex flex-1 flex-col text-white">
      <header className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
        <span className="font-bold">
          ルーム: <span className="room-key">{roomId}</span>
        </span>
        {isAdmin && (
          <span className="rounded bg-white/20 px-2 py-0.5">管理者</span>
        )}
      </header>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/20 px-3 py-2 text-sm">
          <button
            type="button"
            onClick={handleToggleReveal}
            disabled={toggling}
            className="rounded bg-white/20 px-3 py-1 disabled:opacity-50"
          >
            {revealed ? "非公開に戻す" : "みんなに公開する"}
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="rounded bg-white/20 px-3 py-1"
          >
            共有する
          </button>
          <button
            type="button"
            onClick={handleDeleteRoom}
            disabled={deletingRoom}
            className="ml-auto rounded bg-red-500/70 px-3 py-1 disabled:opacity-50"
          >
            {deletingRoom ? "削除中…" : "ルームを削除"}
          </button>
        </div>
      )}

      {!isAdmin && !revealed && (
        <p className="px-3 py-2 text-center text-xs text-white/70">
          他の人の短冊は管理者が公開するまでお待ちください(今はあなたの短冊のみ表示しています)
        </p>
      )}

      <div className="flex items-center gap-2 px-3 pt-2 text-xs">
        <span className="text-white/60">並び順:</span>
        <button
          type="button"
          onClick={() => setSortMode("likeCount")}
          className={`rounded px-2 py-1 ${
            sortMode === "likeCount"
              ? "bg-yellow-400 font-bold text-gray-900"
              : "bg-white/20 text-white"
          }`}
        >
          いいね順
        </button>
        <button
          type="button"
          onClick={() => setSortMode("createdAt")}
          className={`rounded px-2 py-1 ${
            sortMode === "createdAt"
              ? "bg-yellow-400 font-bold text-gray-900"
              : "bg-white/20 text-white"
          }`}
        >
          新着順
        </button>
      </div>

      <div className="flex flex-1 flex-col items-start overflow-hidden pt-2">
        <TanzakuGrid
          roomId={roomId}
          tanzakuList={sortedTanzakuList}
          isAdmin={isAdmin}
          onDelete={isAdmin ? handleDeleteTanzaku : undefined}
        />
      </div>

      <div className="mx-3 mb-2 rounded-2xl border-2 border-[#6b4423] bg-[#a9764f]/90 px-4 py-2 text-xs text-white shadow-md">
        <ul className="space-y-0.5">
          <li>・50文字以内で願い事を書いてね</li>
          <li>・他の人の短冊にいいねを送れるよ(1つの短冊につき3回まで)</li>
          <li>・他の人が嫌な気持ちになる願い事は書かないでね</li>
        </ul>
      </div>

      <TanzakuForm roomId={roomId} clientId={clientId} handle={handle} />

      {showShareModal && (
        <ShareModal
          roomId={roomId}
          shareUrl={`${window.location.origin}/${roomId}`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}
