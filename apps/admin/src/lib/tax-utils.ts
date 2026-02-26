import type { TaxType } from "@prisma/client";

export const TAX_TYPE_CONFIG: Record<
  Exclude<TaxType, "ZERO">,
  { label: string; rate: number; shortLabel: string }
> = {
  STANDARD: { label: "21% Standard", rate: 21, shortLabel: "21%" },
  REDUCED: { label: "9% Low", rate: 9, shortLabel: "9%" },
  EXEMPT: { label: "0% Exempt", rate: 0, shortLabel: "0%" },
  REVERSE_CHARGE: {
    label: "0% Reverse Charge",
    rate: 0,
    shortLabel: "0% RC",
  },
};

export const TAX_TYPE_OPTIONS = Object.entries(TAX_TYPE_CONFIG).map(
  ([value, config]) => ({
    value: value as Exclude<TaxType, "ZERO">,
    label: config.label,
  })
);

export function taxRateFromType(taxType: TaxType): number {
  if (taxType === "ZERO") return 0;
  return TAX_TYPE_CONFIG[taxType].rate;
}
