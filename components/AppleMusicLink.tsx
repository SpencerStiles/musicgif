interface AppleMusicLinkProps {
  trackTitle: string;
  artistName: string;
}

// Renders an "Open in Apple Music" affiliate button on the recipient clip page.
// Only renders if NEXT_PUBLIC_APPLE_AFFILIATE_TOKEN is set, so the button is
// hidden until you've signed up for Apple Performance Partners and added the
// token to env. Search URL is used (no album ID needed) — Apple Music resolves
// the search term cleanly.
export default function AppleMusicLink({ trackTitle, artistName }: AppleMusicLinkProps) {
  const token = process.env.NEXT_PUBLIC_APPLE_AFFILIATE_TOKEN;
  if (!token) return null;

  const term = encodeURIComponent(`${trackTitle} ${artistName}`);
  const url = `https://music.apple.com/search?term=${term}&at=${token}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl bg-pink-500/90 hover:bg-pink-500 active:scale-95 px-5 py-3 text-white font-semibold text-sm transition shadow-lg"
    >
       Open full song in Apple Music
    </a>
  );
}
