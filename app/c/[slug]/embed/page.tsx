import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getClip } from "@/lib/kv";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Minimal "embed" page meant to be rendered inside an iframe by platforms
// that respect Twitter Player Cards (Discord, Twitter/X, Slack, etc.).
// Just an HTML5 audio element with the trim-windowed source.
export default async function EmbedPage({ params }: Props) {
  const { slug } = await params;
  const clip = await getClip(slug);
  if (!clip) notFound();

  // Media-fragment URL: most browsers respect "#t=start,end" so the audio
  // element only plays the trim window.
  const startSec = (clip.startMs / 1000).toFixed(2);
  const endSec = ((clip.startMs + clip.durationMs) / 1000).toFixed(2);
  const audioSrc = `${clip.audioBlobUrl}#t=${startSec},${endSec}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 16,
        background:
          "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #000 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clip.artworkUrl}
        alt={clip.title}
        width={140}
        height={140}
        style={{ borderRadius: 16 }}
      />
      {clip.caption && (
        <div style={{ fontSize: 14, opacity: 0.8, fontStyle: "italic" }}>
          &ldquo;{clip.caption}&rdquo;
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{clip.title}</div>
        <div style={{ opacity: 0.7, fontSize: 14 }}>{clip.artist}</div>
      </div>
      <audio
        src={audioSrc}
        controls
        loop
        preload="auto"
        style={{ width: "100%", maxWidth: 320 }}
      />
    </div>
  );
}
