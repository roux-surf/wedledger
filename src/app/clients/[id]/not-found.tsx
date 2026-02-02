import Link from 'next/link';

export default function ClientNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-slate-300 mb-4">404</p>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Client not found</h2>
        <p className="text-sm text-slate-600 mb-6">This client doesn&apos;t exist or may have been deleted.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
