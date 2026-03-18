import Link from 'next/link';

export default function ClientNotFound() {
  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-stone mb-4">404</p>
        <h2 className="text-xl font-semibold text-charcoal mb-2">Client not found</h2>
        <p className="text-sm text-warm-gray mb-6">This client doesn&apos;t exist or may have been deleted.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-dark transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
