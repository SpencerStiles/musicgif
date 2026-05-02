import { NextRequest, NextResponse } from "next/server";

// CORS-friendly audio proxy — used only by sender's wavesurfer.js trim UI.
// Recipient page reads directly from Vercel Blob CDN, not this route.

export async function GET(req: NextRequest) {
  const previewUrl = req.nextUrl.searchParams.get("url");

  if (!previewUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only proxy Apple CDN preview URLs
  if (!previewUrl.startsWith("https://audio-ssl.itunes.apple.com/") &&
      !previewUrl.startsWith("https://a1.mzstatic.com/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const rangeHeader = req.headers.get("range");

  const upstream = await fetch(previewUrl, {
    headers: rangeHeader ? { Range: rangeHeader } : {},
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: upstream.status }
    );
  }

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD");
  headers.set("Access-Control-Allow-Headers", "Range");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
    },
  });
}
