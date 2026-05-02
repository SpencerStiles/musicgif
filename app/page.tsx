"use client";

import { useState, useCallback } from "react";
import SearchBox from "@/components/SearchBox";
import Trimmer from "@/components/Trimmer";
import SlugInput from "@/components/SlugInput";
import CaptionInput from "@/components/CaptionInput";
import ShareButton from "@/components/ShareButton";
import { ItunesTrack, artworkUrl } from "@/lib/itunes";

type Step = "search" | "trim" | "share" | "done";

export default function Home() {
  const [step, setStep] = useState<Step>("search");
  const [track, setTrack] = useState<ItunesTrack | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [durationMs, setDurationMs] = useState(5000);
  const [slug, setSlug] = useState("");
  const [caption, setCaption] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [takenSuggestion, setTakenSuggestion] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSelectTrack = (t: ItunesTrack) => {
    setTrack(t);
    setStep("trim");
  };

  const handleTrimChange = useCallback((start: number, duration: number) => {
    setStartMs(start);
    setDurationMs(duration);
  }, []);

  const handleCreate = async () => {
    if (!track) return;
    setCreating(true);
    setCreateError(null);
    setTakenSuggestion(undefined);

    try {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.trackId,
          startMs,
          durationMs,
          caption,
          slug: slug || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create clip");
        return;
      }

      const url = `${window.location.origin}/c/${data.slug}`;
      setShareUrl(url);

      if (data.taken && slug) {
        setTakenSuggestion(data.slug);
      }

      setStep("done");
    } catch {
      setCreateError("Connection error. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setStep("search");
    setTrack(null);
    setShareUrl(null);
    setSlug("");
    setCaption("");
    setTakenSuggestion(undefined);
    setCreateError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">🎵 musicgif</h1>
          <p className="text-white/50 text-sm mt-1">Send a music moment</p>
        </div>

        {step === "search" && (
          <SearchBox onSelect={handleSelectTrack} />
        )}

        {step === "trim" && track && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artworkUrl(track.artworkUrl100, 60)}
                alt={track.trackName}
                width={48}
                height={48}
                className="rounded-xl"
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">{track.trackName}</p>
                <p className="text-white/60 text-sm truncate">{track.artistName}</p>
              </div>
              <button
                type="button"
                onClick={() => { setTrack(null); setStep("search"); }}
                className="ml-auto text-white/40 hover:text-white/70 text-sm shrink-0"
              >
                ✕
              </button>
            </div>

            <Trimmer
              previewUrl={track.previewUrl}
              onTrimChange={handleTrimChange}
            />

            <button
              type="button"
              onClick={() => setStep("share")}
              className="w-full rounded-2xl bg-white/10 hover:bg-white/20 py-3 text-white font-medium transition"
            >
              Next: add details →
            </button>
          </div>
        )}

        {step === "share" && track && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artworkUrl(track.artworkUrl100, 60)}
                alt={track.trackName}
                width={48}
                height={48}
                className="rounded-lg"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{track.trackName}</p>
                <p className="text-white/60 text-sm">
                  {Math.round(startMs / 1000)}s – {Math.round((startMs + durationMs) / 1000)}s
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("trim")}
                className="ml-auto text-white/40 hover:text-white/70 text-sm shrink-0"
              >
                Edit
              </button>
            </div>

            <CaptionInput value={caption} onChange={setCaption} />
            <SlugInput
              value={slug}
              onChange={setSlug}
              takenSuggestion={takenSuggestion}
            />

            {createError && (
              <p className="text-red-400 text-sm text-center">{createError}</p>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-lg active:scale-95 transition disabled:opacity-40"
            >
              {creating ? "Preparing clip…" : "Create & Share 🎵"}
            </button>
          </div>
        )}

        {step === "done" && shareUrl && track && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">🎉</div>
            <p className="text-xl font-semibold">Your clip is ready!</p>
            <p className="text-white/50 text-sm break-all">{shareUrl}</p>

            {takenSuggestion && (
              <p className="text-amber-400 text-xs">
                Slug was taken — using <strong>{shareUrl.split("/c/")[1]}</strong> instead
              </p>
            )}

            <ShareButton
              url={shareUrl}
              title={`${caption || track.trackName} — musicgif`}
            />

            <button
              type="button"
              onClick={reset}
              className="text-white/40 hover:text-white/70 text-sm transition"
            >
              Make another clip
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
