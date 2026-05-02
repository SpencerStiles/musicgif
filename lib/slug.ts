import { slugExists } from "./kv";

const SLUG_REGEX = /^[a-z0-9-]{3,30}$/;

// Reserved slugs that shouldn't be used (routes, brands, etc.)
const RESERVED = new Set([
  "api", "c", "clip", "admin", "health", "favicon", "robots",
  "sitemap", "apple", "spotify", "itunes", "google", "meta",
]);

// Basic profanity blocklist (expand as needed)
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

/** Atomically claim a slug, retrying with suffixes on collision. */
export async function claimSlug(
  preferred: string | undefined,
  fallback: string
): Promise<{ slug: string; taken: boolean }> {
  const base = preferred?.toLowerCase().trim() || fallback;

  // Try the exact slug first
  const exactAvailable = !(await slugExists(base));
  if (exactAvailable) {
    return { slug: base, taken: false };
  }

  // Try up to 5 suffixed variants
  for (let i = 2; i <= 6; i++) {
    const candidate = `${base}-${i}`;
    if (!(await slugExists(candidate))) {
      return { slug: candidate, taken: true };
    }
  }

  // Absolute fallback: random hash
  return { slug: fallback, taken: true };
}
