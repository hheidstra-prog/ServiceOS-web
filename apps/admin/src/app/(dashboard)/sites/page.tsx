import { getSites } from "./actions";
import { SitesList } from "./sites-list";

export default async function SitesPage() {
  const sites = await getSites();

  return <SitesList sites={sites} />;
}
