import { getNotifications } from "./actions";
import { InboxList } from "./inbox-list";

export default async function InboxPage() {
  const notifications = await getNotifications();

  return <InboxList notifications={notifications} />;
}
