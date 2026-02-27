import { getBookings, getBookingTypes } from "./actions";
import { BookingsList } from "./bookings-list";

export default async function BookingsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [bookings, bookingTypes] = await Promise.all([
    getBookings({ startDate: startOfMonth, endDate: endOfMonth }),
    getBookingTypes(),
  ]);

  // Serialize for client components (bookingType doesn't have price in list view)
  const serializedBookings = bookings.map((booking) => ({
    ...booking,
  }));

  const serializedBookingTypes = bookingTypes.map((type) => ({
    ...type,
    price: type.price ? Number(type.price) : null,
  }));

  return (
    <BookingsList
      initialBookings={serializedBookings}
      bookingTypes={serializedBookingTypes}
    />
  );
}
