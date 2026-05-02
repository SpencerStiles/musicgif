import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the filtering logic in the iTunes client directly
import { searchTracks } from "@/lib/itunes";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const makeTrack = (overrides = {}) => ({
  kind: "song",
  trackId: 123,
  trackName: "Test Song",
  artistName: "Test Artist",
  artworkUrl100: "https://example.com/art100.jpg",
  previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
  ...overrides,
});

describe("searchTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tracks with previewUrl", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 1,
        results: [makeTrack()],
      }),
    });

    const tracks = await searchTracks("test");
    expect(tracks).toHaveLength(1);
    expect(tracks[0].trackId).toBe(123);
  });

  it("filters out tracks without previewUrl", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 2,
        results: [
          makeTrack({ trackId: 1, previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a" }),
          makeTrack({ trackId: 2, previewUrl: "" }), // empty
          makeTrack({ trackId: 3, previewUrl: undefined }), // missing
        ],
      }),
    });

    const tracks = await searchTracks("test");
    expect(tracks).toHaveLength(1);
    expect(tracks[0].trackId).toBe(1);
  });

  it("filters out non-song kinds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        resultCount: 2,
        results: [
          makeTrack({ kind: "music-video" }),
          makeTrack({ kind: "song", trackId: 42 }),
        ],
      }),
    });

    const tracks = await searchTracks("test");
    expect(tracks).toHaveLength(1);
    expect(tracks[0].trackId).toBe(42);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(searchTracks("test")).rejects.toThrow();
  });
});
