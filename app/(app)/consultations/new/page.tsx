import { BookingForm } from "@/components/booking-form";

export default function NewConsultationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Book a consultation</h1>
      <div className="max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        <BookingForm />
      </div>
    </div>
  );
}
