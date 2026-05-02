import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/itunes";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const tracks = await searchTracks(q);
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json(
      { error: "Search unavailable, try again" },
      { status: 502 }
    );
  }
}
