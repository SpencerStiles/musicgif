export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

interface ItunesSearchResult {
  resultCount: number;
  results: Array<{
    kind?: string;
    trackId?: number;
    trackName?: string;
    artistName?: string;
    artworkUrl100?: string;
    previewUrl?: string;
  }>;
}

export async function searchTracks(query: string): Promise<ItunesTrack[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`iTunes search failed: ${res.status}`);
  }

  const data: ItunesSearchResult = await res.json();

  return data.results.filter(
    (r): r is ItunesTrack =>
      r.kind === "song" &&
      typeof r.trackId === "number" &&
      typeof r.trackName === "string" &&
      typeof r.artistName === "string" &&
      typeof r.artworkUrl100 === "string" &&
      typeof r.previewUrl === "string" &&
      r.previewUrl.length > 0
  ) as ItunesTrack[];
}

export async function lookupTrack(trackId: number): Promise<ItunesTrack | null> {
  const url = `https://itunes.apple.com/lookup?id=${trackId}&entity=song`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) return null;

  const data: ItunesSearchResult = await res.json();
  const track = data.results[0];

  if (!track?.previewUrl || !track.trackId) return null;

  return {
    trackId: track.trackId,
    trackName: track.trackName ?? "Unknown",
    artistName: track.artistName ?? "Unknown",
    artworkUrl100: track.artworkUrl100 ?? "",
    previewUrl: track.previewUrl,
  };
}

export function artworkUrl(url: string, size = 300): string {
  return url.replace("100x100bb", `${size}x${size}bb`);
}
