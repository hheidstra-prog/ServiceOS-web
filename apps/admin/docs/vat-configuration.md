# ServicesOS — VAT Configuration & Service-Level Tax Rates

Overview of how VAT (BTW) is configured and applied across services, time tracking, and invoicing.

---

## VAT Rates

The system provides a predefined list of VAT rates. Users cannot create custom rates — this ensures compliance and consistency.

| Rate | Label | Description |
|------|-------|-------------|
| 21% | Standard | Default rate for most services in the Netherlands |
| 9% | Low | Reduced rate for specific goods and services |
| 0% | Exempt | VAT-exempt services (e.g. education-related) |
| 0% | Reverse charge | VAT shifted to the client (B2B EU and non-EU) |

## Service-Level VAT

Each service is linked to a VAT rate. This means the VAT rate is determined at the moment a service is created, not when time is logged or an invoice is generated.

**Example setup:**

| Service | Hourly rate | VAT rate |
|---------|-------------|----------|
| Consultancy NL | €120 | 21% Standard |
| Consultancy EU | €120 | 0% Reverse charge |
| Project Management | €100 | 21% Standard |
| Training (exempt) | €90 | 0% Exempt |

If a user delivers the same type of work to both Dutch and EU-based clients, they create separate services with the appropriate VAT rate for each.

## Flow

### Setup (one-time)

1. User creates services and selects the applicable VAT rate per service
2. User assigns services to a project

### Daily usage

1. User logs time and selects the appropriate service
2. The VAT rate is automatically determined by the selected service
3. No VAT decisions are needed during time tracking

### Invoicing

1. Invoice pulls the VAT rate from each service on the logged time entries
2. VAT is calculated and displayed per line item
3. Invoice totals show subtotal, VAT amount per rate, and grand total

## Reverse Charge Invoice Requirements

When a service uses the **reverse charge** VAT rate, the invoice must meet additional requirements:

- Display **"VAT reverse charged"** (or Dutch: **"BTW verlegd"**) on the invoice
- Show the **VAT identification number** of both the sender and the client
- Do **not** show a VAT amount for reverse charge line items
- The invoice should clearly separate reverse charge line items from standard-rated items if both appear on the same invoice

These requirements are handled automatically based on the VAT rate linked to the service. The user does not need to configure this manually per invoice.
