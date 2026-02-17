import { getClients } from "./actions";
import { ClientsList } from "./clients-list";

export default async function ClientsPage() {
  const clients = await getClients(true);

  return <ClientsList clients={clients} />;
}
