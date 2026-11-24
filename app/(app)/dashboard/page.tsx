import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConsultationList } from "@/components/consultation-list";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { listOwnConsultations } from "@/lib/consultations";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My consultations</h1>
        <Button asChild>
          <Link href="/consultations/new">Book a consultation</Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <Consultations />
      </Suspense>
    </div>
  );
}

async function Consultations() {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) redirect("/auth/login");

  const consultations = await listOwnConsultations(supabase, userId);
  return <ConsultationList consultations={consultations} />;
}
