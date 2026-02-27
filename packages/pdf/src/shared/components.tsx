import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { baseStyles, colors } from "./styles";
import { formatCurrency, formatDate } from "./format";

// Types shared across PDF templates
export interface PdfAddress {
  name: string;
  companyName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  vatNumber?: string | null;
  email?: string | null;
}

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxType: string;
  taxAmount: number;
  subtotal: number;
  total: number;
}

// ----- Address Block -----

export function AddressBlock({
  label,
  address,
}: {
  label: string;
  address: PdfAddress;
}) {
  return (
    <View style={baseStyles.addressBlock}>
      <Text style={baseStyles.addressLabel}>{label}</Text>
      <Text style={baseStyles.addressName}>
        {address.companyName || address.name}
      </Text>
      {address.companyName && (
        <Text style={baseStyles.addressLine}>{address.name}</Text>
      )}
      {address.addressLine1 && (
        <Text style={baseStyles.addressLine}>{address.addressLine1}</Text>
      )}
      {address.addressLine2 && (
        <Text style={baseStyles.addressLine}>{address.addressLine2}</Text>
      )}
      {(address.postalCode || address.city) && (
        <Text style={baseStyles.addressLine}>
          {[address.postalCode, address.city].filter(Boolean).join(" ")}
        </Text>
      )}
      {address.country && (
        <Text style={baseStyles.addressLine}>{address.country}</Text>
      )}
      {address.vatNumber && (
        <Text style={baseStyles.addressVat}>VAT: {address.vatNumber}</Text>
      )}
    </View>
  );
}

// ----- Dates Block -----

export function DatesBlock({
  dates,
}: {
  dates: Array<{ label: string; value: Date | string | null }>;
}) {
  return (
    <View style={baseStyles.dateBlock}>
      {dates
        .filter((d) => d.value)
        .map((d) => (
          <View key={d.label} style={baseStyles.dateRow}>
            <Text style={baseStyles.dateLabel}>{d.label}:</Text>
            <Text style={baseStyles.dateValue}>{formatDate(d.value)}</Text>
          </View>
        ))}
    </View>
  );
}

// ----- Line Items Table -----

const TAX_LABELS: Record<string, string> = {
  STANDARD: "21%",
  REDUCED: "9%",
  EXEMPT: "0% Exempt",
  REVERSE_CHARGE: "0% RC",
  ZERO: "0%",
};

export function LineItemsTable({
  items,
  currency,
}: {
  items: PdfLineItem[];
  currency: string;
}) {
  return (
    <View style={baseStyles.table}>
      {/* Header */}
      <View style={baseStyles.tableHeader}>
        <Text style={[baseStyles.tableHeaderCell, baseStyles.colDescription]}>
          Description
        </Text>
        <Text style={[baseStyles.tableHeaderCell, baseStyles.colQty]}>Qty</Text>
        <Text style={[baseStyles.tableHeaderCell, baseStyles.colPrice]}>
          Unit Price
        </Text>
        <Text style={[baseStyles.tableHeaderCell, baseStyles.colTax]}>Tax</Text>
        <Text style={[baseStyles.tableHeaderCell, baseStyles.colAmount]}>
          Amount
        </Text>
      </View>

      {/* Rows */}
      {items.map((item, i) => (
        <View key={i} style={baseStyles.tableRow} wrap={false}>
          <Text style={[baseStyles.tableCell, baseStyles.colDescription]}>
            {item.description}
          </Text>
          <Text style={[baseStyles.tableCell, baseStyles.colQty]}>
            {item.quantity}
          </Text>
          <Text style={[baseStyles.tableCell, baseStyles.colPrice]}>
            {formatCurrency(item.unitPrice, currency)}
          </Text>
          <Text style={[baseStyles.tableCell, baseStyles.colTax]}>
            {TAX_LABELS[item.taxType] || `${item.taxRate}%`}
          </Text>
          <Text style={[baseStyles.tableCellBold, baseStyles.colAmount]}>
            {formatCurrency(item.total, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ----- Totals Section -----

interface VatGroup {
  label: string;
  amount: number;
}

const VAT_GROUP_LABELS: Record<string, string> = {
  STANDARD: "21% Standard",
  REDUCED: "9% Low",
  EXEMPT: "0% Exempt",
  REVERSE_CHARGE: "0% Reverse Charge",
  ZERO: "0%",
};

export function TotalsSection({
  items,
  subtotal,
  taxAmount,
  total,
  paidAmount,
  currency,
}: {
  items: PdfLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  currency: string;
}) {
  // Group VAT by type
  const vatGroups = items.reduce<Record<string, VatGroup>>((acc, item) => {
    const type = item.taxType || "STANDARD";
    if (!acc[type]) {
      acc[type] = {
        label: VAT_GROUP_LABELS[type] || `${item.taxRate}%`,
        amount: 0,
      };
    }
    acc[type].amount += item.taxAmount;
    return acc;
  }, {});

  const balanceDue = total - paidAmount;

  return (
    <View style={baseStyles.totalsContainer}>
      <View style={baseStyles.totalsBlock}>
        {/* Subtotal */}
        <View style={baseStyles.totalsRow}>
          <Text style={baseStyles.totalsLabel}>Subtotal</Text>
          <Text style={baseStyles.totalsValue}>
            {formatCurrency(subtotal, currency)}
          </Text>
        </View>

        {/* VAT lines */}
        {Object.entries(vatGroups).map(([type, group]) => (
          <View key={type} style={baseStyles.totalsRow}>
            <Text style={baseStyles.totalsLabel}>VAT {group.label}</Text>
            <Text style={baseStyles.totalsValue}>
              {formatCurrency(group.amount, currency)}
            </Text>
          </View>
        ))}

        {/* Divider + Total */}
        <View style={baseStyles.totalsDivider} />
        <View style={baseStyles.totalsFinalRow}>
          <Text style={baseStyles.totalsFinalLabel}>Total</Text>
          <Text style={baseStyles.totalsFinalValue}>
            {formatCurrency(total, currency)}
          </Text>
        </View>

        {/* Paid + Balance Due */}
        {paidAmount > 0 && (
          <>
            <View style={baseStyles.totalsRow}>
              <Text style={baseStyles.totalsLabel}>Paid</Text>
              <Text style={{ ...baseStyles.totalsValue, color: colors.green600 }}>
                -{formatCurrency(paidAmount, currency)}
              </Text>
            </View>
            <View style={baseStyles.totalsDivider} />
            <View style={baseStyles.totalsFinalRow}>
              <Text style={baseStyles.totalsFinalLabel}>Balance Due</Text>
              <Text style={baseStyles.totalsFinalValue}>
                {formatCurrency(balanceDue, currency)}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ----- Reverse Charge Notice -----

export function ReverseChargeNotice({
  orgVatNumber,
  clientVatNumber,
}: {
  orgVatNumber?: string | null;
  clientVatNumber?: string | null;
}) {
  return (
    <View style={baseStyles.reverseChargeBox}>
      <Text style={baseStyles.reverseChargeTitle}>
        VAT reverse charged / BTW verlegd
      </Text>
      {orgVatNumber && (
        <Text style={baseStyles.reverseChargeText}>
          Supplier VAT: {orgVatNumber}
        </Text>
      )}
      {clientVatNumber && (
        <Text style={baseStyles.reverseChargeText}>
          Client VAT: {clientVatNumber}
        </Text>
      )}
    </View>
  );
}
