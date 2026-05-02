"use client";

import { useEffect, useRef, useState } from "react";

interface PlayerProps {
  audioBlobUrl: string;
  startMs: number;
  durationMs: number;
  artworkUrl: string;
  title: string;
  artist: string;
  caption: string;
}

type PlayerState =
  | "prefetching"   // background fetch + decode, page already rendered
  | "ready"         // decoded, waiting for tap
  | "loading"       // user tapped before decode finished, showing spinner
  | "playing"       // audio playing
  | "suspended"     // app backgrounded, context suspended
  | "error";        // decode failed

export default function Player({
  audioBlobUrl,
  startMs,
  durationMs,
  artworkUrl,
  title,
  artist,
  caption,
}: PlayerProps) {
  const [playerState, setPlayerState] = useState<PlayerState>("prefetching");
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Prefetch and decode on mount — no gesture needed for fetch + decode
  useEffect(() => {
    let cancelled = false;

    const prefetch = async () => {
      try {
        // Create AudioContext early (suspended on iOS until gesture)
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        ctxRef.current = ctx;

        const res = await fetch(audioBlobUrl);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        if (cancelled) return;

        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;

        bufRef.current = audioBuf;
        setPlayerState("ready");
      } catch {
        if (!cancelled) setPlayerState("error");
      }
    };

    prefetch();
    return () => { cancelled = true; };
  }, [audioBlobUrl]);

  // Handle app backgrounding — show "tap to resume" on return
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        ctxRef.current?.suspend();
        if (playerState === "playing") setPlayerState("suspended");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [playerState]);

  const handlePlay = async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (playerState === "suspended") {
      // Resume from background
      await ctx.resume();
      setPlayerState("playing");
      return;
    }

    if (playerState === "prefetching") {
      // Decode not done yet — show spinner, play when ready
      setPlayerState("loading");
      // Polling approach: wait for buffer to appear
      const poll = setInterval(async () => {
        if (bufRef.current) {
          clearInterval(poll);
          await startPlayback();
        }
      }, 100);
      return;
    }

    if (playerState === "ready") {
      await startPlayback();
    }
  };

  const startPlayback = async () => {
    const ctx = ctxRef.current;
    const buf = bufRef.current;
    if (!ctx || !buf) return;

    // iOS Safari requires resume() synchronously inside gesture handler
    await ctx.resume();

    // Stop any currently playing source
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = startMs / 1000;
    src.loopEnd = (startMs + durationMs) / 1000;
    src.connect(ctx.destination);
    src.start(0, startMs / 1000);

    sourceRef.current = src;
    setPlayerState("playing");
  };

  const isPulsing = playerState === "playing";
  const showSpinner = playerState === "loading" || playerState === "prefetching";
  const showError = playerState === "error";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-white">
      {/* Album art */}
      <div className={`relative ${isPulsing ? "animate-pulse-subtle" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkUrl}
          alt={title}
          width={280}
          height={280}
          className="rounded-3xl shadow-2xl"
        />
        {isPulsing && (
          <div className="absolute inset-0 rounded-3xl ring-4 ring-white/20 animate-ping-slow" />
        )}
      </div>

      {/* Track info */}
      <div className="text-center">
        {caption && (
          <p className="text-white/70 text-sm mb-1 italic">&ldquo;{caption}&rdquo;</p>
        )}
        <p className="font-semibold text-lg leading-tight">{title}</p>
        <p className="text-white/60">{artist}</p>
      </div>

      {/* Play / state button */}
      {showError ? (
        <p className="text-red-400 text-sm">
          This clip is unavailable.
        </p>
      ) : playerState === "suspended" ? (
        <button
          type="button"
          onClick={handlePlay}
          className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl active:scale-90 transition"
        >
          ▶
        </button>
      ) : playerState === "playing" ? (
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <div className="flex gap-1 items-end h-8">
            {[1,2,3,4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-white rounded-full animate-eq"
                style={{ animationDelay: `${i * 0.1}s`, height: `${8 + i * 6}px` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePlay}
          disabled={showSpinner && playerState === "prefetching"}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition disabled:opacity-50"
          aria-label="Play"
        >
          {showSpinner ? (
            <div className="w-8 h-8 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <span className="text-black text-4xl ml-1">▶</span>
          )}
        </button>
      )}

      <p className="text-white/30 text-xs">
        {playerState === "playing" ? "looping" : playerState === "prefetching" ? "loading..." : "tap to play"}
      </p>

      <p className="text-white/20 text-xs">
        sent with{" "}
        <a
          href="/"
          className="underline hover:text-white/40 transition"
        >
          gif.spencerstiles.com
        </a>
      </p>
    </div>
  );
}
