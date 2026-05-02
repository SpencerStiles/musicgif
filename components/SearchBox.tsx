"use client";

import { useState, useRef, useCallback } from "react";
import { ItunesTrack, artworkUrl } from "@/lib/itunes";

interface SearchBoxProps {
  onSelect: (track: ItunesTrack) => void;
}

type State =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "results"; tracks: ItunesTrack[] }
  | { kind: "no-results" }
  | { kind: "error"; message: string };

export default function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "empty" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setState({ kind: "empty" });
      return;
    }

    setState({ kind: "loading" });

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const { tracks } = await res.json();

      if (!tracks || tracks.length === 0) {
        setState({ kind: "no-results" });
      } else {
        setState({ kind: "results", tracks });
      }
    } catch {
      setState({ kind: "error", message: "Search unavailable, try again" });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  return (
    <div className="w-full">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder="Search for a song..."
        className="w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/50 text-lg focus:outline-none focus:border-white/50 transition"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <div className="mt-3">
        {state.kind === "empty" && (
          <p className="text-center text-white/40 text-sm py-6">
            Type a song name to search
          </p>
        )}

        {state.kind === "loading" && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {state.kind === "no-results" && (
          <p className="text-center text-white/50 text-sm py-6">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}

        {state.kind === "error" && (
          <p className="text-center text-red-400 text-sm py-6">
            {state.message}
          </p>
        )}

        {state.kind === "results" && (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {state.tracks.map((track) => (
              <li key={track.trackId}>
                <button
                  type="button"
                  onClick={() => onSelect(track)}
                  className="w-full flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 p-3 text-left transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artworkUrl(track.artworkUrl100, 60)}
                    alt={track.trackName}
                    width={48}
                    height={48}
                    className="rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {track.trackName}
                    </p>
                    <p className="text-white/60 text-sm truncate">
                      {track.artistName}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
