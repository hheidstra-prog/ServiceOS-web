import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBooking } from "../actions";
import { BookingDetail } from "./booking-detail";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  // Serialize for client components
  const serializedBooking = {
    ...booking,
    bookingType: booking.bookingType
      ? {
          ...booking.bookingType,
          price: booking.bookingType.price ? Number(booking.bookingType.price) : null,
        }
      : null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Booking Details
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {booking.client?.name || booking.guestName || "No client"}
          </p>
        </div>
      </div>

      <BookingDetail booking={serializedBooking} />
    </div>
  );
}
