import Link from "next/link";
import { Mail, Phone, Building, MapPin, Calendar, FileText, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface OverviewTabProps {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    createdAt: Date;
    bookings: { id: string; startsAt: Date; status: string }[];
    quotes: { id: string; number: string; status: string; total: unknown }[];
    invoices: { id: string; number: string; status: string; total: unknown }[];
    notes: { id: string }[];
    projects: { id: string; name: string; status: string }[];
  };
}

export function OverviewTab({ client }: OverviewTabProps) {
  const address = [
    client.addressLine1,
    [client.postalCode, client.city].filter(Boolean).join(" "),
    client.country,
  ]
    .filter(Boolean)
    .join(", ");

  const upcomingBookings = client.bookings.filter(
    (b) => new Date(b.startsAt) > new Date() && b.status !== "CANCELLED"
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:underline">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="hover:underline">
                {client.phone}
              </a>
            </div>
          )}
          {client.companyName && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{client.companyName}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{address}</span>
            </div>
          )}
          {!client.email && !client.phone && !address && (
            <p className="text-sm text-muted-foreground">
              No contact information added yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projects</span>
            <span className="font-medium">{client.projects.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quotes</span>
            <span className="font-medium">{client.quotes.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invoices</span>
            <span className="font-medium">{client.invoices.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Client since</span>
            <span className="font-medium">
              {formatDistanceToNow(client.createdAt, { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
          <CardDescription>{upcomingBookings.length} scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length > 0 ? (
            <ul className="space-y-2">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <li key={booking.id} className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(booking.startsAt).toLocaleDateString()} at{" "}
                    {new Date(booking.startsAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {client.quotes.length > 0 ? (
            <ul className="space-y-2">
              {client.quotes.slice(0, 3).map((quote) => (
                <li key={quote.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/quotes/${quote.id}`} className="hover:underline">
                      {quote.number}
                    </Link>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {quote.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {client.invoices.length > 0 ? (
            <ul className="space-y-2">
              {client.invoices.slice(0, 3).map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.number}
                    </Link>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {invoice.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
