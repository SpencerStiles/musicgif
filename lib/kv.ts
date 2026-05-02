import { kv } from "@vercel/kv";

export const CLIP_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

export interface Clip {
  slug: string;
  trackId: number;
  audioBlobUrl: string;
  startMs: number;
  durationMs: number;
  caption: string;
  title: string;
  artist: string;
  artworkUrl: string;
  createdAt: string;
}

export async function getClip(slug: string): Promise<Clip | null> {
  return kv.get<Clip>(`clip:${slug}`);
}

export async function createClip(clip: Clip): Promise<boolean> {
  // Atomic: only write if slug doesn't exist
  const result = await kv.set(`clip:${clip.slug}`, clip, {
    nx: true,
    ex: CLIP_TTL_SECONDS,
  });
  return result === "OK";
}

export async function slugExists(slug: string): Promise<boolean> {
  return (await kv.exists(`clip:${slug}`)) === 1;
}
