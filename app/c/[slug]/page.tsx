import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import { getClip } from "@/lib/kv";
import Player from "@/components/Player";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clip = await getClip(slug);
  if (!clip) return {};

  // Build absolute URLs from the request host. Required because Discord,
  // Twitter/X, etc. fetch our metadata server-side and can't resolve
  // relative paths in og:* / twitter:* tags.
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ??
    headersList.get("host") ??
    "gif.spencerstiles.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = `${protocol}://${host}`;

  const title = clip.caption || clip.title;
  const ogImageUrl = `${base}/c/${slug}/opengraph-image`;
  const embedUrl = `${base}/c/${slug}/embed`;
  // audioBlobUrl is stored as a relative path; make it absolute too
  const audioUrl = clip.audioBlobUrl.startsWith("http")
    ? clip.audioBlobUrl
    : `${base}${clip.audioBlobUrl}`;

  return {
    metadataBase: new URL(base),
    title: `${title} — musicgif`,
    description: `${clip.title} by ${clip.artist}`,
    openGraph: {
      title,
      description: `${clip.title} by ${clip.artist}`,
      url: `${base}/c/${slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      audio: [{ url: audioUrl, type: "audio/mp4" }],
    },
    twitter: {
      card: "player",
      title,
      description: `${clip.title} by ${clip.artist}`,
      images: [ogImageUrl],
      players: [
        {
          playerUrl: embedUrl,
          streamUrl: audioUrl,
          width: 480,
          height: 320,
        },
      ],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ClipPage({ params }: Props) {
  const { slug } = await params;
  const clip = await getClip(slug);

  if (!clip) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-indigo-950 to-black flex flex-col items-center justify-center px-4 py-10">
      <Player
        audioBlobUrl={clip.audioBlobUrl}
        startMs={clip.startMs}
        durationMs={clip.durationMs}
        artworkUrl={clip.artworkUrl}
        title={clip.title}
        artist={clip.artist}
        caption={clip.caption}
      />
    </main>
  );
}
