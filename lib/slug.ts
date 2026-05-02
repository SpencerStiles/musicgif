// Client-safe: no Node.js dependencies

const SLUG_REGEX = /^[a-z0-9-]{3,30}$/;

const RESERVED = new Set([
  "api", "c", "clip", "admin", "health", "favicon", "robots",
  "sitemap", "apple", "spotify", "itunes", "google", "meta",
]);

const BLOCKED = new Set([
  "fuck", "shit", "ass", "bitch", "damn", "crap",
]);

export function validateSlug(slug: string): string | null {
  const s = slug.toLowerCase().trim();
  if (!SLUG_REGEX.test(s)) {
    return "Slug must be 3-30 characters: lowercase letters, numbers, and hyphens only.";
  }
  if (RESERVED.has(s)) {
    return "That slug is reserved. Please choose another.";
  }
  for (const word of BLOCKED) {
    if (s.includes(word)) {
      return "That slug contains a blocked word. Please choose another.";
    }
  }
  return null;
}

export function generateFallbackSlug(): string {
  return Math.random().toString(36).slice(2, 8);
}
