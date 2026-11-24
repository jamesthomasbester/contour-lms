import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { listAllConsultations, type Consultation } from "@/lib/consultations";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminView />
    </Suspense>
  );
}

// The role check lives inside the Suspense boundary because it reads
// cookies. Students are redirected before anything below is rendered.
async function AdminView() {
  const { supabase, userId } = await getCurrentUser();
  if (!userId) redirect("/auth/login");
  if (!(await isAdmin(supabase, userId))) redirect("/dashboard");

  const consultations = await listAllConsultations(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">All consultations</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of every consultation in the system.
        </p>
      </div>
      {consultations.length === 0 ? (
        <p className="text-muted-foreground">No consultations yet.</p>
      ) : (
        <ConsultationTable consultations={consultations} />
      )}
    </div>
  );
}

function ConsultationTable({
  consultations,
}: {
  consultations: Consultation[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="p-3 font-medium">Student</th>
            <th className="p-3 font-medium">Reason</th>
            <th className="p-3 font-medium">Scheduled for</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Booked</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="p-3 whitespace-nowrap">
                {c.firstName} {c.lastName}
              </td>
              <td className="max-w-xs p-3">{c.reason}</td>
              <td className="p-3 whitespace-nowrap">
                <LocalDateTime value={c.scheduledAt} />
              </td>
              <td className="p-3">
                <StatusBadge consultation={c} />
              </td>
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                <LocalDateTime value={c.createdAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
