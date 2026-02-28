import React from "react";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { baseStyles, colors } from "./shared/styles";
import {
  AddressBlock,
  DatesBlock,
  ReverseChargeNotice,
} from "./shared/components";
import { formatCurrency } from "./shared/format";
import type { PdfQuoteData } from "./index";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  FINALIZED: "Pending",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const TAX_LABELS: Record<string, string> = {
  STANDARD: "21%",
  REDUCED: "9%",
  EXEMPT: "0% Exempt",
  REVERSE_CHARGE: "0% RC",
  ZERO: "0%",
};

const VAT_GROUP_LABELS: Record<string, string> = {
  STANDARD: "21% Standard",
  REDUCED: "9% Low",
  EXEMPT: "0% Exempt",
  REVERSE_CHARGE: "0% Reverse Charge",
  ZERO: "0%",
};

export function QuotePdfDocument({ data }: { data: PdfQuoteData }) {
  const { quote, organization, client } = data;

  // Active items for totals (non-optional, or optional + selected)
  const activeItems = quote.items.filter(
    (item) => !item.isOptional || item.isSelected
  );

  const hasReverseCharge = activeItems.some(
    (item) => item.taxType === "REVERSE_CHARGE"
  );

  // VAT grouping
  const vatGroups = activeItems.reduce<
    Record<string, { label: string; amount: number }>
  >((acc, item) => {
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

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        {/* Header: Logo/Name + Quote title */}
        <View style={baseStyles.header}>
          <View>
            {organization.logo ? (
              <Image src={organization.logo} style={baseStyles.orgLogo} />
            ) : (
              <Text style={baseStyles.orgName}>{organization.name}</Text>
            )}
          </View>
          <View>
            <Text style={baseStyles.invoiceTitle}>QUOTE</Text>
            <Text style={baseStyles.invoiceNumber}>{quote.number}</Text>
            <Text style={baseStyles.statusBadge}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Text>
          </View>
        </View>

        {/* Quote Title */}
        {quote.title && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Helvetica-Bold",
                color: colors.zinc900,
              }}
            >
              {quote.title}
            </Text>
          </View>
        )}

        {/* Addresses + Dates */}
        <View style={baseStyles.addressSection}>
          <AddressBlock
            label="From"
            address={{
              name: organization.name,
              addressLine1: organization.addressLine1,
              addressLine2: organization.addressLine2,
              postalCode: organization.postalCode,
              city: organization.city,
              country: organization.country,
              vatNumber: organization.vatNumber,
            }}
          />
          <AddressBlock
            label="To"
            address={{
              name: client.name,
              companyName: client.companyName,
              contactName: client.contactName,
              addressLine1: client.addressLine1,
              addressLine2: client.addressLine2,
              postalCode: client.postalCode,
              city: client.city,
              country: client.country,
              vatNumber: client.vatNumber,
            }}
          />
          <DatesBlock
            dates={[
              { label: "Date", value: quote.createdAt },
              { label: "Valid Until", value: quote.validUntil ?? null },
            ]}
          />
        </View>

        {/* Introduction */}
        {quote.introduction && (
          <View style={{ marginBottom: 16 }}>
            <Text style={baseStyles.footerTitle}>Introduction</Text>
            <Text style={baseStyles.footerText}>{quote.introduction}</Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={baseStyles.table}>
          {/* Header */}
          <View style={baseStyles.tableHeader}>
            <Text
              style={[baseStyles.tableHeaderCell, baseStyles.colDescription]}
            >
              Description
            </Text>
            <Text style={[baseStyles.tableHeaderCell, baseStyles.colQty]}>
              Qty
            </Text>
            <Text style={[baseStyles.tableHeaderCell, baseStyles.colPrice]}>
              Unit Price
            </Text>
            <Text style={[baseStyles.tableHeaderCell, baseStyles.colTax]}>
              Tax
            </Text>
            <Text style={[baseStyles.tableHeaderCell, baseStyles.colAmount]}>
              Amount
            </Text>
          </View>

          {/* Rows */}
          {quote.items.map((item, i) => {
            const isInactive = item.isOptional && !item.isSelected;
            const dimmed = { color: colors.zinc400 };
            const cellStyle = isInactive
              ? { ...baseStyles.tableCell, ...dimmed }
              : baseStyles.tableCell;
            const amountStyle = isInactive
              ? { ...baseStyles.tableCell, ...dimmed }
              : baseStyles.tableCellBold;
            return (
              <View key={i} style={baseStyles.tableRow} wrap={false}>
                <View style={baseStyles.colDescription}>
                  <Text style={cellStyle}>
                    {item.description}
                    {item.isOptional ? " (optional)" : ""}
                  </Text>
                </View>
                <Text style={[cellStyle, baseStyles.colQty]}>
                  {item.quantity}
                </Text>
                <Text style={[cellStyle, baseStyles.colPrice]}>
                  {formatCurrency(item.unitPrice, quote.currency)}
                </Text>
                <Text style={[cellStyle, baseStyles.colTax]}>
                  {TAX_LABELS[item.taxType] || `${item.taxRate}%`}
                </Text>
                <Text style={[amountStyle, baseStyles.colAmount]}>
                  {formatCurrency(item.total, quote.currency)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={baseStyles.totalsContainer}>
          <View style={baseStyles.totalsBlock}>
            <View style={baseStyles.totalsRow}>
              <Text style={baseStyles.totalsLabel}>Subtotal</Text>
              <Text style={baseStyles.totalsValue}>
                {formatCurrency(quote.subtotal, quote.currency)}
              </Text>
            </View>
            {Object.entries(vatGroups).map(([type, group]) => (
              <View key={type} style={baseStyles.totalsRow}>
                <Text style={baseStyles.totalsLabel}>VAT {group.label}</Text>
                <Text style={baseStyles.totalsValue}>
                  {formatCurrency(group.amount, quote.currency)}
                </Text>
              </View>
            ))}
            <View style={baseStyles.totalsDivider} />
            <View style={baseStyles.totalsFinalRow}>
              <Text style={baseStyles.totalsFinalLabel}>Total</Text>
              <Text style={baseStyles.totalsFinalValue}>
                {formatCurrency(quote.total, quote.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reverse Charge Notice */}
        {hasReverseCharge && (
          <ReverseChargeNotice
            orgVatNumber={organization.vatNumber}
            clientVatNumber={client.vatNumber}
          />
        )}

        {/* Terms */}
        {quote.terms && (
          <View style={baseStyles.footerSection}>
            <Text style={baseStyles.footerTitle}>Terms & Conditions</Text>
            <Text style={baseStyles.footerText}>{quote.terms}</Text>
          </View>
        )}

        {/* Footer: IBAN + Registration */}
        {(organization.iban || organization.registrationNumber) && (
          <>
            <View style={baseStyles.footerDivider} />
            <View style={baseStyles.footerInfoRow}>
              {organization.iban && (
                <View style={baseStyles.footerInfoBlock}>
                  <Text style={baseStyles.footerInfoLabel}>IBAN</Text>
                  <Text style={baseStyles.footerInfoValue}>
                    {organization.iban}
                  </Text>
                </View>
              )}
              {organization.registrationNumber && (
                <View style={baseStyles.footerInfoBlock}>
                  <Text style={baseStyles.footerInfoLabel}>
                    Registration Number
                  </Text>
                  <Text style={baseStyles.footerInfoValue}>
                    {organization.registrationNumber}
                  </Text>
                </View>
              )}
              {organization.vatNumber && (
                <View style={baseStyles.footerInfoBlock}>
                  <Text style={baseStyles.footerInfoLabel}>VAT Number</Text>
                  <Text style={baseStyles.footerInfoValue}>
                    {organization.vatNumber}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}
