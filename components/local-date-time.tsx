"use client";

import { useMounted } from "@/lib/use-mounted";

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Times are stored in UTC and shown in the viewer's own timezone. That is
// only known in the browser, so nothing is rendered on the server to avoid
// a hydration mismatch.
export function LocalDateTime({ value }: { value: string }) {
  const mounted = useMounted();

  return (
    <time dateTime={value}>
      {mounted ? formatter.format(new Date(value)) : null}
    </time>
  );
}
