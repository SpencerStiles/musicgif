interface TipJarLinkProps {
  variant?: "primary" | "footer";
}

// Renders a Ko-fi tip link. Only shows if NEXT_PUBLIC_KOFI_USERNAME is set.
// Two visual styles:
//  - "primary": prominent button (used on share-success screen)
//  - "footer": subtle text link (used on recipient page footer)
//
// Ko-fi was chosen over Buy Me a Coffee because Ko-fi takes 0% platform fee
// on tips on the free tier (BMaC takes 5%).
export default function TipJarLink({ variant = "primary" }: TipJarLinkProps) {
  const username = process.env.NEXT_PUBLIC_KOFI_USERNAME;
  if (!username) return null;

  const url = `https://ko-fi.com/${username}`;

  if (variant === "footer") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/40 hover:text-white/70 text-xs transition"
      >
        ☕ tip the maker
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 px-5 py-3 text-black font-semibold text-sm transition shadow-lg"
    >
      ☕ Like this? Buy me a coffee
    </a>
  );
}
