import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getClip } from "@/lib/kv";
import Player from "@/components/Player";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clip = await getClip(slug);
  if (!clip) return {};

  const title = clip.caption || clip.title;
  const ogImageUrl = `/c/${slug}/opengraph-image`;
  const embedUrl = `/c/${slug}/embed`;
  const audioUrl = clip.audioBlobUrl;

  return {
    title: `${title} — musicgif`,
    description: `${clip.title} by ${clip.artist}`,
    openGraph: {
      title,
      description: `${clip.title} by ${clip.artist}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      audio: [{ url: audioUrl, type: "audio/mp4" }],
    },
    twitter: {
      // "player" card → Discord, Twitter/X, and other Twitter-card-aware
      // platforms render an iframe with our /embed page (inline audio player)
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
