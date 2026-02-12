"use client";

import { useState, useRef } from "react";
import { Loader2, Palette, Type, Layout, ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateSite, updateTheme } from "../../actions";

interface Theme {
  template: string;
  colorMode: string;
  headerStyle: string;
  footerStyle: string;
  heroStyle: string;
  fontHeading: string | null;
  fontBody: string | null;
  customCss: string | null;
}

interface Site {
  id: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logo: string | null;
  favicon: string | null;
  theme: Theme | null;
}

interface DesignTabProps {
  site: Site;
}

const templates = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
];

const headerStyles = [
  { value: "standard", label: "Standard" },
  { value: "centered", label: "Centered" },
  { value: "minimal", label: "Minimal" },
];

const footerStyles = [
  { value: "standard", label: "Standard" },
  { value: "simple", label: "Simple" },
  { value: "expanded", label: "Expanded" },
];

const colorModes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const heroStyles = [
  { value: "centered", label: "Centered" },
  { value: "left", label: "Left Aligned" },
  { value: "split", label: "Split (Text + Image)" },
  { value: "background", label: "Background Image" },
];

const fonts = [
  { value: "Inter", label: "Inter" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Outfit", label: "Outfit" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Merriweather", label: "Merriweather" },
];

export function DesignTab({ site }: DesignTabProps) {
  const [isSavingColors, setIsSavingColors] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(site.logo);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState(site.primaryColor || "#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState(site.secondaryColor || "#10b981");

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/designer/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await res.json();
      await updateSite(site.id, { logo: url });
      setLogoUrl(url);
      toast.success("Logo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateSite(site.id, { logo: "" });
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    }
  };

  const handleSaveColors = async () => {
    setIsSavingColors(true);
    try {
      await updateSite(site.id, { primaryColor, secondaryColor });
      toast.success("Colors updated");
    } catch (error) {
      toast.error("Failed to update colors");
    } finally {
      setIsSavingColors(false);
    }
  };

  const handleThemeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingTheme(true);

    try {
      const formData = new FormData(e.currentTarget);
      await updateTheme(site.id, {
        template: formData.get("template") as string,
        colorMode: formData.get("colorMode") as string,
        headerStyle: formData.get("headerStyle") as string,
        footerStyle: formData.get("footerStyle") as string,
        heroStyle: formData.get("heroStyle") as string,
        fontHeading: formData.get("fontHeading") as string || undefined,
        fontBody: formData.get("fontBody") as string || undefined,
        customCss: formData.get("customCss") as string || undefined,
      });
      toast.success("Theme updated");
    } catch (error) {
      toast.error("Failed to update theme");
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-zinc-500" />
            <CardTitle>Logo</CardTitle>
          </div>
          <CardDescription>
            Upload your brand logo. It will appear in the site header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-40 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Site logo"
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {isUploadingLogo ? (
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Click to upload logo</span>
                </div>
              )}
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleLogoUpload(file);
              if (logoInputRef.current) logoInputRef.current.value = "";
            }}
          />
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-zinc-500" />
            <CardTitle>Brand Colors</CardTitle>
          </div>
          <CardDescription>
            Set your primary and secondary brand colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-zinc-200 dark:border-zinc-800"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-zinc-200 dark:border-zinc-800"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveColors} disabled={isSavingColors}>
              {isSavingColors && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Colors
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-zinc-500" />
            <CardTitle>Theme Settings</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of your site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleThemeSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select
                  name="template"
                  defaultValue={site.theme?.template || "modern"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorMode">Color Mode</Label>
                <Select
                  name="colorMode"
                  defaultValue={site.theme?.colorMode || "light"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorModes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerStyle">Header Style</Label>
                <Select
                  name="headerStyle"
                  defaultValue={site.theme?.headerStyle || "standard"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {headerStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerStyle">Footer Style</Label>
                <Select
                  name="footerStyle"
                  defaultValue={site.theme?.footerStyle || "standard"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {footerStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroStyle">Hero Style</Label>
                <Select
                  name="heroStyle"
                  defaultValue={site.theme?.heroStyle || "centered"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {heroStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fonts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-zinc-500" />
                <h3 className="font-medium text-zinc-950 dark:text-white">
                  Typography
                </h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fontHeading">Heading Font</Label>
                  <Select
                    name="fontHeading"
                    defaultValue={site.theme?.fontHeading || "Inter"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontBody">Body Font</Label>
                  <Select
                    name="fontBody"
                    defaultValue={site.theme?.fontBody || "Inter"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
              <Textarea
                id="customCss"
                name="customCss"
                defaultValue={site.theme?.customCss || ""}
                placeholder="/* Add custom CSS here */"
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingTheme}>
                {isSavingTheme && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Theme Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
