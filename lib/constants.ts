import type { TanzakuColor } from "./types";

export const WISH_MAX_LENGTH = 50;
// カード幅(約100〜120px)で折り返さず1行表示するための上限
export const HANDLE_MAX_LENGTH = 8;
export const MAX_TANZAKU_PER_ROOM_PER_USER = 5;
export const MAX_LIKES_PER_TANZAKU_PER_USER = 3;
export const ROOM_KEY_LENGTH = 6;
// 0/O, 1/I/L など紛らわしい文字を除外した文字セット
export const ROOM_KEY_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_KEY_CREATE_MAX_RETRIES = 5;

// 色の定数: imageSrcが実際のカード背景画像、bgは画像読み込み前/失敗時のフォールバック色
export const TANZAKU_COLORS: Record<
  TanzakuColor,
  { label: string; imageSrc: string; bg: string }
> = {
  red: { label: "赤", imageSrc: "/card_r.png", bg: "#FFB3B3" },
  yellow: { label: "黄", imageSrc: "/card_y.png", bg: "#FFEC99" },
  blue: { label: "青", imageSrc: "/card_b.png", bg: "#A5D8FF" },
};

// カード画像のアスペクト比(210:574)。TanzakuCardのCSS `aspect-ratio` に使用
export const CARD_ASPECT_RATIO = "210 / 574";

const TANZAKU_COLOR_KEYS = Object.keys(TANZAKU_COLORS) as TanzakuColor[];

// 投稿フォームの色選択は毎回ランダムなデフォルトにする(前回の色を記憶しない)
export function getRandomTanzakuColor(): TanzakuColor {
  const index = Math.floor(Math.random() * TANZAKU_COLOR_KEYS.length);
  return TANZAKU_COLOR_KEYS[index];
}
