import { getClients } from "./actions";
import { ClientsList } from "./clients-list";

export default async function ClientsPage() {
  const clients = await getClients();

  return <ClientsList clients={clients} />;
}
