// Server-only: imports Redis via lib/kv
import { slugExists } from "./kv";

/** Atomically claim a slug, retrying with suffixes on collision. */
export async function claimSlug(
  preferred: string | undefined,
  fallback: string
): Promise<{ slug: string; taken: boolean }> {
  const base = preferred?.toLowerCase().trim() || fallback;

  const exactAvailable = !(await slugExists(base));
  if (exactAvailable) {
    return { slug: base, taken: false };
  }

  for (let i = 2; i <= 6; i++) {
    const candidate = `${base}-${i}`;
    if (!(await slugExists(candidate))) {
      return { slug: candidate, taken: true };
    }
  }

  return { slug: fallback, taken: true };
}
