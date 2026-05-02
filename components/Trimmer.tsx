"use client";

import { useEffect, useRef, useState } from "react";

interface TrimmerProps {
  previewUrl: string;
  onTrimChange: (startMs: number, durationMs: number) => void;
}

type WS = {
  play: (start?: number, end?: number) => Promise<void>;
  pause: () => void;
  setTime: (t: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  destroy: () => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

export default function Trimmer({ previewUrl, onTrimChange }: TrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startPct, setStartPct] = useState(0.2);
  const [endPct, setEndPct] = useState(0.4);

  // Refs that the audioprocess callback can read without being recreated
  const startPctRef = useRef(startPct);
  const endPctRef = useRef(endPct);
  useEffect(() => { startPctRef.current = startPct; }, [startPct]);
  useEffect(() => { endPctRef.current = endPct; }, [endPct]);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(previewUrl)}`;

    import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (!mounted || !containerRef.current) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "rgba(255,255,255,0.3)",
        progressColor: "rgba(255,255,255,0.8)",
        cursorColor: "transparent",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 64,
        url: proxyUrl,
      }) as unknown as WS;

      ws.on("ready", () => {
        if (!mounted) return;
        setLoading(false);
        const duration = ws.getDuration() * 1000;
        onTrimChange(
          Math.round(duration * startPctRef.current),
          Math.round(duration * (endPctRef.current - startPctRef.current))
        );
      });

      ws.on("error", () => {
        if (!mounted) return;
        setError("Could not load audio preview");
        setLoading(false);
      });

      ws.on("play", () => mounted && setPlaying(true));
      ws.on("pause", () => mounted && setPlaying(false));
      ws.on("finish", () => mounted && setPlaying(false));

      // Loop preview within the trim window: when we cross the end,
      // seek back to the current start. This stays accurate even if the
      // user moves the trim handles while previewing.
      ws.on("audioprocess", () => {
        const duration = ws.getDuration();
        if (!duration) return;
        const endSec = endPctRef.current * duration;
        if (ws.getCurrentTime() >= endSec) {
          ws.setTime(startPctRef.current * duration);
        }
      });

      wsRef.current = ws;
    });

    return () => {
      mounted = false;
      wsRef.current?.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // Push trim changes upstream
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const duration = ws.getDuration() * 1000;
    if (!duration) return;
    onTrimChange(
      Math.round(duration * startPct),
      Math.round(duration * (endPct - startPct))
    );
  }, [startPct, endPct, onTrimChange]);

  const handlePlay = async () => {
    const ws = wsRef.current;
    if (!ws) return;
    if (playing) {
      ws.pause();
      return;
    }
    const duration = ws.getDuration();
    ws.setTime(duration * startPct);
    await ws.play();
  };

  if (error) {
    return <p className="text-red-400 text-sm text-center py-4">{error}</p>;
  }

  return (
    <div className="w-full space-y-3">
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <div
        ref={containerRef}
        className={loading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}
      />

      {!loading && (
        <>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>Start</span>
              <span>{Math.round(startPct * 30)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.01}
              value={startPct}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (v < endPct - 0.03) setStartPct(v);
              }}
              className="w-full accent-white"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>End</span>
              <span>{Math.round(endPct * 30)}s</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={endPct}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (v > startPct + 0.03) setEndPct(v);
              }}
              className="w-full accent-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-white text-sm font-medium transition"
            >
              {playing ? "⏸ Pause" : "▶ Preview clip"}
            </button>
            <span className="text-white/50 text-sm">
              {Math.round((endPct - startPct) * 30)}s clip
            </span>
          </div>
        </>
      )}
    </div>
  );
}
