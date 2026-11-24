import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export function SiteHeader() {
  return (
    <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
      <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            Contour LMS
          </Link>
          <Link href="/dashboard" className="hover:underline">
            My consultations
          </Link>
          <Link href="/consultations/new" className="hover:underline">
            Book
          </Link>
          <Suspense>
            <AdminLink />
          </Suspense>
        </div>
        <Suspense>
          <AuthButton />
        </Suspense>
      </div>
    </nav>
  );
}

// Only shown to admins. The admin page checks the role again on its own.
async function AdminLink() {
  const { supabase, userId } = await getCurrentUser();
  if (!userId || !(await isAdmin(supabase, userId))) return null;

  return (
    <Link href="/admin" className="hover:underline">
      Admin
    </Link>
  );
}
