"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createConsultation } from "@/lib/api-client";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/datetime";
import { useMounted } from "@/lib/use-mounted";

type FieldErrors = Record<string, string[]>;

export function BookingForm() {
  const router = useRouter();
  const mounted = useMounted();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await createConsultation({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        reason: String(form.get("reason")),
        scheduledAt: fromDateTimeLocalValue(String(form.get("scheduledAt"))),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields);
      } else {
        setError("Could not book the consultation");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" name="firstName" errors={fieldErrors}>
          <Input id="firstName" name="firstName" required maxLength={100} />
        </Field>
        <Field label="Last name" name="lastName" errors={fieldErrors}>
          <Input id="lastName" name="lastName" required maxLength={100} />
        </Field>
      </div>

      <Field label="Reason for consultation" name="reason" errors={fieldErrors}>
        <Textarea id="reason" name="reason" required maxLength={1000} rows={4} />
      </Field>

      <Field label="Date and time" name="scheduledAt" errors={fieldErrors}>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          // The minimum depends on the user's clock, so set it after hydration.
          min={mounted ? toDateTimeLocalValue(new Date()) : undefined}
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Booking..." : "Book consultation"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {errors[name]?.map((message) => (
        <p key={message} className="text-sm text-red-500">
          {message}
        </p>
      ))}
    </div>
  );
}
