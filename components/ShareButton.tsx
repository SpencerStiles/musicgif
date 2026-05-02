"use client";

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  audioFile?: File | null;
  disabled?: boolean;
  onShare?: () => void;
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function ShareButton({
  url,
  title,
  audioFile,
  disabled,
  onShare,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const mobile = isMobile();

  const handleShare = async () => {
    // MOBILE: prefer file-share — recipient gets inline audio player in any messaging app
    if (
      mobile &&
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
        if ((err as Error)?.name === "AbortError") return;
        // Fall through to URL/clipboard
      }
    }

    // MOBILE without file share, or DESKTOP: try Web Share API with URL
    if (mobile && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title });
        onShare?.();
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Final fallback (desktop primary path): clipboard
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

  const downloadAudio = () => {
    if (!audioFile) return;
    const blobUrl = URL.createObjectURL(audioFile);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = audioFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <div className="space-y-2 w-full">
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled}
        className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-lg active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {copied
          ? "Link copied ✓"
          : mobile && audioFile
            ? "Share clip 🎵"
            : "Copy link 🔗"}
      </button>

      {/* When there's an audio file, always offer a download/save button as a
          secondary action. On desktop: lets you drag-and-drop into web chat
          apps. On mobile: lets you manually attach in apps that don't appear
          in the system share sheet (e.g. Google Voice doesn't register for
          audio shares). */}
      {audioFile && (
        <button
          type="button"
          onClick={downloadAudio}
          className="w-full rounded-2xl bg-white/10 hover:bg-white/20 py-3 text-white font-medium transition text-sm"
        >
          {mobile ? "Save .wav to Files" : "Download .wav (drag into chat)"}
        </button>
      )}
    </div>
  );
}
