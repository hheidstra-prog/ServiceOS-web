"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { startTimer, getTasksForSelect, getProjectsForSelect } from "./actions";

interface ServiceOption {
  id: string;
  name: string;
  pricingType: string;
  price: unknown;
  unit: string | null;
  currency: string;
}

interface TaskOption {
  id: string;
  title: string;
}

interface ProjectOption {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  };
}

interface ClientOption {
  id: string;
  name: string;
  companyName: string | null;
}

interface StartTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceOption[];
  /** When opened from a project context */
  projectId?: string;
  clientId?: string;
  /** Hide project/client selectors when in project context */
  hideProjectFields?: boolean;
  /** Available projects (for timesheet context) */
  projects?: ProjectOption[];
  /** Available clients (for timesheet context) */
  clients?: ClientOption[];
}

function formatServiceLabel(service: ServiceOption) {
  const price = Number(service.price);
  if (service.pricingType === "HOURLY") {
    return `${service.name} — ${service.currency} ${price}/${service.unit || "h"}`;
  }
  return service.name;
}

export function StartTimerDialog({
  open,
  onOpenChange,
  services,
  projectId: initialProjectId,
  clientId: initialClientId,
  hideProjectFields,
  projects: initialProjects = [],
  clients = [],
}: StartTimerDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState<TaskOption[]>([]);

  const [clientId, setClientId] = useState(initialClientId || "");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");
  const [billable, setBillable] = useState(true);

  // Auto-select single service
  useEffect(() => {
    if (services.length === 1 && !serviceId) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  // Load projects when client changes (non-project context)
  useEffect(() => {
    if (hideProjectFields) return;
    if (clientId) {
      getProjectsForSelect(clientId).then(setProjects);
    } else {
      setProjects(initialProjects);
    }
  }, [clientId, initialProjects, hideProjectFields]);

  // Load tasks when project changes
  useEffect(() => {
    const pid = projectId || initialProjectId;
    if (pid) {
      getTasksForSelect(pid).then(setTasks);
    } else {
      setTasks([]);
      setTaskId("");
    }
  }, [projectId, initialProjectId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setClientId(initialClientId || "");
      setProjectId(initialProjectId || "");
      setServiceId(services.length === 1 ? services[0].id : "");
      setTaskId("");
      setNote("");
      setBillable(true);
    }
  }, [open, initialProjectId, initialClientId, services]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await startTimer({
        projectId: projectId || initialProjectId || undefined,
        taskId: taskId || undefined,
        serviceId: serviceId || undefined,
        billable,
        note: note || undefined,
      });
      toast.success("Timer started");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveProjectId = projectId || initialProjectId;

  // Filter projects by selected client
  const filteredProjects = clientId
    ? projects.filter((p) => p.client.id === clientId)
    : projects;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Timer</DialogTitle>
          <DialogDescription>
            Configure what you're working on, then start tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client & Project (only in timesheet context) */}
          {!hideProjectFields && (
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId || "none"} onValueChange={(v) => {
                  setClientId(v === "none" ? "" : v);
                  setProjectId("");
                  setTaskId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName || client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId || "none"} onValueChange={(v) => {
                  const newProjectId = v === "none" ? "" : v;
                  setProjectId(newProjectId);
                  setTaskId("");
                  if (newProjectId && !clientId) {
                    const proj = projects.find((p) => p.id === newProjectId);
                    if (proj) setClientId(proj.client.id);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {!clientId && (
                          <span className="ml-1 text-zinc-500">
                            ({project.client.companyName || project.client.name})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Task */}
          {effectiveProjectId && tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={taskId || "none"} onValueChange={(v) => setTaskId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId || "none"} onValueChange={(v) => setServiceId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No service</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {formatServiceLabel(service)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="timer-note">Note</Label>
            <Textarea
              id="timer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What are you working on?"
            />
          </div>

          {/* Billable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="timer-billable">Billable</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Mark as billable time
              </p>
            </div>
            <Switch id="timer-billable" checked={billable} onCheckedChange={setBillable} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isLoading}>
            <Play className="mr-1.5 h-4 w-4" />
            {isLoading ? "Starting..." : "Start Timer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
