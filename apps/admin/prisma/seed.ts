import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Find the first organization (created during onboarding)
  const organization = await prisma.organization.findFirst();

  if (!organization) {
    console.log("No organization found. Please complete onboarding first.");
    return;
  }

  // Find or create a user for createdBy relations
  const user = await prisma.user.findFirst({
    where: { memberships: { some: { organizationId: organization.id } } },
  });

  console.log(`Found organization: ${organization.name}`);

  // Create sample clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: "seed-client-1" },
      update: {},
      create: {
        id: "seed-client-1",
        organizationId: organization.id,
        name: "Jan van der Berg",
        email: "jan@vandenberg.nl",
        phone: "+31 6 12345678",
        companyName: "Van der Berg Consultancy",
        addressLine1: "Keizersgracht 123",
        city: "Amsterdam",
        postalCode: "1015 CJ",
        country: "Netherlands",
        vatNumber: "NL123456789B01",
        status: "CLIENT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-2" },
      update: {},
      create: {
        id: "seed-client-2",
        organizationId: organization.id,
        name: "Sophie de Vries",
        email: "sophie@techstart.io",
        phone: "+31 6 87654321",
        companyName: "TechStart BV",
        addressLine1: "Herengracht 456",
        city: "Amsterdam",
        postalCode: "1017 CA",
        country: "Netherlands",
        vatNumber: "NL987654321B01",
        status: "PROSPECT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-3" },
      update: {},
      create: {
        id: "seed-client-3",
        organizationId: organization.id,
        name: "Michael Johnson",
        email: "michael@johnson-partners.com",
        phone: "+44 7700 900123",
        companyName: "Johnson & Partners Ltd",
        addressLine1: "10 Downing Street",
        city: "London",
        postalCode: "SW1A 2AA",
        country: "United Kingdom",
        status: "LEAD",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-4" },
      update: {},
      create: {
        id: "seed-client-4",
        organizationId: organization.id,
        name: "Anna Müller",
        email: "anna.mueller@design-studio.de",
        phone: "+49 30 12345678",
        companyName: "Design Studio Berlin",
        addressLine1: "Friedrichstraße 100",
        city: "Berlin",
        postalCode: "10117",
        country: "Germany",
        vatNumber: "DE123456789",
        status: "PROSPECT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-5" },
      update: {},
      create: {
        id: "seed-client-5",
        organizationId: organization.id,
        name: "Peter Bakker",
        email: "peter@bakker-bouw.nl",
        phone: "+31 6 11223344",
        companyName: "Bakker Bouw BV",
        addressLine1: "Industrieweg 50",
        city: "Rotterdam",
        postalCode: "3044 AE",
        country: "Netherlands",
        vatNumber: "NL111222333B01",
        status: "CLIENT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-6" },
      update: {},
      create: {
        id: "seed-client-6",
        organizationId: organization.id,
        name: "Lisa Jansen",
        email: "lisa@jansen-coaching.nl",
        phone: "+31 6 99887766",
        companyName: null,
        addressLine1: "Vondelpark 1",
        city: "Amsterdam",
        postalCode: "1071 AA",
        country: "Netherlands",
        status: "CLIENT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-7" },
      update: {},
      create: {
        id: "seed-client-7",
        organizationId: organization.id,
        name: "Thomas de Groot",
        email: "thomas@degroot-advocaten.nl",
        phone: "+31 20 1234567",
        companyName: "De Groot Advocaten",
        addressLine1: "Zuidas 200",
        city: "Amsterdam",
        postalCode: "1082 MD",
        country: "Netherlands",
        vatNumber: "NL555666777B01",
        status: "PROSPECT",
      },
    }),
    prisma.client.upsert({
      where: { id: "seed-client-8" },
      update: {},
      create: {
        id: "seed-client-8",
        organizationId: organization.id,
        name: "Emma van Dijk",
        email: "emma@vandijk-photography.nl",
        phone: "+31 6 55443322",
        companyName: "Van Dijk Photography",
        addressLine1: "Prinsengracht 789",
        city: "Amsterdam",
        postalCode: "1017 JZ",
        country: "Netherlands",
        status: "CLIENT",
      },
    }),
  ]);

  console.log(`Created ${clients.length} clients`);

  // Create contacts for clients
  const contacts = await Promise.all([
    // Jan van der Berg - 2 contacts
    prisma.contact.upsert({
      where: { id: "seed-contact-1" },
      update: {},
      create: {
        id: "seed-contact-1",
        clientId: "seed-client-1",
        firstName: "Jan",
        lastName: "van der Berg",
        email: "jan@vandenberg.nl",
        phone: "+31 6 12345678",
        role: "Owner",
        isPrimary: true,
      },
    }),
    prisma.contact.upsert({
      where: { id: "seed-contact-2" },
      update: {},
      create: {
        id: "seed-contact-2",
        clientId: "seed-client-1",
        firstName: "Marieke",
        lastName: "van der Berg",
        email: "marieke@vandenberg.nl",
        phone: "+31 6 12345679",
        role: "Finance",
        isPrimary: false,
      },
    }),
    // Sophie de Vries - 2 contacts
    prisma.contact.upsert({
      where: { id: "seed-contact-3" },
      update: {},
      create: {
        id: "seed-contact-3",
        clientId: "seed-client-2",
        firstName: "Sophie",
        lastName: "de Vries",
        email: "sophie@techstart.io",
        phone: "+31 6 87654321",
        role: "CEO",
        isPrimary: true,
      },
    }),
    prisma.contact.upsert({
      where: { id: "seed-contact-4" },
      update: {},
      create: {
        id: "seed-contact-4",
        clientId: "seed-client-2",
        firstName: "Daan",
        lastName: "Visser",
        email: "daan@techstart.io",
        phone: "+31 6 87654322",
        role: "CTO",
        isPrimary: false,
      },
    }),
    // Michael Johnson - 1 contact
    prisma.contact.upsert({
      where: { id: "seed-contact-5" },
      update: {},
      create: {
        id: "seed-contact-5",
        clientId: "seed-client-3",
        firstName: "Michael",
        lastName: "Johnson",
        email: "michael@johnson-partners.com",
        phone: "+44 7700 900123",
        role: "Managing Partner",
        isPrimary: true,
      },
    }),
    // Anna Müller - 1 contact
    prisma.contact.upsert({
      where: { id: "seed-contact-6" },
      update: {},
      create: {
        id: "seed-contact-6",
        clientId: "seed-client-4",
        firstName: "Anna",
        lastName: "Müller",
        email: "anna.mueller@design-studio.de",
        phone: "+49 30 12345678",
        role: "Creative Director",
        isPrimary: true,
      },
    }),
  ]);

  console.log(`Created ${contacts.length} contacts`);

  // Create projects for clients
  const projects = await Promise.all([
    // Jan van der Berg - Active client with ongoing project
    prisma.project.upsert({
      where: { id: "seed-project-1" },
      update: {},
      create: {
        id: "seed-project-1",
        organizationId: organization.id,
        clientId: "seed-client-1",
        name: "Website Redesign 2024",
        description: "Complete redesign of the corporate website with new branding.",
        status: "IN_PROGRESS",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-04-30"),
        budget: 8500,
        currency: "EUR",
      },
    }),
    prisma.project.upsert({
      where: { id: "seed-project-2" },
      update: {},
      create: {
        id: "seed-project-2",
        organizationId: organization.id,
        clientId: "seed-client-1",
        name: "Monthly Maintenance",
        description: "Ongoing website maintenance and support.",
        status: "IN_PROGRESS",
        startDate: new Date("2023-06-01"),
        budget: 200,
        currency: "EUR",
      },
    }),
    // Sophie de Vries - Quote sent
    prisma.project.upsert({
      where: { id: "seed-project-3" },
      update: {},
      create: {
        id: "seed-project-3",
        organizationId: organization.id,
        clientId: "seed-client-2",
        name: "Startup Website",
        description: "New website for tech startup with product showcase and blog.",
        status: "NOT_STARTED",
        budget: 5500,
        currency: "EUR",
      },
    }),
    // Anna Müller - Contract signed
    prisma.project.upsert({
      where: { id: "seed-project-4" },
      update: {},
      create: {
        id: "seed-project-4",
        organizationId: organization.id,
        clientId: "seed-client-4",
        name: "Design Collaboration Q1",
        description: "Joint design project for shared clients.",
        status: "IN_PROGRESS",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-03-31"),
        budget: 12000,
        currency: "EUR",
      },
    }),
    // Emma van Dijk - Completed
    prisma.project.upsert({
      where: { id: "seed-project-5" },
      update: {},
      create: {
        id: "seed-project-5",
        organizationId: organization.id,
        clientId: "seed-client-8",
        name: "Portfolio Website",
        description: "Photography portfolio with gallery and booking system.",
        status: "COMPLETED",
        startDate: new Date("2023-10-01"),
        endDate: new Date("2023-12-15"),
        budget: 3500,
        currency: "EUR",
      },
    }),
  ]);

  console.log(`Created ${projects.length} projects`);

  // Create notes for clients
  const notes = await Promise.all([
    // Jan van der Berg
    prisma.note.upsert({
      where: { id: "seed-note-1" },
      update: {},
      create: {
        id: "seed-note-1",
        clientId: "seed-client-1",
        content: "Long-term client since 2021. Always pays on time. Prefers email communication over phone calls.",
        isPinned: true,
        createdById: user?.id,
      },
    }),
    prisma.note.upsert({
      where: { id: "seed-note-2" },
      update: {},
      create: {
        id: "seed-note-2",
        clientId: "seed-client-1",
        content: "Discussed expanding maintenance contract to include social media management. Will follow up next month.",
        isPinned: false,
        createdById: user?.id,
      },
    }),
    // Sophie de Vries
    prisma.note.upsert({
      where: { id: "seed-note-3" },
      update: {},
      create: {
        id: "seed-note-3",
        clientId: "seed-client-2",
        content: "Hot lead! Very interested in our services. Startup recently raised Series A funding.",
        isPinned: true,
        createdById: user?.id,
      },
    }),
    // Michael Johnson
    prisma.note.upsert({
      where: { id: "seed-note-4" },
      update: {},
      create: {
        id: "seed-note-4",
        clientId: "seed-client-3",
        content: "Referred by Jan van der Berg. Looking for a complete digital transformation for their law firm.",
        isPinned: false,
        createdById: user?.id,
      },
    }),
    // Anna Müller
    prisma.note.upsert({
      where: { id: "seed-note-5" },
      update: {},
      create: {
        id: "seed-note-5",
        clientId: "seed-client-4",
        content: "Great collaboration partner. We often refer clients to each other for design work.",
        isPinned: true,
        createdById: user?.id,
      },
    }),
    // Peter Bakker
    prisma.note.upsert({
      where: { id: "seed-note-6" },
      update: {},
      create: {
        id: "seed-note-6",
        clientId: "seed-client-5",
        content: "Invoice sent on 15th. Payment expected within 30 days per contract terms.",
        isPinned: false,
        createdById: user?.id,
      },
    }),
  ]);

  console.log(`Created ${notes.length} notes`);

  // Create events for clients
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = await Promise.all([
    // Jan van der Berg - Active client with history
    prisma.event.upsert({
      where: { id: "seed-event-1" },
      update: {},
      create: {
        id: "seed-event-1",
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        type: "MEETING",
        title: "Project kickoff meeting",
        description: "Discussed project scope, timeline, and deliverables for the website redesign.",
        completedAt: daysAgo(45),
        createdById: user?.id,
        createdAt: daysAgo(45),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-2" },
      update: {},
      create: {
        id: "seed-event-2",
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        type: "EMAIL_SENT",
        title: "Sent design mockups",
        description: "Shared first round of homepage and about page mockups for review.",
        completedAt: daysAgo(30),
        createdById: user?.id,
        createdAt: daysAgo(30),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-3" },
      update: {},
      create: {
        id: "seed-event-3",
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        type: "CALL",
        title: "Design feedback call",
        description: "Client approved designs with minor revisions to color scheme.",
        completedAt: daysAgo(25),
        createdById: user?.id,
        createdAt: daysAgo(25),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-4" },
      update: {},
      create: {
        id: "seed-event-4",
        clientId: "seed-client-1",
        type: "APPOINTMENT",
        title: "Monthly check-in",
        scheduledAt: daysFromNow(5),
        createdById: user?.id,
      },
    }),
    // Sophie de Vries - Quote sent
    prisma.event.upsert({
      where: { id: "seed-event-5" },
      update: {},
      create: {
        id: "seed-event-5",
        clientId: "seed-client-2",
        type: "CALL",
        title: "Initial discovery call",
        description: "Discussed their needs for a new startup website. Very enthusiastic about modern design.",
        completedAt: daysAgo(10),
        createdById: user?.id,
        createdAt: daysAgo(10),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-6" },
      update: {},
      create: {
        id: "seed-event-6",
        clientId: "seed-client-2",
        type: "QUOTE_SENT",
        title: "Sent project quote",
        description: "Quote for €5,500 including design, development, and 3 months of support.",
        completedAt: daysAgo(7),
        createdById: user?.id,
        createdAt: daysAgo(7),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-7" },
      update: {},
      create: {
        id: "seed-event-7",
        clientId: "seed-client-2",
        type: "APPOINTMENT",
        title: "Follow-up call",
        description: "Scheduled to discuss quote and answer questions.",
        scheduledAt: daysFromNow(2),
        createdById: user?.id,
      },
    }),
    // Michael Johnson - Lead
    prisma.event.upsert({
      where: { id: "seed-event-8" },
      update: {},
      create: {
        id: "seed-event-8",
        clientId: "seed-client-3",
        type: "EMAIL_RECEIVED",
        title: "Initial inquiry received",
        description: "Received via referral from Jan van der Berg. Interested in digital services.",
        completedAt: daysAgo(3),
        createdById: user?.id,
        createdAt: daysAgo(3),
      },
    }),
    prisma.event.upsert({
      where: { id: "seed-event-9" },
      update: {},
      create: {
        id: "seed-event-9",
        clientId: "seed-client-3",
        type: "APPOINTMENT",
        title: "Intro meeting",
        description: "Virtual meeting to discuss their requirements.",
        scheduledAt: daysFromNow(7),
        createdById: user?.id,
      },
    }),
    // Anna Müller - Contract signed
    prisma.event.upsert({
      where: { id: "seed-event-10" },
      update: {},
      create: {
        id: "seed-event-10",
        clientId: "seed-client-4",
        type: "CONTRACT_SIGNED",
        title: "Q1 collaboration contract signed",
        description: "Partnership agreement for joint design projects.",
        completedAt: daysAgo(20),
        createdById: user?.id,
        createdAt: daysAgo(20),
      },
    }),
    // Peter Bakker - Invoiced
    prisma.event.upsert({
      where: { id: "seed-event-11" },
      update: {},
      create: {
        id: "seed-event-11",
        clientId: "seed-client-5",
        type: "INVOICE_SENT",
        title: "Final invoice sent",
        description: "Invoice #2024-015 for completed website project.",
        completedAt: daysAgo(15),
        createdById: user?.id,
        createdAt: daysAgo(15),
      },
    }),
    // Lisa Jansen - Paid
    prisma.event.upsert({
      where: { id: "seed-event-12" },
      update: {},
      create: {
        id: "seed-event-12",
        clientId: "seed-client-6",
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        description: "Full payment received for coaching website project.",
        completedAt: daysAgo(5),
        createdById: user?.id,
        createdAt: daysAgo(5),
      },
    }),
  ]);

  console.log(`Created ${events.length} events`);

  // Create sample services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "seed-service-1" },
      update: {},
      create: {
        id: "seed-service-1",
        organizationId: organization.id,
        name: "Website Design",
        description: "Custom website design including UX/UI, responsive design, and 3 revision rounds.",
        pricingType: "FIXED",
        price: 2500,
        currency: "EUR",
        taxType: "STANDARD",
      },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-2" },
      update: {},
      create: {
        id: "seed-service-2",
        organizationId: organization.id,
        name: "Consultation",
        description: "Strategic consultation session for digital transformation and technology advice.",
        pricingType: "HOURLY",
        price: 150,
        currency: "EUR",
        unit: "hour",
        taxType: "STANDARD",
      },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-3" },
      update: {},
      create: {
        id: "seed-service-3",
        organizationId: organization.id,
        name: "Website Maintenance",
        description: "Monthly website maintenance including security updates, backups, and minor content changes.",
        pricingType: "MONTHLY",
        price: 200,
        currency: "EUR",
        taxType: "STANDARD",
      },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-4" },
      update: {},
      create: {
        id: "seed-service-4",
        organizationId: organization.id,
        name: "Logo Design",
        description: "Professional logo design including 3 concepts and 2 revision rounds.",
        pricingType: "FIXED",
        price: 750,
        currency: "EUR",
        taxType: "STANDARD",
      },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-5" },
      update: {},
      create: {
        id: "seed-service-5",
        organizationId: organization.id,
        name: "Development",
        description: "Custom web development and programming services.",
        pricingType: "HOURLY",
        price: 125,
        currency: "EUR",
        unit: "hour",
        taxType: "STANDARD",
      },
    }),
  ]);

  console.log(`Created ${services.length} services`);

  // Create sample booking types
  const bookingTypes = await Promise.all([
    prisma.bookingType.upsert({
      where: { id: "seed-booking-type-1" },
      update: {},
      create: {
        id: "seed-booking-type-1",
        organizationId: organization.id,
        name: "Intake Call",
        description: "30-minute introductory call to discuss your project and requirements.",
        durationMinutes: 30,
        color: "#3B82F6",
      },
    }),
    prisma.bookingType.upsert({
      where: { id: "seed-booking-type-2" },
      update: {},
      create: {
        id: "seed-booking-type-2",
        organizationId: organization.id,
        name: "Consultation",
        description: "1-hour in-depth consultation session.",
        durationMinutes: 60,
        price: 150,
        currency: "EUR",
        color: "#10B981",
      },
    }),
    prisma.bookingType.upsert({
      where: { id: "seed-booking-type-3" },
      update: {},
      create: {
        id: "seed-booking-type-3",
        organizationId: organization.id,
        name: "Project Review",
        description: "45-minute session to review project progress and gather feedback.",
        durationMinutes: 45,
        color: "#F59E0B",
      },
    }),
  ]);

  console.log(`Created ${bookingTypes.length} booking types`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
