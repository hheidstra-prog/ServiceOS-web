"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createContact, updateContact, deleteContact } from "../../actions";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
}

interface ContactsTabProps {
  client: {
    id: string;
    contacts: Contact[];
  };
}

export function ContactsTab({ client }: ContactsTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await deleteContact(contactId, client.id);
      toast.success("Contact deleted");
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      role: formData.get("role") as string || undefined,
      isPrimary: formData.get("isPrimary") === "on",
    };

    try {
      if (editingContact) {
        await updateContact(editingContact.id, client.id, data);
        toast.success("Contact updated");
      } else {
        await createContact(client.id, data);
        toast.success("Contact added");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Failed to save contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Contact Persons</h3>
          <p className="text-sm text-muted-foreground">
            People associated with this client
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {client.contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No contacts added yet.</p>
            <Button onClick={handleAdd} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {client.contacts.map((contact) => (
            <Card
              key={contact.id}
              className={contact.isPrimary ? "border-sky-300 dark:border-sky-500/50" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {contact.firstName} {contact.lastName}
                      {contact.isPrimary && (
                        <Star className="h-4 w-4 fill-sky-400 text-sky-400" />
                      )}
                    </CardTitle>
                    {contact.role && (
                      <Badge variant="secondary" className="mt-1">
                        {contact.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {contact.email && (
                  <p>
                    <a href={`mailto:${contact.email}`} className="text-zinc-600 dark:text-zinc-300 hover:underline">
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p>
                    <a href={`tel:${contact.phone}`} className="text-zinc-600 dark:text-zinc-300 hover:underline">
                      {contact.phone}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update contact information"
                : "Add a new contact person for this client"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={editingContact?.firstName || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={editingContact?.lastName || ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingContact?.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={editingContact?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                name="role"
                placeholder="e.g., CEO, Project Manager"
                defaultValue={editingContact?.role || ""}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                name="isPrimary"
                defaultChecked={editingContact?.isPrimary || false}
              />
              <Label htmlFor="isPrimary" className="font-normal">
                Primary contact
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingContact ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
