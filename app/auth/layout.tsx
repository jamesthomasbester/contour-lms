// Split card used by every auth page: a blue welcome panel on the left
// (hidden on small screens) and the form on the right.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4 md:p-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-center gap-3 bg-primary bg-[radial-gradient(hsl(0_0%_100%/0.15)_1px,transparent_1px)] p-10 text-center text-primary-foreground [background-size:18px_18px] md:flex">
          <h2 className="text-3xl font-extrabold">Welcome to Contour LMS</h2>
          <p>
            Book a consultation, keep track of what&apos;s coming up and
            reschedule when plans change.
          </p>
        </div>
        <div className="p-2 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
