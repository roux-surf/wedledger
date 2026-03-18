import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-stone mb-4">404</p>
        <h2 className="text-xl font-semibold text-charcoal mb-2">Page not found</h2>
        <p className="text-sm text-warm-gray mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-charcoal text-white text-sm font-medium rounded-lg hover:bg-charcoal-dark transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
