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
  | "prefetching"    // fetching + decoding in background
  | "playing-muted"  // muted <audio> autoplaying (iOS fallback), waiting for unmute tap
  | "unmuting"       // user tapped unmute, resuming AudioContext
  | "playing"        // Web Audio playing with sound
  | "loading"        // user tapped before decode finished
  | "ready"          // decoded, autoplay blocked and no muted fallback, waiting for tap
  | "suspended"      // app backgrounded
  | "error";

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
  const mutedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const prefetch = async () => {
      try {
        const AudioCtx = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const res = await fetch(audioBlobUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        if (cancelled) return;

        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;

        bufRef.current = audioBuf;

        // Try autoplay with sound — works on Android Chrome from link navigation
        await ctx.resume();
        if (ctx.state === "running") {
          const started = playBuffer(ctx, audioBuf);
          if (started && !cancelled) {
            setPlayerState("playing");
            return;
          }
        }

        // Autoplay with sound blocked — try muted autoplay (always works on iOS)
        const muted = new Audio(audioBlobUrl);
        muted.muted = true;
        muted.loop = true;
        muted.setAttribute("playsinline", "");
        mutedAudioRef.current = muted;

        try {
          await muted.play();
          if (!cancelled) setPlayerState("playing-muted");
        } catch {
          // Even muted autoplay blocked (unusual) — show tap-to-play button
          if (!cancelled) setPlayerState("ready");
        }
      } catch {
        if (!cancelled) setPlayerState("error");
      }
    };

    prefetch();

    return () => {
      cancelled = true;
      mutedAudioRef.current?.pause();
    };
  }, [audioBlobUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause AudioContext when app is backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        ctxRef.current?.suspend();
        mutedAudioRef.current?.pause();
        if (playerState === "playing") setPlayerState("suspended");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [playerState]);

  function playBuffer(ctx: AudioContext, buf: AudioBuffer): boolean {
    try {
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
      return true;
    } catch {
      return false;
    }
  }

  const handleTap = async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (playerState === "suspended") {
      await ctx.resume();
      setPlayerState("playing");
      return;
    }

    if (playerState === "playing-muted") {
      // User tapping to unmute — this gesture lets us resume AudioContext on iOS
      setPlayerState("unmuting");
      mutedAudioRef.current?.pause();

      await ctx.resume();
      const buf = bufRef.current;
      if (buf) {
        playBuffer(ctx, buf);
        setPlayerState("playing");
      }
      return;
    }

    if (playerState === "prefetching") {
      setPlayerState("loading");
      const poll = setInterval(async () => {
        if (bufRef.current) {
          clearInterval(poll);
          await ctx.resume();
          playBuffer(ctx, bufRef.current);
          setPlayerState("playing");
        }
      }, 100);
      return;
    }

    if (playerState === "ready") {
      await ctx.resume();
      const buf = bufRef.current;
      if (buf) {
        playBuffer(ctx, buf);
        setPlayerState("playing");
      }
    }
  };

  const isPlaying = playerState === "playing";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto text-white">
      {/* Album art with pulse when playing */}
      <div className={`relative ${isPlaying ? "animate-pulse-subtle" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artworkUrl}
          alt={title}
          width={280}
          height={280}
          className="rounded-3xl shadow-2xl"
        />
        {isPlaying && (
          <div className="absolute inset-0 rounded-3xl ring-4 ring-white/20 animate-ping-slow" />
        )}

        {/* Unmute overlay — sits on top of artwork when muted autoplay is active */}
        {playerState === "playing-muted" && (
          <button
            type="button"
            onClick={handleTap}
            className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm active:bg-black/60 transition"
          >
            <span className="text-4xl">🔇</span>
            <span className="text-white font-semibold text-sm">Tap to unmute</span>
          </button>
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

      {/* Bottom control — hidden when unmute overlay is shown on artwork */}
      {playerState === "error" ? (
        <p className="text-red-400 text-sm">This clip is unavailable.</p>

      ) : playerState === "playing" ? (
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <div className="flex gap-1 items-end h-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-white rounded-full animate-eq"
                style={{ animationDelay: `${i * 0.1}s`, height: `${8 + i * 6}px` }}
              />
            ))}
          </div>
        </div>

      ) : playerState === "suspended" ? (
        <button
          type="button"
          onClick={handleTap}
          className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl active:scale-90 transition"
        >
          ▶
        </button>

      ) : playerState === "playing-muted" || playerState === "unmuting" ? (
        // Unmute overlay on artwork handles the tap; show EQ bars to signal something is playing
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center opacity-50">
          <div className="flex gap-1 items-end h-8">
            {[1, 2, 3, 4].map((i) => (
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
          onClick={handleTap}
          disabled={playerState === "prefetching"}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition disabled:opacity-40"
          aria-label="Play"
        >
          {playerState === "prefetching" || playerState === "loading" ? (
            <div className="w-8 h-8 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <span className="text-black text-4xl ml-1">▶</span>
          )}
        </button>
      )}

      <p className="text-white/30 text-xs">
        {isPlaying ? "looping" :
         playerState === "playing-muted" ? "muted • tap artwork to unmute" :
         playerState === "prefetching" ? "loading..." :
         "tap to play"}
      </p>

      <p className="text-white/20 text-xs">
        sent with{" "}
        <a href="/" className="underline hover:text-white/40 transition">
          gif.spencerstiles.com
        </a>
      </p>
    </div>
  );
}
