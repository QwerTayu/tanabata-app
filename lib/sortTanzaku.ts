import type { Tanzaku } from "./types";

export type SortMode = "likeCount" | "createdAt";

export function sortTanzaku(list: Tanzaku[], mode: SortMode): Tanzaku[] {
  const sorted = [...list];
  if (mode === "likeCount") {
    // いいねが多い順。同数の場合は投稿が古い順(安定した並びにするためのタイブレーク)
    sorted.sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0);
    });
  } else {
    sorted.sort(
      (a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0),
    );
  }
  return sorted;
}
