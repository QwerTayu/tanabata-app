import type { CSSProperties } from "react";

export function getGlowStyle(likeCount: number): CSSProperties {
  if (likeCount <= 0) {
    return {};
  }
  if (likeCount <= 4) {
    return { boxShadow: "0 0 8px 2px rgba(255,215,0,0.5)" };
  }
  if (likeCount <= 14) {
    return { boxShadow: "0 0 16px 4px rgba(255,215,0,0.7)" };
  }
  if (likeCount <= 29) {
    return {
      boxShadow: "0 0 24px 8px rgba(255,200,0,0.85)",
      animation: "tanzaku-pulse 2s ease-in-out infinite",
    };
  }
  return {
    boxShadow: "0 0 36px 12px rgba(255,180,0,1)",
    animation: "tanzaku-pulse 1.2s ease-in-out infinite",
  };
}
