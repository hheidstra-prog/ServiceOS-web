import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          ServiceOS
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Professional services platform for European businesses
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="https://app.serviceos.app"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Go to Dashboard
          </Link>
          <Link
            href="https://serviceos.app"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}
