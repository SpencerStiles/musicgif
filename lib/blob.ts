import { put } from "@vercel/blob";

export async function storeAudio(
  trackId: number,
  previewUrl: string
): Promise<string> {
  const res = await fetch(previewUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio from Apple CDN: ${res.status}`);
  }

  const blob = await res.blob();
  const { url } = await put(`audio/${trackId}.m4a`, blob, {
    access: "public",
    contentType: "audio/mp4",
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  return url;
}
