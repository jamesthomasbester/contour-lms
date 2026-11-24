import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Contour LMS</h1>
      <p className="max-w-md text-muted-foreground">
        Book, reschedule and keep track of your consultations.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to my consultations</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    </main>
  );
}
