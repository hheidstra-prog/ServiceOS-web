"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone, Calendar, FileText, Receipt, FileSignature, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createEvent, updateEvent, deleteEvent } from "../../actions";
import { EventType } from "@serviceos/database";
import { formatDistanceToNow, format } from "date-fns";

interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
}

interface ActivityTabProps {
  client: {
    id: string;
    events: Event[];
    projects: Project[];
  };
}

const eventTypeConfig: Record<EventType, { label: string; icon: typeof Mail; color: string }> = {
  EMAIL_SENT: { label: "Email Sent", icon: Mail, color: "text-blue-500" },
  EMAIL_RECEIVED: { label: "Email Received", icon: Mail, color: "text-green-500" },
  CALL: { label: "Phone Call", icon: Phone, color: "text-purple-500" },
  MEETING: { label: "Meeting", icon: Calendar, color: "text-orange-500" },
  QUOTE_SENT: { label: "Quote Sent", icon: FileText, color: "text-blue-500" },
  QUOTE_ACCEPTED: { label: "Quote Accepted", icon: FileText, color: "text-green-500" },
  QUOTE_REJECTED: { label: "Quote Rejected", icon: FileText, color: "text-red-500" },
  CONTRACT_SENT: { label: "Contract Sent", icon: FileSignature, color: "text-blue-500" },
  CONTRACT_SIGNED: { label: "Contract Signed", icon: FileSignature, color: "text-green-500" },
  INVOICE_SENT: { label: "Invoice Sent", icon: Receipt, color: "text-blue-500" },
  PAYMENT_RECEIVED: { label: "Payment Received", icon: Receipt, color: "text-green-500" },
  NOTE: { label: "Note", icon: MessageSquare, color: "text-gray-500" },
  TASK: { label: "Task", icon: CheckCircle, color: "text-yellow-500" },
  APPOINTMENT: { label: "Appointment", icon: Calendar, color: "text-indigo-500" },
  OTHER: { label: "Other", icon: Clock, color: "text-gray-500" },
};

const eventTypeOptions = Object.entries(eventTypeConfig).map(([value, config]) => ({
  value: value as EventType,
  label: config.label,
}));

export function ActivityTab({ client }: ActivityTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const handleAdd = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleDelete = async (eventId: string) => {
    const ok = await confirm({
      title: "Delete activity",
      description: "Are you sure you want to delete this activity? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await deleteEvent(eventId, client.id);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as EventType,
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      projectId: formData.get("projectId") as string || undefined,
      scheduledAt: formData.get("scheduledAt") ? new Date(formData.get("scheduledAt") as string) : undefined,
      completedAt: formData.get("completedAt") ? new Date(formData.get("completedAt") as string) : undefined,
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, client.id, data);
      } else {
        await createEvent(client.id, data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthorName = (event: Event) => {
    if (!event.createdBy) return null;
    const { firstName, lastName } = event.createdBy;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return null;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return null;
    return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <>
    {ConfirmDialog}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Activity</h3>
          <p className="text-sm text-muted-foreground">
            Timeline of interactions and events
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Log Activity
        </Button>
      </div>

      {client.events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No activity recorded yet.</p>
            <Button onClick={handleAdd} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Log First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {client.events.map((event) => {
              const config = eventTypeConfig[event.type];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-2 w-5 h-5 rounded-full bg-background border-2 flex items-center justify-center ${config.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            {event.project && (
                              <Badge variant="secondary" className="text-xs">
                                {event.project.name}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                            </span>
                            {getAuthorName(event) && (
                              <span>by {getAuthorName(event)}</span>
                            )}
                            {event.scheduledAt && (
                              <span>Scheduled: {formatDateTime(event.scheduledAt)}</span>
                            )}
                            {event.completedAt && (
                              <span className="text-green-600">
                                Completed: {formatDateTime(event.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(event)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Activity" : "Log Activity"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Update activity details"
                : "Record an interaction or event"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Activity Type *</Label>
              <Select
                name="type"
                defaultValue={editingEvent?.type || "NOTE"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingEvent?.title || ""}
                placeholder="Brief description of the activity"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingEvent?.description || ""}
                placeholder="Additional notes or details..."
              />
            </div>
            {client.projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="projectId">Related Project</Label>
                <Select
                  name="projectId"
                  defaultValue={editingEvent?.project?.id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {client.projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Scheduled For</Label>
                <Input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={
                    editingEvent?.scheduledAt
                      ? new Date(editingEvent.scheduledAt).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completedAt">Completed At</Label>
                <Input
                  id="completedAt"
                  name="completedAt"
                  type="datetime-local"
                  defaultValue={
                    editingEvent?.completedAt
                      ? new Date(editingEvent.completedAt).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
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
                {isLoading ? "Saving..." : editingEvent ? "Update" : "Log Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
