import { Badge } from "@/components/ui/badge";
import type { Consultation } from "@/lib/consultations";

export function StatusBadge({
  consultation,
}: {
  consultation: Pick<Consultation, "status" | "completedAt">;
}) {
  if (consultation.status === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  if (consultation.completedAt) {
    return <Badge variant="secondary">Completed</Badge>;
  }
  return <Badge variant="outline">Scheduled</Badge>;
}
