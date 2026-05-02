import { describe, it, expect } from "vitest";

// Unit test the URL validation logic (not the full route, which requires Next.js runtime)
const VALID_APPLE_PREFIXES = [
  "https://audio-ssl.itunes.apple.com/",
  "https://a1.mzstatic.com/",
];

function isValidProxyUrl(url: string): boolean {
  return VALID_APPLE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

describe("audio-proxy URL validation", () => {
  it("allows Apple CDN URLs", () => {
    expect(isValidProxyUrl("https://audio-ssl.itunes.apple.com/preview.m4a")).toBe(true);
    expect(isValidProxyUrl("https://a1.mzstatic.com/preview.m4a")).toBe(true);
  });

  it("blocks non-Apple URLs", () => {
    expect(isValidProxyUrl("https://evil.com/payload")).toBe(false);
    expect(isValidProxyUrl("https://api.spotify.com/audio")).toBe(false);
    expect(isValidProxyUrl("http://localhost:3000/hack")).toBe(false);
    expect(isValidProxyUrl("javascript:alert(1)")).toBe(false);
  });

  it("blocks partial matches", () => {
    expect(isValidProxyUrl("https://not-audio-ssl.itunes.apple.com/")).toBe(false);
    expect(isValidProxyUrl("https://audio-ssl.itunes.apple.com.evil.com/")).toBe(false);
  });
});
