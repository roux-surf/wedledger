export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-5 w-14 bg-slate-200 rounded animate-pulse" />
            <div className="h-6 w-44 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-56 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Client info card skeleton */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="h-7 w-56 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-7 w-24 bg-slate-200 rounded-full animate-pulse" />
          </div>
          <div className="pt-6 border-t border-slate-100">
            <div className="hidden md:grid grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories table skeleton */}
        <div className="mb-6">
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <div className="flex gap-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-8">
                  <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
