"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSite } from "./actions";

interface SiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SiteForm({ open, onOpenChange }: SiteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subdomain, setSubdomain] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get("name") as string,
        subdomain: formData.get("subdomain") as string,
        tagline: formData.get("tagline") as string || undefined,
        description: formData.get("description") as string || undefined,
      };

      const site = await createSite(data);
      toast.success("Site created successfully");
      onOpenChange(false);
      router.push(`/sites/${site.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create site"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate subdomain from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSubdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSubdomain(generatedSubdomain);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new site</DialogTitle>
          <DialogDescription>
            Set up your public website. You can customize it further after
            creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Site Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Business"
              required
              onChange={handleNameChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center">
              <Input
                id="subdomain"
                name="subdomain"
                placeholder="my-business"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                className="rounded-r-none"
              />
              <span className="flex h-9 items-center rounded-r-md border border-l-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                .servible.app
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Only lowercase letters, numbers, and hyphens allowed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline (optional)</Label>
            <Input
              id="tagline"
              name="tagline"
              placeholder="Your short business tagline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Tell visitors what your business does..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Site
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
