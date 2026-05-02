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

// Format seconds to "M:SS"
function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Trimmer({ previewUrl, onTrimChange }: TrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(30); // seconds, populated from wavesurfer
  const [startPct, setStartPct] = useState(0.2);
  const [endPct, setEndPct] = useState(0.4);

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
        cursorColor: "rgba(255,255,255,0.6)",
        cursorWidth: 1,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        url: proxyUrl,
      }) as unknown as WS;

      ws.on("ready", () => {
        if (!mounted) return;
        setLoading(false);
        const dur = ws.getDuration();
        setDuration(dur);
        const durMs = dur * 1000;
        onTrimChange(
          Math.round(durMs * startPctRef.current),
          Math.round(durMs * (endPctRef.current - startPctRef.current))
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

      ws.on("audioprocess", () => {
        const dur = ws.getDuration();
        if (!dur) return;
        const endSec = endPctRef.current * dur;
        if (ws.getCurrentTime() >= endSec) {
          ws.setTime(startPctRef.current * dur);
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

  // Push trim changes upstream whenever bounds change
  useEffect(() => {
    if (loading) return;
    const durMs = duration * 1000;
    onTrimChange(
      Math.round(durMs * startPct),
      Math.round(durMs * (endPct - startPct))
    );
  }, [startPct, endPct, duration, loading, onTrimChange]);

  const handlePlay = async () => {
    const ws = wsRef.current;
    if (!ws) return;
    if (playing) {
      ws.pause();
      return;
    }
    ws.setTime(duration * startPct);
    await ws.play();
  };

  // Min trim duration: 1 second; min/max bounds: leave room for the other handle
  const minGapPct = duration > 0 ? Math.min(0.5, 1 / duration) : 0.05;

  const startSec = duration * startPct;
  const endSec = duration * endPct;
  const clipSec = endSec - startSec;

  if (error) {
    return <p className="text-red-400 text-sm text-center py-4">{error}</p>;
  }

  return (
    <div className="w-full space-y-4">
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <div className={loading ? "opacity-0 h-0 overflow-hidden" : ""}>
        {/* Waveform with overlay showing trim region */}
        <div className="relative">
          <div ref={containerRef} />

          {/* Highlighted trim region overlay */}
          {!loading && (
            <>
              {/* Dim outside-trim areas */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none rounded-l"
                style={{ width: `${startPct * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none rounded-r"
                style={{ width: `${(1 - endPct) * 100}%` }}
              />

              {/* Trim window borders */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-r-2 border-white/80 pointer-events-none"
                style={{
                  left: `${startPct * 100}%`,
                  width: `${(endPct - startPct) * 100}%`,
                }}
              />

              {/* Start/end timestamp labels above the trim handles */}
              <div
                className="absolute -top-5 text-xs font-medium text-white pointer-events-none whitespace-nowrap"
                style={{ left: `${startPct * 100}%`, transform: "translateX(-50%)" }}
              >
                {fmt(startSec)}
              </div>
              <div
                className="absolute -top-5 text-xs font-medium text-white pointer-events-none whitespace-nowrap"
                style={{ left: `${endPct * 100}%`, transform: "translateX(-50%)" }}
              >
                {fmt(endSec)}
              </div>
            </>
          )}
        </div>

        {/* Timeline ruler underneath the waveform */}
        {!loading && (
          <div className="relative h-3 mt-1">
            <div className="absolute left-0 text-[10px] text-white/40">0:00</div>
            <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-white/40">
              {fmt(duration / 2)}
            </div>
            <div className="absolute right-0 text-[10px] text-white/40">
              {fmt(duration)}
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <>
          {/* Sliders for fine adjustment */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span>Start</span>
                <span className="font-mono text-white">{fmt(startSec)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1 - minGapPct}
                step={0.005}
                value={startPct}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v < endPct - minGapPct) setStartPct(v);
                }}
                className="w-full accent-white"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span>End</span>
                <span className="font-mono text-white">{fmt(endSec)}</span>
              </div>
              <input
                type="range"
                min={minGapPct}
                max={1}
                step={0.005}
                value={endPct}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > startPct + minGapPct) setEndPct(v);
                }}
                className="w-full accent-white"
              />
            </div>
          </div>

          {/* Preview button + clip duration */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-white text-sm font-medium transition"
            >
              {playing ? "⏸ Pause" : "▶ Preview clip"}
            </button>
            <span className="text-white font-mono text-sm">
              {clipSec.toFixed(1)}s clip
            </span>
          </div>
        </>
      )}
    </div>
  );
}
