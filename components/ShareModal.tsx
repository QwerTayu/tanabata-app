"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

interface ShareModalProps {
  roomId: string;
  shareUrl: string;
  onClose: () => void;
}

export function ShareModal({ roomId, shareUrl, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white px-6 py-8 text-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="self-end -mt-4 -mr-2 h-8 w-8 rounded-full text-xl text-gray-400 hover:text-gray-700"
        >
          ×
        </button>

        <p className="text-sm text-gray-500">ルームキー</p>
        <p className="room-key text-5xl font-bold tracking-widest">
          {roomId}
        </p>

        <div className="rounded-lg border border-gray-200 p-2">
          <QRCodeSVG value={shareUrl} size={192} />
        </div>

        <p className="w-full break-all text-center text-xs text-gray-500">
          {shareUrl}
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full rounded bg-yellow-400 px-4 py-2 font-bold text-gray-900"
        >
          {copied ? "コピーしました" : "リンクをコピーする"}
        </button>
      </div>
    </div>
  );
}
