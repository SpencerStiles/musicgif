import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareButton from "@/components/ShareButton";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.share
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it("renders share button", () => {
    render(<ShareButton url="https://example.com/c/test" title="Test Song" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls navigator.share when available", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    render(<ShareButton url="https://example.com/c/test" title="Test Song" />);
    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        url: "https://example.com/c/test",
        title: "Test Song",
      });
    });
  });

  it("falls back to clipboard when navigator.share is not available", async () => {
    render(<ShareButton url="https://example.com/c/test" title="Test Song" />);
    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.com/c/test"
      );
    });
  });

  it("is disabled when disabled prop is true", () => {
    render(
      <ShareButton url="https://example.com/c/test" title="Test Song" disabled />
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
