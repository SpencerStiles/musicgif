"use client";

import { useEffect, useRef, useState } from "react";

interface TrimmerProps {
  previewUrl: string;
  onTrimChange: (startMs: number, durationMs: number) => void;
}

// We load wavesurfer dynamically since it's browser-only
export default function Trimmer({ previewUrl, onTrimChange }: TrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startPct, setStartPct] = useState(0.2);
  const [endPct, setEndPct] = useState(0.4);

  // Load wavesurfer.js dynamically (browser-only)
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
      });

      ws.on("ready", () => {
        if (!mounted) return;
        setLoading(false);
        // Emit initial trim (20% to 40% of 30s = 6s to 12s)
        const duration = ws.getDuration() * 1000;
        onTrimChange(
          Math.round(duration * startPct),
          Math.round(duration * (endPct - startPct))
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

      wsRef.current = ws;
    });

    return () => {
      mounted = false;
      if (wsRef.current) {
        (wsRef.current as { destroy: () => void }).destroy();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // Update trim when handles change
  useEffect(() => {
    const ws = wsRef.current as { getDuration?: () => number } | null;
    if (!ws?.getDuration) return;
    const duration = ws.getDuration() * 1000;
    onTrimChange(
      Math.round(duration * startPct),
      Math.round(duration * (endPct - startPct))
    );
  }, [startPct, endPct, onTrimChange]);

  const handlePlay = () => {
    const ws = wsRef.current as {
      play?: () => void;
      pause?: () => void;
      setTime?: (t: number) => void;
      getDuration?: () => number;
    } | null;
    if (!ws) return;
    if (playing) {
      ws.pause?.();
    } else {
      const duration = ws.getDuration?.() ?? 30;
      ws.setTime?.(duration * startPct);
      ws.play?.();
    }
  };

  if (error) {
    return (
      <p className="text-red-400 text-sm text-center py-4">{error}</p>
    );
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
          {/* Trim range sliders */}
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
