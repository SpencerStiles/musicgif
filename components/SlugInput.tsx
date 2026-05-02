"use client";

import { useState, useEffect } from "react";
import { validateSlug } from "@/lib/slug";

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  takenSuggestion?: string; // e.g. "the-best-part-2" from server
}

export default function SlugInput({ value, onChange, takenSuggestion }: SlugInputProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setError(null);
      return;
    }
    setError(validateSlug(value));
  }, [value]);

  return (
    <div className="space-y-1">
      <label className="text-white/60 text-sm">
        Custom URL <span className="text-white/30">(optional)</span>
      </label>

      <div className="flex items-center rounded-xl bg-white/10 border border-white/20 overflow-hidden focus-within:border-white/50 transition">
        <span className="px-3 text-white/40 text-sm select-none whitespace-nowrap">
          gif.spencerstiles.com/c/
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="the-best-part"
          maxLength={30}
          className="flex-1 bg-transparent py-2 pr-3 text-white placeholder-white/30 text-sm focus:outline-none min-w-0"
        />
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {takenSuggestion && !error && (
        <div className="flex items-center gap-2">
          <p className="text-amber-400 text-xs">
            That slug is taken. Use{" "}
            <button
              type="button"
              className="underline font-medium"
              onClick={() => onChange(takenSuggestion)}
            >
              {takenSuggestion}
            </button>{" "}
            instead?
          </p>
        </div>
      )}
    </div>
  );
}
