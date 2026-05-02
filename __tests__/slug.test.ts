import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSlug } from "@/lib/slug";

// Mock kv to avoid needing Vercel KV in tests
vi.mock("@/lib/kv", () => ({
  slugExists: vi.fn(),
  getClip: vi.fn(),
  createClip: vi.fn(),
}));

import { claimSlug } from "@/lib/slug";
import { slugExists } from "@/lib/kv";

describe("validateSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateSlug("hello")).toBeNull();
    expect(validateSlug("the-best-part")).toBeNull();
    expect(validateSlug("abc")).toBeNull();
    expect(validateSlug("a1b2c3")).toBeNull();
  });

  it("rejects slugs that are too short", () => {
    expect(validateSlug("ab")).not.toBeNull();
    expect(validateSlug("a")).not.toBeNull();
  });

  it("rejects slugs that are too long", () => {
    expect(validateSlug("a".repeat(31))).not.toBeNull();
  });

  it("normalizes uppercase letters (so 'Hello' becomes 'hello' and passes)", () => {
    // validateSlug normalizes to lowercase before checking — the input UI also
    // enforces lowercase in the onChange handler. So "Hello" → null (valid).
    expect(validateSlug("Hello")).toBeNull();
  });

  it("rejects slugs with spaces", () => {
    expect(validateSlug("hello world")).not.toBeNull();
  });

  it("rejects slugs with special characters", () => {
    expect(validateSlug("hello@world")).not.toBeNull();
    expect(validateSlug("hello_world")).not.toBeNull();
  });

  it("rejects reserved words", () => {
    expect(validateSlug("api")).not.toBeNull();
    expect(validateSlug("admin")).not.toBeNull();
    expect(validateSlug("apple")).not.toBeNull();
  });

  it("rejects blocked profanity", () => {
    expect(validateSlug("fuckthis")).not.toBeNull();
    expect(validateSlug("bullshit")).not.toBeNull();
  });
});

describe("claimSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the exact slug when available", async () => {
    vi.mocked(slugExists).mockResolvedValue(false);
    const result = await claimSlug("my-slug", "fallback");
    expect(result.slug).toBe("my-slug");
    expect(result.taken).toBe(false);
  });

  it("returns the first available suffix on collision", async () => {
    vi.mocked(slugExists)
      .mockResolvedValueOnce(true)   // "my-slug" taken
      .mockResolvedValueOnce(false); // "my-slug-2" available
    const result = await claimSlug("my-slug", "fallback");
    expect(result.slug).toBe("my-slug-2");
    expect(result.taken).toBe(true);
  });

  it("falls back to random hash when all suffixes are taken", async () => {
    vi.mocked(slugExists).mockResolvedValue(true); // all taken
    const result = await claimSlug("my-slug", "abc123");
    expect(result.slug).toBe("abc123");
    expect(result.taken).toBe(true);
  });

  it("uses fallback when no preferred slug provided", async () => {
    vi.mocked(slugExists).mockResolvedValue(false);
    const result = await claimSlug(undefined, "randomhash");
    expect(result.slug).toBe("randomhash");
    expect(result.taken).toBe(false);
  });
});
