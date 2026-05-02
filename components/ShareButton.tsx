"use client";

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  audioFile?: File | null; // when present, share as inline audio attachment
  disabled?: boolean;
  onShare?: () => void;
}

export default function ShareButton({
  url,
  title,
  audioFile,
  disabled,
  onShare,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Prefer file share — recipient sees an inline audio player in any messaging app
    if (
      audioFile &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [audioFile] })
    ) {
      try {
        await navigator.share({ files: [audioFile], title });
        onShare?.();
        return;
      } catch (err) {
        // User cancelled, or share failed — fall through to URL share
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // URL share — works everywhere but recipient has to tap link → open browser
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title });
        onShare?.();
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Final fallback: clipboard
    await copyToClipboard();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShare?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-lg active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {copied
        ? "Link copied ✓"
        : audioFile
          ? "Share clip 🎵"
          : "Share link 🔗"}
    </button>
  );
}
