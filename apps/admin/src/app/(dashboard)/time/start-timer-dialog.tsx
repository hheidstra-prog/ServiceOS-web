"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Check, ChevronsUpDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Client</Label>
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {clientId
                          ? clients.find((c) => c.id === clientId)?.companyName || clients.find((c) => c.id === clientId)?.name || "Select client"
                          : "Select client"}
                      </span>
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search clients..." />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setClientId("");
                              setProjectId("");
                              setTaskId("");
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !clientId ? "opacity-100" : "opacity-0")} />
                            No client
                          </CommandItem>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.companyName || client.name}
                              onSelect={() => {
                                setClientId(client.id);
                                setProjectId("");
                                setTaskId("");
                                setClientPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", clientId === client.id ? "opacity-100" : "opacity-0")} />
                              {client.companyName || client.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {projectId
                          ? projects.find((p) => p.id === projectId)?.name || "Select project"
                          : "Select project"}
                      </span>
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search projects..." />
                      <CommandList>
                        <CommandEmpty>No project found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setProjectId("");
                              setTaskId("");
                              setProjectPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !projectId ? "opacity-100" : "opacity-0")} />
                            No project
                          </CommandItem>
                          {filteredProjects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.client.companyName || project.client.name}`}
                              onSelect={() => {
                                setProjectId(project.id);
                                setTaskId("");
                                if (!clientId) {
                                  setClientId(project.client.id);
                                }
                                setProjectPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", projectId === project.id ? "opacity-100" : "opacity-0")} />
                              <span>
                                {project.name}
                                {!clientId && (
                                  <span className="ml-1 text-zinc-500">
                                    ({project.client.companyName || project.client.name})
                                  </span>
                                )}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
