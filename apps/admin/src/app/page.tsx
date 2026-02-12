import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">ServiceOS</h1>
      <p className="text-muted-foreground text-lg">
        All-in-one platform for service providers
      </p>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
