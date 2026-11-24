"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/local-date-time";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { ApiError, updateConsultation } from "@/lib/api-client";
import type { Consultation } from "@/lib/consultations";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/datetime";
import type { UpdateConsultationInput } from "@/lib/validation";

export function ConsultationList({
  consultations,
}: {
  consultations: Consultation[];
}) {
  if (consultations.length === 0) {
    return (
      <p className="text-muted-foreground">
        You have no consultations yet. Book one to get started.
      </p>
    );
  }

  // Active consultations first, cancelled ones at the bottom.
  const sorted = [...consultations].sort(
    (a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled"),
  );

  return (
    <ul className="flex flex-col gap-4">
      {sorted.map((consultation) => (
        <ConsultationItem key={consultation.id} consultation={consultation} />
      ))}
    </ul>
  );
}

function ConsultationItem({ consultation }: { consultation: Consultation }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);

  const isCancelled = consultation.status === "cancelled";

  // Running the refresh inside a transition keeps the controls disabled
  // while the new list loads.
  function save(changes: UpdateConsultationInput) {
    setError(null);
    startSaving(async () => {
      try {
        await updateConsultation(consultation.id, changes);
        setNewTime(null);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? (Object.values(err.fields)[0]?.[0] ?? err.message)
            : "Could not save the change",
        );
      }
    });
  }

  function cancel() {
    if (window.confirm("Cancel this consultation? This can't be undone.")) {
      save({ status: "cancelled" });
    }
  }

  return (
    <li className={cn("rounded-lg border p-4", isCancelled && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            <LocalDateTime value={consultation.scheduledAt} />
          </p>
          <p className="text-sm text-muted-foreground">
            {consultation.firstName} {consultation.lastName}
          </p>
        </div>
        <StatusBadge consultation={consultation} />
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{consultation.reason}</p>

      {!isCancelled && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`complete-${consultation.id}`}
              checked={consultation.completedAt !== null}
              disabled={isSaving}
              onCheckedChange={(checked) =>
                save({ completed: checked === true })
              }
            />
            <Label htmlFor={`complete-${consultation.id}`}>Completed</Label>
          </div>

          {newTime === null ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() =>
                  setNewTime(
                    toDateTimeLocalValue(new Date(consultation.scheduledAt)),
                  )
                }
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSaving}
                onClick={cancel}
              >
                Cancel consultation
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save({ scheduledAt: fromDateTimeLocalValue(newTime) });
              }}
            >
              <Input
                type="datetime-local"
                aria-label="New date and time"
                className="w-auto"
                required
                min={toDateTimeLocalValue(new Date())}
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <Button size="sm" type="submit" disabled={isSaving}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setNewTime(null)}
              >
                Back
              </Button>
            </form>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </li>
  );
}
