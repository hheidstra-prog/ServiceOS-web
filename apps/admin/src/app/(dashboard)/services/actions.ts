"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { PricingType, TaxType } from "@servible/database";

// Get all services for the organization
export async function getServices() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.service.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: {
        select: {
          quoteItems: true,
          invoiceItems: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

// Get a single service
export async function getService(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.service.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    include: {
      _count: {
        select: {
          quoteItems: true,
          invoiceItems: true,
        },
      },
    },
  });
}

// Create a new service
export async function createService(data: {
  name: string;
  description?: string;
  pricingType: PricingType;
  price: number;
  unit?: string;
  taxType?: TaxType;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const service = await db.service.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      description: data.description,
      pricingType: data.pricingType,
      price: data.price,
      currency: organization.defaultCurrency,
      unit: data.unit,
      taxType: data.taxType ?? "STANDARD",
    },
  });

  revalidatePath("/services");
  return service;
}

// Update a service
export async function updateService(
  id: string,
  data: {
    name?: string;
    description?: string;
    pricingType?: PricingType;
    price?: number;
    unit?: string;
    taxType?: TaxType;
    isActive?: boolean;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const service = await db.service.update({
    where: { id, organizationId: organization.id },
    data: {
      name: data.name,
      description: data.description,
      pricingType: data.pricingType,
      price: data.price,
      unit: data.unit,
      taxType: data.taxType,
      isActive: data.isActive,
    },
  });

  revalidatePath("/services");
  return service;
}

// Delete a service
export async function deleteService(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Check if service is in use
  const service = await db.service.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      _count: {
        select: {
          quoteItems: true,
          invoiceItems: true,
        },
      },
    },
  });

  if (!service) throw new Error("Service not found");

  // If service is in use, just deactivate it
  if (service._count.quoteItems > 0 || service._count.invoiceItems > 0) {
    await db.service.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    // Otherwise, delete it
    await db.service.delete({
      where: { id, organizationId: organization.id },
    });
  }

  revalidatePath("/services");
}

// Duplicate a service
export async function duplicateService(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const original = await db.service.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!original) throw new Error("Service not found");

  const newService = await db.service.create({
    data: {
      organizationId: organization.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      pricingType: original.pricingType,
      price: original.price,
      currency: original.currency,
      unit: original.unit,
      taxType: original.taxType,
    },
  });

  revalidatePath("/services");
  return newService;
}
