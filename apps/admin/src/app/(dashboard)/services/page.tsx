import { getServices } from "./actions";
import { ServicesList } from "./services-list";

export default async function ServicesPage() {
  const services = await getServices();

  // Serialize Decimal values for client components
  const serializedServices = services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));

  return <ServicesList services={serializedServices} />;
}
