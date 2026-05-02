"use client";

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  disabled?: boolean;
  onShare?: () => void;
}

export default function ShareButton({ url, title, disabled, onShare }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title });
        onShare?.();
      } catch {
        // User cancelled or share failed — fall through to clipboard
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShare?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available (unlikely, but graceful)
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-lg active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {copied ? "Link copied ✓" : "Share 🎵"}
    </button>
  );
}
