import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@servible/database";
import { generateQuotePdf } from "@servible/pdf/generate";
import type { PdfQuoteData } from "@servible/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quoteId } = await params;

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

    // Fetch quote — must belong to client and be portal-visible
    const quote = await db.quote.findFirst({
      where: {
        id: quoteId,
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

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
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

    const pdfData: PdfQuoteData = {
      quote: {
        number: quote.number,
        status: quote.status,
        title: quote.title,
        introduction: quote.introduction,
        terms: quote.terms,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        total: Number(quote.total),
        currency: quote.currency,
        items: quote.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          taxType: item.taxType,
          taxAmount: Number(item.taxAmount),
          subtotal: Number(item.subtotal),
          total: Number(item.total),
          isOptional: item.isOptional,
          isSelected: item.isSelected,
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

    const pdfBuffer = await generateQuotePdf(pdfData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Portal quote PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
