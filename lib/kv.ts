import { redis } from "./redis";

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
  const r = await redis();
  const val = await r.get(`clip:${slug}`);
  if (!val) return null;
  return JSON.parse(val) as Clip;
}

export async function createClip(clip: Clip): Promise<boolean> {
  const r = await redis();
  const result = await r.set(`clip:${clip.slug}`, JSON.stringify(clip), {
    NX: true,
    EX: CLIP_TTL_SECONDS,
  });
  return result === "OK";
}

export async function slugExists(slug: string): Promise<boolean> {
  const r = await redis();
  return (await r.exists(`clip:${slug}`)) === 1;
}
