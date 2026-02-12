"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Building2, MapPin, FileText, Settings2, Palette, Bot, Plus, X, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateBusinessInfo,
  updateAddress,
  updateLegalInfo,
  updateDefaults,
  updateBranding,
  updateBusinessProfile,
  scanWebsiteForProfile,
} from "./actions";

interface OrganizationSettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  legalName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  iban: string | null;
  logo: string | null;
  primaryColor: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTermDays: number;
  timezone: string;
  locale: string;
  toneOfVoice: string | null;
  industry: string | null;
}

interface BusinessProfileData {
  id: string;
  organizationId: string;
  industry: string | null;
  description: string | null;
  tagline: string | null;
  targetAudience: string | null;
  targetIndustries: string[];
  regions: string[];
  uniqueValue: string | null;
  painPoints: string[];
  buyerTriggers: string[];
  toneOfVoice: string | null;
  wordsToAvoid: string | null;
}

interface SettingsFormProps {
  settings: OrganizationSettings;
  businessProfile: BusinessProfileData | null;
}

const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
];

const COUNTRIES = [
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "PT", label: "Portugal" },
];

const TIMEZONES = [
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Brussels", label: "Brussels (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Zurich", label: "Zurich (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Vienna", label: "Vienna (CET)" },
];

const LOCALES = [
  { value: "nl", label: "Dutch" },
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
];

const TONES = [
  { value: "formal", label: "Formal" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
];

const INDUSTRIES = [
  { value: "consulting", label: "Consulting" },
  { value: "design", label: "Design & Creative" },
  { value: "development", label: "Software Development" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "legal", label: "Legal Services" },
  { value: "accounting", label: "Accounting & Finance" },
  { value: "coaching", label: "Coaching & Training" },
  { value: "healthcare", label: "Healthcare" },
  { value: "construction", label: "Construction & Trades" },
  { value: "other", label: "Other" },
];

export function SettingsForm({ settings, businessProfile }: SettingsFormProps) {
  return (
    <Tabs defaultValue="business" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        <TabsTrigger value="business" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Business</span>
        </TabsTrigger>
        <TabsTrigger value="address" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">Address</span>
        </TabsTrigger>
        <TabsTrigger value="legal" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Legal</span>
        </TabsTrigger>
        <TabsTrigger value="defaults" className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Defaults</span>
        </TabsTrigger>
        <TabsTrigger value="branding" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Branding</span>
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">AI Profile</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="business">
        <BusinessInfoForm settings={settings} />
      </TabsContent>

      <TabsContent value="address">
        <AddressForm settings={settings} />
      </TabsContent>

      <TabsContent value="legal">
        <LegalInfoForm settings={settings} />
      </TabsContent>

      <TabsContent value="defaults">
        <DefaultsForm settings={settings} />
      </TabsContent>

      <TabsContent value="branding">
        <BrandingForm settings={settings} />
      </TabsContent>

      <TabsContent value="profile">
        <BusinessProfileForm
          settings={settings}
          profile={businessProfile}
        />
      </TabsContent>
    </Tabs>
  );
}

function BusinessInfoForm({ settings }: { settings: OrganizationSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(settings.name);
  const [email, setEmail] = useState(settings.email || "");
  const [phone, setPhone] = useState(settings.phone || "");
  const [website, setWebsite] = useState(settings.website || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setIsLoading(true);
    try {
      await updateBusinessInfo({ name, email, phone, website });
      toast.success("Business information updated");
    } catch {
      toast.error("Failed to update business information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>
          Basic information about your business that appears on invoices and quotes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Business Name"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AddressForm({ settings }: { settings: OrganizationSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [addressLine1, setAddressLine1] = useState(settings.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(settings.addressLine2 || "");
  const [city, setCity] = useState(settings.city || "");
  const [postalCode, setPostalCode] = useState(settings.postalCode || "");
  const [country, setCountry] = useState(settings.country || "NL");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateAddress({ addressLine1, addressLine2, city, postalCode, country });
      toast.success("Address updated");
    } catch {
      toast.error("Failed to update address");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Address</CardTitle>
        <CardDescription>
          Your business address that appears on documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street and number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite, unit, building, etc."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1234 AB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Amsterdam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LegalInfoForm({ settings }: { settings: OrganizationSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [legalName, setLegalName] = useState(settings.legalName || "");
  const [registrationNumber, setRegistrationNumber] = useState(settings.registrationNumber || "");
  const [vatNumber, setVatNumber] = useState(settings.vatNumber || "");
  const [iban, setIban] = useState(settings.iban || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateLegalInfo({ legalName, registrationNumber, vatNumber, iban });
      toast.success("Legal information updated");
    } catch {
      toast.error("Failed to update legal information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Tax Information</CardTitle>
        <CardDescription>
          Legal details required for invoices and tax compliance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Business Name</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Official registered name"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Leave empty to use your business name
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="KvK / Chamber of Commerce"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="NL00 BANK 0000 0000 00"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bank account number for receiving payments
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DefaultsForm({ settings }: { settings: OrganizationSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate.toString());
  const [defaultPaymentTermDays, setDefaultPaymentTermDays] = useState(
    settings.defaultPaymentTermDays.toString()
  );
  const [timezone, setTimezone] = useState(settings.timezone);
  const [locale, setLocale] = useState(settings.locale);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateDefaults({
        defaultCurrency,
        defaultTaxRate: parseFloat(defaultTaxRate) || 21,
        defaultPaymentTermDays: parseInt(defaultPaymentTermDays) || 14,
        timezone,
        locale,
      });
      toast.success("Default settings updated");
    } catch {
      toast.error("Failed to update default settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Settings</CardTitle>
        <CardDescription>
          Configure defaults for new invoices, quotes, and other documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger id="defaultCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPaymentTermDays">Default Payment Terms (days)</Label>
            <Input
              id="defaultPaymentTermDays"
              type="number"
              min="0"
              max="365"
              value={defaultPaymentTermDays}
              onChange={(e) => setDefaultPaymentTermDays(e.target.value)}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Number of days until invoice is due
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Language</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BrandingForm({ settings }: { settings: OrganizationSettings }) {
  const [isLoading, setIsLoading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || "#0ea5e9");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateBranding({ primaryColor });
      toast.success("Branding updated");
    } catch {
      toast.error("Failed to update branding");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize the appearance of your documents and client portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-full w-full rounded-lg object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-zinc-400" />
                  )}
                </div>
                <div>
                  <Button type="button" variant="outline" size="sm" disabled>
                    Upload Logo
                  </Button>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Logo upload coming soon
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#0ea5e9"
                  className="w-32"
                />
                <div
                  className="h-10 flex-1 rounded-md"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Used for buttons and accents on invoices and quotes
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Tag input helper component
function TagInput({
  label,
  value,
  onChange,
  placeholder,
  helpText,
}: {
  label: string;
  value: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
  helpText?: string;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!input.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-sm dark:bg-zinc-800"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {helpText && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helpText}</p>
      )}
    </div>
  );
}

function BusinessProfileForm({
  settings,
  profile,
}: {
  settings: OrganizationSettings;
  profile: BusinessProfileData | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Form state
  const [industry, setIndustry] = useState(profile?.industry || settings.industry || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [tagline, setTagline] = useState(profile?.tagline || "");
  const [targetAudience, setTargetAudience] = useState(profile?.targetAudience || "");
  const [targetIndustries, setTargetIndustries] = useState<string[]>(profile?.targetIndustries || []);
  const [regions, setRegions] = useState<string[]>(profile?.regions || []);
  const [uniqueValue, setUniqueValue] = useState(profile?.uniqueValue || "");
  const [painPoints, setPainPoints] = useState<string[]>(profile?.painPoints || []);
  const [buyerTriggers, setBuyerTriggers] = useState<string[]>(profile?.buyerTriggers || []);
  const [toneOfVoice, setToneOfVoice] = useState(profile?.toneOfVoice || settings.toneOfVoice || "");
  const [wordsToAvoid, setWordsToAvoid] = useState(profile?.wordsToAvoid || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateBusinessProfile({
        industry,
        description,
        tagline,
        targetAudience,
        targetIndustries,
        regions,
        uniqueValue,
        painPoints,
        buyerTriggers,
        toneOfVoice,
        wordsToAvoid,
      });
      toast.success("Business profile updated");
    } catch {
      toast.error("Failed to update business profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanWebsite = useCallback(async () => {
    const url = settings.website;
    if (!url) {
      toast.error("Add your website URL in the Business tab first");
      return;
    }

    setIsScanning(true);
    try {
      const result = await scanWebsiteForProfile(url);

      // Pre-fill form fields with scan results
      if (result.industry) setIndustry(result.industry);
      if (result.description) setDescription(result.description);
      if (result.tagline) setTagline(result.tagline);
      if (result.targetAudience) setTargetAudience(result.targetAudience);
      if (result.targetIndustries) setTargetIndustries(result.targetIndustries);
      if (result.uniqueValue) setUniqueValue(result.uniqueValue);
      if (result.painPoints) setPainPoints(result.painPoints);
      if (result.buyerTriggers) setBuyerTriggers(result.buyerTriggers);
      if (result.toneOfVoice) setToneOfVoice(result.toneOfVoice);

      toast.success("Website scanned! Review the suggested fields below and save.");
    } catch {
      toast.error("Failed to scan website. Try again or fill in manually.");
    } finally {
      setIsScanning(false);
    }
  }, [settings.website]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              This information is used by AI to generate website content, blog posts, and communications that match your business.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleScanWebsite}
            disabled={isScanning || !settings.website}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Globe className="mr-1.5 h-4 w-4" />
                Scan my website
              </>
            )}
          </Button>
        </div>
        {!settings.website && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Add your website URL in the Business tab to enable AI scanning.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-950 dark:text-white">Identity</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bp-industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="bp-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-tagline">Tagline</Label>
                <Input
                  id="bp-tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your short, catchy slogan"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bp-description">Business Description</Label>
              <Textarea
                id="bp-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your business does, your mission, and what makes you unique..."
                rows={3}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Your elevator pitch. Used by AI to write website copy and content.
              </p>
            </div>
          </div>

          {/* Audience & Market */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-950 dark:text-white">Audience & Market</h3>

            <div className="space-y-2">
              <Label htmlFor="bp-audience">Target Audience</Label>
              <Textarea
                id="bp-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe your ideal customer: who they are, what they need..."
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TagInput
                label="Target Industries"
                value={targetIndustries}
                onChange={setTargetIndustries}
                placeholder="e.g., SaaS, E-commerce..."
                helpText="Industries your customers operate in"
              />
              <TagInput
                label="Regions"
                value={regions}
                onChange={setRegions}
                placeholder="e.g., Netherlands, Europe..."
                helpText="Geographic areas you serve"
              />
            </div>
          </div>

          {/* Value Proposition */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-950 dark:text-white">Value Proposition</h3>

            <div className="space-y-2">
              <Label htmlFor="bp-value">Unique Value Proposition</Label>
              <Textarea
                id="bp-value"
                value={uniqueValue}
                onChange={(e) => setUniqueValue(e.target.value)}
                placeholder="What makes your business different from competitors?"
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TagInput
                label="Customer Pain Points"
                value={painPoints}
                onChange={setPainPoints}
                placeholder="e.g., Wasting time on manual invoicing..."
                helpText="Problems your customers face that you solve"
              />
              <TagInput
                label="Buyer Triggers"
                value={buyerTriggers}
                onChange={setBuyerTriggers}
                placeholder="e.g., Growing team, need to scale..."
                helpText="What motivates customers to buy from you"
              />
            </div>
          </div>

          {/* Brand Voice */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-950 dark:text-white">Brand Voice</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bp-tone">Tone of Voice</Label>
                <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                  <SelectTrigger id="bp-tone">
                    <SelectValue placeholder="Select communication style" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  How the AI should communicate for your brand
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-avoid">Words to Avoid</Label>
                <Input
                  id="bp-avoid"
                  value={wordsToAvoid}
                  onChange={(e) => setWordsToAvoid(e.target.value)}
                  placeholder="e.g., cheap, basic, simple..."
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Comma-separated words the AI should never use
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
