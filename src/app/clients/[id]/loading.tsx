export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-cream border-b border-stone">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-5 w-14 bg-stone rounded animate-pulse" />
            <div className="h-6 w-44 bg-stone rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-56 bg-stone rounded-lg animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Client info card skeleton */}
        <div className="bg-cream border border-stone rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="h-7 w-56 bg-stone rounded animate-pulse mb-2" />
              <div className="h-4 w-72 bg-stone rounded animate-pulse" />
            </div>
            <div className="h-7 w-24 bg-stone rounded-full animate-pulse" />
          </div>
          <div className="pt-6 border-t border-stone-lighter">
            <div className="hidden md:grid grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-stone rounded animate-pulse mb-2" />
                  <div className="h-8 w-32 bg-stone rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories table skeleton */}
        <div className="mb-6">
          <div className="h-6 w-40 bg-stone rounded animate-pulse mb-4" />
          <div className="bg-cream border border-stone rounded-lg overflow-hidden">
            <div className="bg-ivory px-4 py-3 border-b border-stone">
              <div className="flex gap-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 w-20 bg-stone rounded animate-pulse" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-stone-lighter">
                <div className="flex items-center gap-8">
                  <div className="h-4 w-28 bg-stone rounded animate-pulse" />
                  <div className="h-4 w-20 bg-stone rounded animate-pulse" />
                  <div className="h-4 w-16 bg-stone rounded animate-pulse" />
                  <div className="h-4 w-20 bg-stone rounded animate-pulse" />
                  <div className="h-4 w-20 bg-stone rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
