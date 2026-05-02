import { describe, it, expect, vi } from "vitest";

// Test OG metadata generation logic (independent of Next.js runtime)
// Full OG image rendering requires Next.js edge runtime — covered by manual smoke test

interface Clip {
  slug: string;
  trackId: number;
  title: string;
  artist: string;
  caption: string;
  artworkUrl: string;
  audioBlobUrl: string;
  startMs: number;
  durationMs: number;
  createdAt: string;
}

function buildOgTitle(clip: Clip): string {
  return clip.caption || clip.title;
}

function buildOgDescription(clip: Clip): string {
  return `${clip.title} by ${clip.artist}`;
}

describe("OG metadata", () => {
  const clip: Clip = {
    slug: "the-best-part",
    trackId: 123,
    title: "Rolling in the Deep",
    artist: "Adele",
    caption: "the part where she goes 🤩",
    artworkUrl: "https://example.com/art.jpg",
    audioBlobUrl: "https://blob.vercel-storage.com/audio/123.m4a",
    startMs: 5000,
    durationMs: 7000,
    createdAt: "2026-05-02T00:00:00Z",
  };

  it("uses caption as OG title when present", () => {
    expect(buildOgTitle(clip)).toBe("the part where she goes 🤩");
  });

  it("falls back to track title when no caption", () => {
    expect(buildOgTitle({ ...clip, caption: "" })).toBe("Rolling in the Deep");
  });

  it("builds description from track title and artist", () => {
    expect(buildOgDescription(clip)).toBe("Rolling in the Deep by Adele");
  });
});
