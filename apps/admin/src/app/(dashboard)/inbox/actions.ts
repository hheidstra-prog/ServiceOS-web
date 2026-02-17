"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthWithOrg } from "@/lib/auth";

export async function getNotifications() {
  const { organization } = await requireAuthWithOrg();

  return db.notification.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUnreadCount() {
  const { organization } = await requireAuthWithOrg();

  return db.notification.count({
    where: { organizationId: organization.id, isRead: false },
  });
}

export async function markAsRead(id: string) {
  const { organization } = await requireAuthWithOrg();

  await db.notification.updateMany({
    where: { id, organizationId: organization.id },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/inbox");
}

export async function markAllAsRead() {
  const { organization } = await requireAuthWithOrg();

  await db.notification.updateMany({
    where: { organizationId: organization.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/inbox");
}
