import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminConsultationRow } from "@/components/admin-consultation-row";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import {
  ADMIN_PAGE_SIZE,
  listAllConsultations,
  type Consultation,
} from "@/lib/consultations";
import { pageSchema } from "@/lib/validation";

type Props = { searchParams: Promise<{ page?: string }> };

export default function AdminPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminView searchParams={searchParams} />
    </Suspense>
  );
}

// The role check lives inside the Suspense boundary because it reads
// cookies. Students are redirected before anything below is rendered.
async function AdminView({ searchParams }: Props) {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) redirect("/auth/login");
  if (!(await isAdmin(supabase, userId))) redirect("/dashboard");

  const page = pageSchema.parse((await searchParams).page);
  const { consultations, total } = await listAllConsultations(supabase, page);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (page > pageCount) redirect(`/admin?page=${pageCount}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">All consultations</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of every consultation in the system.
        </p>
      </div>
      {consultations.length === 0 ? (
        <p className="text-muted-foreground">No consultations here.</p>
      ) : (
        <ConsultationTable consultations={consultations} />
      )}
      <Pagination page={page} pageCount={pageCount} total={total} />
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {pageCount} ({total} total)
      </p>
      <div className="flex gap-2">
        <PageLink page={page - 1} disabled={page <= 1}>
          Previous
        </PageLink>
        <PageLink page={page + 1} disabled={page >= pageCount}>
          Next
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/admin?page=${page}`}>{children}</Link>
    </Button>
  );
}

function ConsultationTable({
  consultations,
}: {
  consultations: Consultation[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      {/* Fixed column widths so long names or reasons can't stretch the
          table. Each row can be expanded to show them in full. */}
      <table className="w-full min-w-[900px] table-fixed text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="w-10 p-2">
              <span className="sr-only">Expand</span>
            </th>
            <th className="w-40 p-3 font-medium">Student</th>
            <th className="p-3 font-medium">Reason</th>
            <th className="w-44 p-3 font-medium">Scheduled for</th>
            <th className="w-28 p-3 font-medium">Status</th>
            <th className="w-44 p-3 font-medium">Booked</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <AdminConsultationRow key={c.id} consultation={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
