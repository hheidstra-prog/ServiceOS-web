import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  zinc50: "#fafafa",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  zinc300: "#d4d4d8",
  zinc400: "#a1a1aa",
  zinc500: "#71717a",
  zinc600: "#52525b",
  zinc700: "#3f3f46",
  zinc800: "#27272a",
  zinc900: "#18181b",
  zinc950: "#09090b",
  white: "#ffffff",
  green600: "#16a34a",
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.zinc900,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  orgLogo: {
    maxHeight: 40,
    maxWidth: 160,
  },
  orgName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.zinc600,
    textAlign: "right",
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 4,
  },
  // Address section
  addressSection: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 20,
  },
  addressBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  addressName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    color: colors.zinc700,
    marginBottom: 1,
  },
  addressVat: {
    fontSize: 8,
    color: colors.zinc500,
    marginTop: 4,
  },
  // Dates
  dateBlock: {
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 9,
    color: colors.zinc500,
    width: 70,
  },
  dateValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc200,
    paddingBottom: 6,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.zinc100,
    paddingVertical: 6,
    minHeight: 24,
  },
  tableCell: {
    fontSize: 9,
    color: colors.zinc700,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
  },
  // Columns
  colDescription: { flex: 1, paddingRight: 8 },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 75, textAlign: "right" },
  colTax: { width: 50, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  totalsBlock: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: colors.zinc600,
  },
  totalsValue: {
    fontSize: 9,
    color: colors.zinc900,
  },
  totalsDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc200,
    marginVertical: 2,
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
  },
  // Reverse charge
  reverseChargeBox: {
    backgroundColor: colors.zinc50,
    borderWidth: 0.5,
    borderColor: colors.zinc200,
    borderRadius: 4,
    padding: 8,
    marginBottom: 20,
  },
  reverseChargeTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc600,
    marginBottom: 2,
  },
  reverseChargeText: {
    fontSize: 8,
    color: colors.zinc500,
  },
  // Footer
  footerSection: {
    marginTop: 10,
  },
  footerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc900,
    marginBottom: 3,
  },
  footerText: {
    fontSize: 8,
    color: colors.zinc600,
    lineHeight: 1.4,
  },
  footerDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.zinc200,
    marginVertical: 10,
  },
  footerInfoRow: {
    flexDirection: "row",
    gap: 20,
  },
  footerInfoBlock: {
    flex: 1,
  },
  footerInfoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  footerInfoValue: {
    fontSize: 8,
    color: colors.zinc700,
  },
});
