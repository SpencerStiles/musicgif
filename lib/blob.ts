// Audio is served via /api/audio-proxy for both sender trim UI and recipient playback.
// This avoids Vercel Blob for now — revisit when traffic warrants it.

export function makeAudioUrl(previewUrl: string): string {
  return `/api/audio-proxy?url=${encodeURIComponent(previewUrl)}`;
}
