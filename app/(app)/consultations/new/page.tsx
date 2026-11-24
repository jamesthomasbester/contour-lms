import { BookingForm } from "@/components/booking-form";

export default function NewConsultationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Book a consultation</h1>
      <BookingForm />
    </div>
  );
}
