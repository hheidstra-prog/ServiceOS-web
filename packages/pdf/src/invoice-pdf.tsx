import React from "react";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { baseStyles } from "./shared/styles";
import {
  AddressBlock,
  DatesBlock,
  LineItemsTable,
  TotalsSection,
  ReverseChargeNotice,
} from "./shared/components";
import type { PdfInvoiceData } from "./index";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function InvoicePdfDocument({ data }: { data: PdfInvoiceData }) {
  const { invoice, organization, client } = data;
  const hasReverseCharge = invoice.items.some(
    (item) => item.taxType === "REVERSE_CHARGE"
  );

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        {/* Header: Logo/Name + Invoice title */}
        <View style={baseStyles.header}>
          <View>
            {organization.logo ? (
              <Image src={organization.logo} style={baseStyles.orgLogo} />
            ) : (
              <Text style={baseStyles.orgName}>{organization.name}</Text>
            )}
          </View>
          <View>
            <Text style={baseStyles.invoiceTitle}>INVOICE</Text>
            <Text style={baseStyles.invoiceNumber}>{invoice.number}</Text>
            <Text style={baseStyles.statusBadge}>
              {STATUS_LABELS[invoice.status] || invoice.status}
            </Text>
          </View>
        </View>

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
              { label: "Issue Date", value: invoice.issueDate },
              { label: "Due Date", value: invoice.dueDate },
              { label: "Paid Date", value: invoice.paidAt ?? null },
            ]}
          />
        </View>

        {/* Line Items Table */}
        <LineItemsTable items={invoice.items} currency={invoice.currency} />

        {/* Totals */}
        <TotalsSection
          items={invoice.items}
          subtotal={invoice.subtotal}
          taxAmount={invoice.taxAmount}
          total={invoice.total}
          paidAmount={invoice.paidAmount}
          currency={invoice.currency}
        />

        {/* Reverse Charge Notice */}
        {hasReverseCharge && (
          <ReverseChargeNotice
            orgVatNumber={organization.vatNumber}
            clientVatNumber={client.vatNumber}
          />
        )}

        {/* Notes & Payment Terms */}
        {(invoice.notes || invoice.paymentTerms) && (
          <View style={baseStyles.footerSection}>
            {invoice.notes && (
              <View style={{ marginBottom: 8 }}>
                <Text style={baseStyles.footerTitle}>Notes</Text>
                <Text style={baseStyles.footerText}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.paymentTerms && (
              <View>
                <Text style={baseStyles.footerTitle}>Payment Terms</Text>
                <Text style={baseStyles.footerText}>
                  {invoice.paymentTerms}
                </Text>
              </View>
            )}
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
