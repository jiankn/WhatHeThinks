import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-20 pb-10 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">This page went quiet.</h1>
      <p className="mt-3 text-muted">We couldn&apos;t find what you were looking for.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-secondary">
          Home
        </Link>
        <Link href="/analyze" className="btn-primary">
          Analyze a chat
        </Link>
      </div>
    </main>
  );
}
