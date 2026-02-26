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
        status: "ACTIVE",
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
        status: "QUOTE_SENT",
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
        status: "CONTRACT_SIGNED",
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
        status: "INVOICED",
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
        status: "PAID",
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
        status: "QUOTE_ACCEPTED",
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
        status: "COMPLETED",
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
        taxRate: 21,
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
        taxRate: 21,
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
        taxRate: 21,
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
        taxRate: 21,
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
        taxRate: 21,
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

  // Create project tasks
  const projectTasks = await Promise.all([
    // Website Redesign 2024 tasks
    prisma.projectTask.upsert({
      where: { id: "seed-task-1" },
      update: {},
      create: {
        id: "seed-task-1",
        projectId: "seed-project-1",
        title: "Wireframes & sitemap",
        description: "Create wireframes for all key pages and finalize site structure.",
        status: "DONE",
        priority: "HIGH",
        sortOrder: 0,
        estimatedHours: 8,
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-2" },
      update: {},
      create: {
        id: "seed-task-2",
        projectId: "seed-project-1",
        title: "Visual design homepage",
        description: "High-fidelity design for the homepage based on approved wireframes.",
        status: "DONE",
        priority: "HIGH",
        sortOrder: 1,
        estimatedHours: 12,
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-3" },
      update: {},
      create: {
        id: "seed-task-3",
        projectId: "seed-project-1",
        title: "Inner page designs",
        description: "Design about, services, and contact pages.",
        status: "DONE",
        priority: "MEDIUM",
        sortOrder: 2,
        estimatedHours: 16,
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-4" },
      update: {},
      create: {
        id: "seed-task-4",
        projectId: "seed-project-1",
        title: "Frontend development",
        description: "Build responsive frontend with Next.js and Tailwind CSS.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        sortOrder: 3,
        estimatedHours: 40,
        dueDate: daysFromNow(10),
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-5" },
      update: {},
      create: {
        id: "seed-task-5",
        projectId: "seed-project-1",
        title: "CMS integration",
        description: "Set up content management and connect to headless CMS.",
        status: "TODO",
        priority: "MEDIUM",
        sortOrder: 4,
        estimatedHours: 16,
        dueDate: daysFromNow(18),
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-6" },
      update: {},
      create: {
        id: "seed-task-6",
        projectId: "seed-project-1",
        title: "Testing & QA",
        description: "Cross-browser testing, performance optimization, and accessibility check.",
        status: "TODO",
        priority: "MEDIUM",
        sortOrder: 5,
        estimatedHours: 8,
        dueDate: daysFromNow(25),
      },
    }),
    // Design Collaboration tasks
    prisma.projectTask.upsert({
      where: { id: "seed-task-7" },
      update: {},
      create: {
        id: "seed-task-7",
        projectId: "seed-project-4",
        title: "Brand guidelines review",
        description: "Align on shared brand guidelines for the collaboration.",
        status: "DONE",
        priority: "HIGH",
        sortOrder: 0,
        estimatedHours: 4,
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-8" },
      update: {},
      create: {
        id: "seed-task-8",
        projectId: "seed-project-4",
        title: "Design system components",
        description: "Build shared component library in Figma.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        sortOrder: 1,
        estimatedHours: 20,
        dueDate: daysFromNow(5),
      },
    }),
    prisma.projectTask.upsert({
      where: { id: "seed-task-9" },
      update: {},
      create: {
        id: "seed-task-9",
        projectId: "seed-project-4",
        title: "Client presentation deck",
        description: "Prepare joint presentation for shared client pitch.",
        status: "TODO",
        priority: "URGENT",
        sortOrder: 2,
        estimatedHours: 6,
        dueDate: daysFromNow(3),
      },
    }),
  ]);

  console.log(`Created ${projectTasks.length} project tasks`);

  // Create invoices with line items
  // Invoice 1: PAID this month (for revenue stats)
  const invoice1 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-1" },
    update: {},
    create: {
      id: "seed-invoice-1",
      organizationId: organization.id,
      clientId: "seed-client-6",
      number: "2026-0001",
      issueDate: daysAgo(20),
      dueDate: daysAgo(6),
      status: "PAID",
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      paidAmount: 3025,
      paidAt: daysAgo(8),
      sentAt: daysAgo(20),
      viewedAt: daysAgo(18),
      notes: "Thank you for your business!",
      createdAt: daysAgo(20),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-1" },
    update: {},
    create: {
      id: "seed-invoice-item-1",
      invoiceId: "seed-invoice-1",
      serviceId: "seed-service-1",
      description: "Coaching website — design & development",
      quantity: 1,
      unitPrice: 2500,
      taxRate: 21,
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      sortOrder: 0,
    },
  });

  // Invoice 2: PAID this month (second revenue entry)
  const invoice2 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-2" },
    update: {},
    create: {
      id: "seed-invoice-2",
      organizationId: organization.id,
      clientId: "seed-client-1",
      number: "2026-0002",
      issueDate: daysAgo(15),
      dueDate: daysAgo(1),
      status: "PAID",
      subtotal: 200,
      taxAmount: 42,
      total: 242,
      paidAmount: 242,
      paidAt: daysAgo(3),
      sentAt: daysAgo(15),
      viewedAt: daysAgo(14),
      notes: "Monthly maintenance — February 2026",
      createdAt: daysAgo(15),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-2" },
    update: {},
    create: {
      id: "seed-invoice-item-2",
      invoiceId: "seed-invoice-2",
      serviceId: "seed-service-3",
      description: "Website maintenance — February 2026",
      quantity: 1,
      unitPrice: 200,
      taxRate: 21,
      subtotal: 200,
      taxAmount: 42,
      total: 242,
      sortOrder: 0,
    },
  });

  // Invoice 3: PAID last month (for month-over-month comparison)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const invoice3 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-3" },
    update: {},
    create: {
      id: "seed-invoice-3",
      organizationId: organization.id,
      clientId: "seed-client-8",
      number: "2026-0003",
      issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      status: "PAID",
      subtotal: 3500,
      taxAmount: 735,
      total: 4235,
      paidAmount: 4235,
      paidAt: lastMonthDate,
      sentAt: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      viewedAt: new Date(now.getFullYear(), now.getMonth() - 1, 6),
      notes: "Portfolio website — final payment",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 5),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-3" },
    update: {},
    create: {
      id: "seed-invoice-item-3",
      invoiceId: "seed-invoice-3",
      serviceId: "seed-service-1",
      description: "Portfolio website — design & development",
      quantity: 1,
      unitPrice: 2750,
      taxRate: 21,
      subtotal: 2750,
      taxAmount: 577.5,
      total: 3327.5,
      sortOrder: 0,
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-3b" },
    update: {},
    create: {
      id: "seed-invoice-item-3b",
      invoiceId: "seed-invoice-3",
      serviceId: "seed-service-4",
      description: "Logo design for photography brand",
      quantity: 1,
      unitPrice: 750,
      taxRate: 21,
      subtotal: 750,
      taxAmount: 157.5,
      total: 907.5,
      sortOrder: 1,
    },
  });

  // Invoice 4: SENT (outstanding)
  const invoice4 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-4" },
    update: {},
    create: {
      id: "seed-invoice-4",
      organizationId: organization.id,
      clientId: "seed-client-5",
      number: "2026-0004",
      issueDate: daysAgo(10),
      dueDate: daysFromNow(20),
      status: "SENT",
      subtotal: 4750,
      taxAmount: 997.5,
      total: 5747.5,
      sentAt: daysAgo(10),
      viewedAt: daysAgo(8),
      notes: "Construction company website",
      createdAt: daysAgo(10),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-4a" },
    update: {},
    create: {
      id: "seed-invoice-item-4a",
      invoiceId: "seed-invoice-4",
      serviceId: "seed-service-1",
      description: "Website design — corporate site with project gallery",
      quantity: 1,
      unitPrice: 2500,
      taxRate: 21,
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      sortOrder: 0,
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-4b" },
    update: {},
    create: {
      id: "seed-invoice-item-4b",
      invoiceId: "seed-invoice-4",
      serviceId: "seed-service-5",
      description: "Custom development — project portfolio module",
      quantity: 18,
      unitPrice: 125,
      taxRate: 21,
      subtotal: 2250,
      taxAmount: 472.5,
      total: 2722.5,
      sortOrder: 1,
    },
  });

  // Invoice 5: OVERDUE
  const invoice5 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-5" },
    update: {},
    create: {
      id: "seed-invoice-5",
      organizationId: organization.id,
      clientId: "seed-client-4",
      number: "2026-0005",
      issueDate: daysAgo(45),
      dueDate: daysAgo(15),
      status: "OVERDUE",
      subtotal: 6000,
      taxAmount: 1260,
      total: 7260,
      sentAt: daysAgo(45),
      viewedAt: daysAgo(43),
      notes: "Design collaboration Q1 — milestone 1",
      createdAt: daysAgo(45),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-5" },
    update: {},
    create: {
      id: "seed-invoice-item-5",
      invoiceId: "seed-invoice-5",
      description: "Design collaboration — first milestone (50% of project)",
      quantity: 1,
      unitPrice: 6000,
      taxRate: 21,
      subtotal: 6000,
      taxAmount: 1260,
      total: 7260,
      sortOrder: 0,
    },
  });

  // Invoice 6: DRAFT
  const invoice6 = await prisma.invoice.upsert({
    where: { id: "seed-invoice-6" },
    update: {},
    create: {
      id: "seed-invoice-6",
      organizationId: organization.id,
      clientId: "seed-client-1",
      number: "2026-0006",
      issueDate: now,
      dueDate: daysFromNow(30),
      status: "DRAFT",
      subtotal: 4250,
      taxAmount: 892.5,
      total: 5142.5,
      notes: "Website redesign — development phase",
      createdAt: daysAgo(1),
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-6a" },
    update: {},
    create: {
      id: "seed-invoice-item-6a",
      invoiceId: "seed-invoice-6",
      serviceId: "seed-service-5",
      description: "Frontend development — 30 hours",
      quantity: 30,
      unitPrice: 125,
      taxRate: 21,
      subtotal: 3750,
      taxAmount: 787.5,
      total: 4537.5,
      sortOrder: 0,
    },
  });
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-6b" },
    update: {},
    create: {
      id: "seed-invoice-item-6b",
      invoiceId: "seed-invoice-6",
      serviceId: "seed-service-2",
      description: "Technical consultation — CMS selection",
      quantity: 2,
      unitPrice: 150,
      taxRate: 21,
      subtotal: 300,
      taxAmount: 63,
      total: 363,
      sortOrder: 1,
    },
  });
  // Separate item to fix rounding: remaining 200 to reach subtotal 4250
  await prisma.invoiceItem.upsert({
    where: { id: "seed-invoice-item-6c" },
    update: {},
    create: {
      id: "seed-invoice-item-6c",
      invoiceId: "seed-invoice-6",
      serviceId: "seed-service-3",
      description: "Website maintenance — March 2026",
      quantity: 1,
      unitPrice: 200,
      taxRate: 21,
      subtotal: 200,
      taxAmount: 42,
      total: 242,
      sortOrder: 2,
    },
  });

  console.log("Created 6 invoices with line items");

  // Create quotes
  // Quote 1: SENT to Sophie (matches her QUOTE_SENT status)
  const quote1 = await prisma.quote.upsert({
    where: { id: "seed-quote-1" },
    update: {},
    create: {
      id: "seed-quote-1",
      organizationId: organization.id,
      clientId: "seed-client-2",
      number: "Q-2026-0001",
      title: "Startup Website — Design & Development",
      introduction: "Thank you for the great conversation. We're excited about your vision for TechStart. Here's our proposal.",
      terms: "50% upfront, 50% on delivery. Includes 3 months post-launch support.",
      validUntil: daysFromNow(14),
      status: "SENT",
      subtotal: 5500,
      taxAmount: 1155,
      total: 6655,
      sentAt: daysAgo(7),
      viewedAt: daysAgo(5),
      createdAt: daysAgo(8),
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-1a" },
    update: {},
    create: {
      id: "seed-quote-item-1a",
      quoteId: "seed-quote-1",
      serviceId: "seed-service-1",
      description: "Website design — modern startup look with product showcase",
      quantity: 1,
      unitPrice: 2500,
      taxRate: 21,
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      sortOrder: 0,
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-1b" },
    update: {},
    create: {
      id: "seed-quote-item-1b",
      quoteId: "seed-quote-1",
      serviceId: "seed-service-5",
      description: "Custom development — product pages, blog, integrations",
      quantity: 20,
      unitPrice: 125,
      taxRate: 21,
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      sortOrder: 1,
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-1c" },
    update: {},
    create: {
      id: "seed-quote-item-1c",
      quoteId: "seed-quote-1",
      description: "3 months post-launch support",
      quantity: 3,
      unitPrice: 200,
      taxRate: 0,
      subtotal: 600,
      taxAmount: 0,
      total: 600,
      isOptional: true,
      isSelected: true,
      sortOrder: 2,
    },
  });

  // Quote 2: DRAFT for Thomas de Groot
  const quote2 = await prisma.quote.upsert({
    where: { id: "seed-quote-2" },
    update: {},
    create: {
      id: "seed-quote-2",
      organizationId: organization.id,
      clientId: "seed-client-7",
      number: "Q-2026-0002",
      title: "Law Firm Digital Platform",
      introduction: "A comprehensive digital platform to modernize your client-facing services.",
      terms: "Payment in 3 milestones: 30% start, 40% midway, 30% on delivery.",
      validUntil: daysFromNow(21),
      status: "DRAFT",
      subtotal: 15000,
      taxAmount: 3150,
      total: 18150,
      createdAt: daysAgo(2),
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-2a" },
    update: {},
    create: {
      id: "seed-quote-item-2a",
      quoteId: "seed-quote-2",
      serviceId: "seed-service-1",
      description: "UX/UI design — client portal & main website",
      quantity: 1,
      unitPrice: 3500,
      taxRate: 21,
      subtotal: 3500,
      taxAmount: 735,
      total: 4235,
      sortOrder: 0,
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-2b" },
    update: {},
    create: {
      id: "seed-quote-item-2b",
      quoteId: "seed-quote-2",
      serviceId: "seed-service-5",
      description: "Full-stack development — client portal, document management, appointments",
      quantity: 80,
      unitPrice: 125,
      taxRate: 21,
      subtotal: 10000,
      taxAmount: 2100,
      total: 12100,
      sortOrder: 1,
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-2c" },
    update: {},
    create: {
      id: "seed-quote-item-2c",
      quoteId: "seed-quote-2",
      serviceId: "seed-service-2",
      description: "Strategy consultation — digital transformation roadmap",
      quantity: 10,
      unitPrice: 150,
      taxRate: 21,
      subtotal: 1500,
      taxAmount: 315,
      total: 1815,
      sortOrder: 2,
    },
  });

  // Quote 3: SENT for Michael Johnson
  const quote3 = await prisma.quote.upsert({
    where: { id: "seed-quote-3" },
    update: {},
    create: {
      id: "seed-quote-3",
      organizationId: organization.id,
      clientId: "seed-client-3",
      number: "Q-2026-0003",
      title: "Law Firm Website & Branding",
      introduction: "Following our introductory meeting, here is our proposal for your firm's online presence.",
      terms: "50% upfront, 50% on delivery. Logo included.",
      validUntil: daysFromNow(30),
      status: "SENT",
      subtotal: 3250,
      taxAmount: 682.5,
      total: 3932.5,
      sentAt: daysAgo(1),
      createdAt: daysAgo(2),
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-3a" },
    update: {},
    create: {
      id: "seed-quote-item-3a",
      quoteId: "seed-quote-3",
      serviceId: "seed-service-1",
      description: "Professional law firm website design",
      quantity: 1,
      unitPrice: 2500,
      taxRate: 21,
      subtotal: 2500,
      taxAmount: 525,
      total: 3025,
      sortOrder: 0,
    },
  });
  await prisma.quoteItem.upsert({
    where: { id: "seed-quote-item-3b" },
    update: {},
    create: {
      id: "seed-quote-item-3b",
      quoteId: "seed-quote-3",
      serviceId: "seed-service-4",
      description: "Logo design — modern legal brand identity",
      quantity: 1,
      unitPrice: 750,
      taxRate: 21,
      subtotal: 750,
      taxAmount: 157.5,
      total: 907.5,
      sortOrder: 1,
    },
  });

  console.log("Created 3 quotes with line items");

  // Create bookings (upcoming — next 7 days for dashboard)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(14, 0, 0, 0);

  const threeDays = new Date(now);
  threeDays.setDate(threeDays.getDate() + 3);
  threeDays.setHours(9, 0, 0, 0);

  const fourDays = new Date(now);
  fourDays.setDate(fourDays.getDate() + 4);
  fourDays.setHours(11, 0, 0, 0);

  const fiveDays = new Date(now);
  fiveDays.setDate(fiveDays.getDate() + 5);
  fiveDays.setHours(15, 30, 0, 0);

  const bookings = await Promise.all([
    prisma.booking.upsert({
      where: { id: "seed-booking-1" },
      update: {},
      create: {
        id: "seed-booking-1",
        organizationId: organization.id,
        clientId: "seed-client-2",
        bookingTypeId: "seed-booking-type-1",
        startsAt: tomorrow,
        endsAt: new Date(tomorrow.getTime() + 30 * 60 * 1000),
        status: "CONFIRMED",
        locationType: "ONLINE",
        location: "https://meet.google.com/abc-defg-hij",
        notes: "Discuss quote and answer questions about the startup website proposal.",
        createdAt: daysAgo(3),
      },
    }),
    prisma.booking.upsert({
      where: { id: "seed-booking-2" },
      update: {},
      create: {
        id: "seed-booking-2",
        organizationId: organization.id,
        clientId: "seed-client-1",
        bookingTypeId: "seed-booking-type-3",
        startsAt: dayAfterTomorrow,
        endsAt: new Date(dayAfterTomorrow.getTime() + 45 * 60 * 1000),
        status: "CONFIRMED",
        locationType: "AT_PROVIDER",
        location: "Office — Meeting Room A",
        notes: "Monthly project review for website redesign. Demo latest frontend build.",
        createdAt: daysAgo(5),
      },
    }),
    prisma.booking.upsert({
      where: { id: "seed-booking-3" },
      update: {},
      create: {
        id: "seed-booking-3",
        organizationId: organization.id,
        clientId: "seed-client-3",
        bookingTypeId: "seed-booking-type-1",
        startsAt: threeDays,
        endsAt: new Date(threeDays.getTime() + 30 * 60 * 1000),
        status: "PENDING",
        locationType: "ONLINE",
        location: "https://meet.google.com/xyz-uvwx-yz",
        notes: "Introductory call — referred by Jan van der Berg.",
        createdAt: daysAgo(2),
      },
    }),
    prisma.booking.upsert({
      where: { id: "seed-booking-4" },
      update: {},
      create: {
        id: "seed-booking-4",
        organizationId: organization.id,
        clientId: "seed-client-4",
        bookingTypeId: "seed-booking-type-2",
        startsAt: fourDays,
        endsAt: new Date(fourDays.getTime() + 60 * 60 * 1000),
        status: "CONFIRMED",
        locationType: "ONLINE",
        location: "https://meet.google.com/klm-nopq-rst",
        notes: "Design collaboration — review shared component library progress.",
        createdAt: daysAgo(4),
      },
    }),
    prisma.booking.upsert({
      where: { id: "seed-booking-5" },
      update: {},
      create: {
        id: "seed-booking-5",
        organizationId: organization.id,
        clientId: "seed-client-7",
        bookingTypeId: "seed-booking-type-2",
        startsAt: fiveDays,
        endsAt: new Date(fiveDays.getTime() + 60 * 60 * 1000),
        status: "PENDING",
        locationType: "AT_CLIENT",
        location: "Zuidas 200, Amsterdam",
        notes: "Discuss digital platform proposal and gather requirements.",
        createdAt: daysAgo(1),
      },
    }),
  ]);

  console.log(`Created ${bookings.length} bookings`);

  // Create time entries (this week — for "This Week" stat card)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const mon = new Date(weekStart);
  const tue = new Date(weekStart);
  tue.setDate(tue.getDate() + 1);
  const wed = new Date(weekStart);
  wed.setDate(wed.getDate() + 2);
  const thu = new Date(weekStart);
  thu.setDate(thu.getDate() + 3);
  const fri = new Date(weekStart);
  fri.setDate(fri.getDate() + 4);

  const timeEntries = await Promise.all([
    prisma.timeEntry.upsert({
      where: { id: "seed-time-1" },
      update: {},
      create: {
        id: "seed-time-1",
        organizationId: organization.id,
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        description: "Frontend development — homepage components",
        date: mon,
        duration: 360, // 6 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-2" },
      update: {},
      create: {
        id: "seed-time-2",
        organizationId: organization.id,
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        description: "Frontend development — about page & services page",
        date: tue,
        duration: 420, // 7 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-3" },
      update: {},
      create: {
        id: "seed-time-3",
        organizationId: organization.id,
        clientId: "seed-client-4",
        projectId: "seed-project-4",
        description: "Design review session with Anna",
        date: tue,
        duration: 120, // 2 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-4" },
      update: {},
      create: {
        id: "seed-time-4",
        organizationId: organization.id,
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        description: "Responsive layout fixes & mobile testing",
        date: wed,
        duration: 300, // 5 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-5" },
      update: {},
      create: {
        id: "seed-time-5",
        organizationId: organization.id,
        clientId: "seed-client-1",
        projectId: "seed-project-2",
        description: "Monthly maintenance — security updates & backups",
        date: wed,
        duration: 90, // 1.5 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-6" },
      update: {},
      create: {
        id: "seed-time-6",
        organizationId: organization.id,
        clientId: "seed-client-4",
        projectId: "seed-project-4",
        description: "Design system — button and card components",
        date: thu,
        duration: 240, // 4 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-7" },
      update: {},
      create: {
        id: "seed-time-7",
        organizationId: organization.id,
        clientId: "seed-client-5",
        description: "Bakker Bouw — project gallery module development",
        date: thu,
        duration: 180, // 3 hours
        billable: true,
      },
    }),
    prisma.timeEntry.upsert({
      where: { id: "seed-time-8" },
      update: {},
      create: {
        id: "seed-time-8",
        organizationId: organization.id,
        clientId: "seed-client-1",
        projectId: "seed-project-1",
        description: "CMS integration — content models & API setup",
        date: fri,
        duration: 330, // 5.5 hours
        billable: true,
      },
    }),
  ]);

  console.log(`Created ${timeEntries.length} time entries`);

  // Create notifications
  const notifications = await Promise.all([
    prisma.notification.upsert({
      where: { id: "seed-notif-1" },
      update: {},
      create: {
        id: "seed-notif-1",
        organizationId: organization.id,
        type: "new_booking",
        title: "New booking request",
        message: "Michael Johnson booked an Intake Call for " + threeDays.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        entityType: "booking",
        entityId: "seed-booking-3",
        isRead: false,
        createdAt: daysAgo(2),
      },
    }),
    prisma.notification.upsert({
      where: { id: "seed-notif-2" },
      update: {},
      create: {
        id: "seed-notif-2",
        organizationId: organization.id,
        type: "new_booking",
        title: "New booking request",
        message: "Thomas de Groot booked a Consultation for " + fiveDays.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        entityType: "booking",
        entityId: "seed-booking-5",
        isRead: false,
        createdAt: daysAgo(1),
      },
    }),
    prisma.notification.upsert({
      where: { id: "seed-notif-3" },
      update: {},
      create: {
        id: "seed-notif-3",
        organizationId: organization.id,
        type: "payment_received",
        title: "Payment received",
        message: "Lisa Jansen paid invoice 2026-0001 — €3.025,00",
        entityType: "invoice",
        entityId: "seed-invoice-1",
        isRead: true,
        readAt: daysAgo(6),
        createdAt: daysAgo(8),
      },
    }),
    prisma.notification.upsert({
      where: { id: "seed-notif-4" },
      update: {},
      create: {
        id: "seed-notif-4",
        organizationId: organization.id,
        type: "invoice_overdue",
        title: "Invoice overdue",
        message: "Invoice 2026-0005 for Design Studio Berlin is 15 days overdue (€7.260,00)",
        entityType: "invoice",
        entityId: "seed-invoice-5",
        isRead: false,
        createdAt: daysAgo(1),
      },
    }),
  ]);

  console.log(`Created ${notifications.length} notifications`);

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
