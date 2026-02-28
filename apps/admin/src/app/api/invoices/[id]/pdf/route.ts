import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { generateInvoicePdf } from "@servible/pdf/generate";
import type { PdfInvoiceData } from "@servible/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        client: {
          select: {
            name: true,
            companyName: true,
            email: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            postalCode: true,
            country: true,
            vatNumber: true,
          },
        },
        contact: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const pdfData: PdfInvoiceData = {
      invoice: {
        number: invoice.number,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        paymentTerms: invoice.paymentTerms,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        total: Number(invoice.total),
        paidAmount: Number(invoice.paidAmount),
        currency: invoice.currency,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxType: item.taxType,
          taxAmount: Number(item.taxAmount),
          subtotal: Number(item.subtotal),
          total: Number(item.total),
        })),
      },
      organization: {
        name: organization.name,
        logo: organization.logo,
        addressLine1: organization.addressLine1,
        addressLine2: organization.addressLine2,
        postalCode: organization.postalCode,
        city: organization.city,
        country: organization.country,
        vatNumber: organization.vatNumber,
        registrationNumber: organization.registrationNumber,
        iban: organization.iban,
        email: organization.email,
        phone: organization.phone,
      },
      client: {
        ...invoice.client,
        contactName: invoice.contact
          ? [invoice.contact.firstName, invoice.contact.lastName].filter(Boolean).join(" ")
          : null,
      },
    };

    const pdfBuffer = await generateInvoicePdf(pdfData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
