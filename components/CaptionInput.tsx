"use client";

interface CaptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CaptionInput({ value, onChange }: CaptionInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-white/60 text-sm">
        Caption <span className="text-white/30">(shows on link preview)</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 140))}
        placeholder="the part where she goes 🤩"
        className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/50 transition"
      />
      {value.length > 100 && (
        <p className="text-white/40 text-xs text-right">
          {140 - value.length} chars left
        </p>
      )}
    </div>
  );
}
