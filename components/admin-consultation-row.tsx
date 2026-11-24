"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LocalDateTime } from "@/components/local-date-time";
import { StatusBadge } from "@/components/status-badge";
import type { Consultation } from "@/lib/consultations";
import { cn } from "@/lib/utils";

// One row of the admin table. Long names and reasons are shortened by
// default; expanding the row shows them in full so they can be read or
// copied.
export function AdminConsultationRow({
  consultation: c,
}: {
  consultation: Consultation;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = `${c.firstName} ${c.lastName}`;

  return (
    <tr className={cn("border-b align-top last:border-0", expanded && "bg-muted/30")}>
      <td className="p-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} consultation for ${name}`}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </td>
      <td
        className={cn("p-3", expanded ? "break-words" : "truncate")}
        title={expanded ? undefined : name}
      >
        {name}
      </td>
      <td className="p-3">
        <p
          className={cn(
            "break-words",
            expanded ? "whitespace-pre-wrap" : "line-clamp-2",
          )}
          title={expanded ? undefined : c.reason}
        >
          {c.reason}
        </p>
      </td>
      <td className="whitespace-nowrap p-3">
        <LocalDateTime value={c.scheduledAt} />
      </td>
      <td className="p-3">
        <StatusBadge consultation={c} />
      </td>
      <td className="whitespace-nowrap p-3 text-muted-foreground">
        <LocalDateTime value={c.createdAt} />
      </td>
    </tr>
  );
}
