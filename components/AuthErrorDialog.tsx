"use client";

import type { AuthSignInError } from "@/lib/auth";

interface AuthErrorDialogProps {
  error: AuthSignInError;
  retrying: boolean;
  onRetry: () => void;
}

// 匿名サインインに失敗したときのダイアログ。uidが無いと閲覧も投稿もできないので閉じるボタンは置かない
export function AuthErrorDialog({
  error,
  retrying,
  onRetry,
}: AuthErrorDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        role="alertdialog"
        aria-labelledby="auth-error-title"
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white px-6 py-6 text-gray-900 shadow-xl"
      >
        <p id="auth-error-title" className="font-bold">
          {error.title}
        </p>
        <p className="text-sm text-gray-700">{error.detail}</p>
        <p className="text-xs text-gray-400">エラーコード: {error.code}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-2 w-full rounded bg-yellow-400 px-4 py-2 font-bold text-gray-900 disabled:opacity-50"
        >
          {retrying ? "再試行中…" : "再試行する"}
        </button>
      </div>
    </div>
  );
}
