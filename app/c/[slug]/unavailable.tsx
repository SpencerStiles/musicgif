export default function UnavailablePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-indigo-950 to-black flex flex-col items-center justify-center px-4 py-10 text-white text-center gap-4">
      <div className="w-48 h-48 rounded-3xl bg-white/10 flex items-center justify-center text-5xl">
        🎵
      </div>
      <p className="text-xl font-semibold">This clip is unavailable</p>
      <p className="text-white/50 text-sm max-w-xs">
        This song may have been removed from the catalog. Try searching for it again.
      </p>
      <a
        href="/"
        className="mt-4 rounded-2xl bg-white/10 hover:bg-white/20 px-6 py-3 text-white font-medium transition"
      >
        Search for another song
      </a>
    </main>
  );
}
