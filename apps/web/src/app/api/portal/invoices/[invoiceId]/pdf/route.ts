import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@servible/database";
import { generateInvoicePdf } from "@servible/pdf/generate";
import type { PdfInvoiceData } from "@servible/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await params;

    // Validate portal session
    const session = await db.portalSession.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      select: {
        clientId: true,
        client: {
          select: {
            organizationId: true,
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
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoice — must belong to client and be portal-visible
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        clientId: session.clientId,
        portalVisible: true,
        status: { not: "DRAFT" },
      },
      include: {
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

    // Fetch organization
    const organization = await db.organization.findUnique({
      where: { id: session.client.organizationId },
      select: {
        name: true,
        logo: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        country: true,
        vatNumber: true,
        registrationNumber: true,
        iban: true,
        email: true,
        phone: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
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
      organization,
      client: {
        name: session.client.name,
        companyName: session.client.companyName,
        addressLine1: session.client.addressLine1,
        addressLine2: session.client.addressLine2,
        postalCode: session.client.postalCode,
        city: session.client.city,
        country: session.client.country,
        vatNumber: session.client.vatNumber,
        email: session.client.email,
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
    console.error("Portal invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
