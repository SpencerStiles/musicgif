import { NextRequest, NextResponse } from "next/server";

// CORS-friendly audio proxy for sender's wavesurfer.js trim UI AND recipient playback.
// We buffer the upstream response into an ArrayBuffer rather than streaming via
// `upstream.body`, because returning a ReadableStream from a serverless function
// on Vercel is unreliable (response can hang or arrive empty).
// See: https://github.com/vercel/next.js/issues/38736
//      https://github.com/vercel/next.js/discussions/50614

export async function GET(req: NextRequest) {
  const previewUrl = req.nextUrl.searchParams.get("url");

  if (!previewUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Whitelist Apple CDN hostnames
  if (
    !previewUrl.startsWith("https://audio-ssl.itunes.apple.com/") &&
    !previewUrl.startsWith("https://a1.mzstatic.com/")
  ) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const rangeHeader = req.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(previewUrl, {
      cache: "no-store",
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });
  } catch (err) {
    console.error("Audio proxy upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 }
    );
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: "Upstream returned " + upstream.status },
      { status: upstream.status }
    );
  }

  // Buffer the entire response into memory rather than streaming.
  let buffer: ArrayBuffer;
  try {
    buffer = await upstream.arrayBuffer();
  } catch (err) {
    console.error("Audio proxy arrayBuffer failed:", err);
    return NextResponse.json(
      { error: "Upstream read failed" },
      { status: 502 }
    );
  }

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD");
  headers.set("Access-Control-Allow-Headers", "Range");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Length", String(buffer.byteLength));

  const contentType = upstream.headers.get("content-type") ?? "audio/mp4";
  headers.set("Content-Type", contentType);

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(buffer, {
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
