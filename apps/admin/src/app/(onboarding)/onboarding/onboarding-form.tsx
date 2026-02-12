"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completeOnboarding } from "./actions";

const countries = [
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "BE", name: "Belgium", currency: "EUR" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "AT", name: "Austria", currency: "EUR" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
];

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
];

interface OnboardingFormProps {
  initialName?: string;
  initialEmail?: string;
}

export function OnboardingForm({ initialName, initialEmail }: OnboardingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState(initialName || "");
  const [country, setCountry] = useState("NL");
  const [currency, setCurrency] = useState("EUR");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  // Auto-update currency when country changes
  const handleCountryChange = (value: string) => {
    setCountry(value);
    const selectedCountry = countries.find((c) => c.code === value);
    if (selectedCountry) {
      setCurrency(selectedCountry.currency);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await completeOnboarding({
        businessName,
        country,
        currency,
        website: website || undefined,
        phone: phone || undefined,
      });
      // Redirect happens in the server action
    } catch (error) {
      console.error("Onboarding error:", error);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
          <CardDescription>
            Tell us about your business so we can set things up for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              placeholder="My Awesome Business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          {/* Country & Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll use this later to help generate your profile and content.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+31 6 12345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading || !businessName}>
        {isLoading ? "Setting up..." : "Complete Setup"}
      </Button>
    </form>
  );
}
