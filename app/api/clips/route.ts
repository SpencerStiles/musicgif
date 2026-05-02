import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { createClip, getClip } from "@/lib/kv";
import { storeAudio } from "@/lib/blob";
import { lookupTrack } from "@/lib/itunes";
import { validateSlug, generateFallbackSlug } from "@/lib/slug";
import { claimSlug } from "@/lib/slug-server";
import { artworkUrl } from "@/lib/itunes";

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many clips created. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: {
    trackId: number;
    startMs: number;
    durationMs: number;
    caption?: string;
    slug?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { trackId, startMs, durationMs, caption = "", slug: preferredSlug } = body;

  if (!trackId || typeof startMs !== "number" || typeof durationMs !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (durationMs < 1000 || durationMs > 15000) {
    return NextResponse.json(
      { error: "Duration must be between 1 and 15 seconds" },
      { status: 400 }
    );
  }

  // Validate preferred slug if provided
  if (preferredSlug) {
    const slugError = validateSlug(preferredSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }
  }

  // Fresh iTunes lookup to get current previewUrl (handles URL rotation)
  const track = await lookupTrack(trackId);
  if (!track) {
    return NextResponse.json(
      { error: "Track not found or no preview available" },
      { status: 404 }
    );
  }

  // Fetch audio once and write to Vercel Blob (removes per-play function compute)
  let audioBlobUrl: string;
  try {
    audioBlobUrl = await storeAudio(trackId, track.previewUrl);
  } catch {
    return NextResponse.json(
      { error: "Failed to process audio. Try again." },
      { status: 502 }
    );
  }

  // Claim slug atomically
  const fallback = generateFallbackSlug();
  const { slug, taken } = await claimSlug(preferredSlug, fallback);

  const clip = {
    slug,
    trackId,
    audioBlobUrl,
    startMs,
    durationMs,
    caption: caption.slice(0, 140),
    title: track.trackName,
    artist: track.artistName,
    artworkUrl: artworkUrl(track.artworkUrl100, 600),
    createdAt: new Date().toISOString(),
  };

  const saved = await createClip(clip);
  if (!saved) {
    // Race: slug was claimed between claimSlug check and createClip
    const retrySlug = `${fallback}-2`;
    clip.slug = retrySlug;
    await createClip(clip);
  }

  return NextResponse.json({ slug: clip.slug, taken });
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const clip = await getClip(slug);
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  return NextResponse.json({ clip });
}
