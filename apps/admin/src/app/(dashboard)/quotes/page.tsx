import { getQuotes } from "./actions";
import { QuotesList } from "./quotes-list";

export default async function QuotesPage() {
  const quotes = await getQuotes();

  // Serialize Decimal values for client components
  const serializedQuotes = quotes.map((quote) => ({
    ...quote,
    subtotal: Number(quote.subtotal),
    taxAmount: Number(quote.taxAmount),
    total: Number(quote.total),
  }));

  return <QuotesList quotes={serializedQuotes} />;
}
