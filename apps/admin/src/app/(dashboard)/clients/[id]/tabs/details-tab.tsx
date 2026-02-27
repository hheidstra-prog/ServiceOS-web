"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClient } from "../../actions";
import { ClientStatus } from "@servible/database";

interface DetailsTabProps {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
    registrationNumber: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    vatNumber: string | null;
    status: ClientStatus;
  };
}

const statusOptions: { value: ClientStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "CLIENT", label: "Client" },
];

export function DetailsTab({ client }: DetailsTabProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      companyName: formData.get("companyName") as string || undefined,
      registrationNumber: formData.get("registrationNumber") as string || undefined,
      addressLine1: formData.get("addressLine1") as string || undefined,
      addressLine2: formData.get("addressLine2") as string || undefined,
      city: formData.get("city") as string || undefined,
      postalCode: formData.get("postalCode") as string || undefined,
      country: formData.get("country") as string || undefined,
      vatNumber: formData.get("vatNumber") as string || undefined,
      status: formData.get("status") as ClientStatus,
    };

    try {
      await updateClient(client.id, data);
      toast.success("Client updated");
    } catch (error) {
      toast.error("Failed to update client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Name and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={client.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={client.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={client.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Business information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                defaultValue={client.companyName || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                name="vatNumber"
                defaultValue={client.vatNumber || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number (KvK)</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={client.registrationNumber || ""}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Physical address for invoices and correspondence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Street Address</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  defaultValue={client.addressLine1 || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  defaultValue={client.addressLine2 || ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  defaultValue={client.postalCode || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={client.city || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={client.country || ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
