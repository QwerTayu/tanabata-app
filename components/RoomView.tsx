"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRoomTanzaku } from "@/hooks/useRoomTanzaku";
import { getClientId } from "@/lib/localStorage";
import { deleteRoomCascade, setRevealed } from "@/lib/rooms";
import { deleteTanzaku } from "@/lib/tanzaku";
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
  const [toggling, setToggling] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // ブラウザのlocalStorageから読むだけの初期化なので、マウント後1回だけ実行する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientId(getClientId());
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

  if (loading || !clientId) {
    return (
      <main className="flex flex-1 items-center justify-center text-white/70">
        読み込み中…
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

  async function handleShare() {
    const url = `${window.location.origin}/${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
        <div>
          <span className="font-bold">ルーム: {roomId}</span>
          {isAdmin && (
            <span className="ml-2 rounded bg-white/20 px-2 py-0.5">
              管理者
            </span>
          )}
        </div>
        <ul className="text-white/70">
          <li>・50文字以内で願い事を書いてね</li>
          <li>・他の人の短冊にいいねを送れるよ(1つの短冊につき10回まで)</li>
          <li>・他の人が嫌な気持ちになる願い事は書かないでね</li>
        </ul>
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
            onClick={handleShare}
            className="rounded bg-white/20 px-3 py-1"
          >
            {copied ? "コピーしました" : "共有リンクをコピー"}
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

      <div className="flex flex-1 items-center overflow-hidden">
        <TanzakuGrid
          roomId={roomId}
          tanzakuList={tanzakuList}
          isAdmin={isAdmin}
          onDelete={isAdmin ? handleDeleteTanzaku : undefined}
        />
      </div>

      <TanzakuForm roomId={roomId} clientId={clientId} />
    </main>
  );
}
