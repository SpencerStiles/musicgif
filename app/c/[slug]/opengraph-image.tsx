import { ImageResponse } from "next/og";
import { getClip } from "@/lib/kv";

export const alt = "musicgif clip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const clip = await getClip(slug);

  if (!clip) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        🎵 musicgif
      </div>,
      { ...size }
    );
  }

  const caption = clip.caption || clip.title;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)",
        display: "flex",
        alignItems: "center",
        padding: "60px",
        gap: "48px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Album art */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clip.artworkUrl}
        width={400}
        height={400}
        style={{ borderRadius: 24, flexShrink: 0 }}
        alt={clip.title}
      />

      {/* Text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          color: "white",
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 18,
            opacity: 0.6,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          🎵 musicgif
        </div>

        {clip.caption && (
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            &ldquo;{clip.caption}&rdquo;
          </div>
        )}

        <div style={{ fontSize: clip.caption ? 32 : 52, fontWeight: clip.caption ? 400 : 700 }}>
          {clip.title}
        </div>

        <div style={{ fontSize: 28, opacity: 0.7 }}>{clip.artist}</div>

        <div
          style={{
            marginTop: "auto",
            fontSize: 20,
            opacity: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ▶ Tap to listen · {Math.round(clip.durationMs / 1000)}s clip
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
