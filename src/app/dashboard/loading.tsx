export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="h-7 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-100 rounded-full animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
