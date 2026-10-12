# Deal Companies Association Card

## Overview

Displays a read-only table of all companies associated with a deal record, including contact details not shown in HubSpot's native association panel.

| Attribute | Value |
|---|---|
| File | `src/app/cards/deal-companies-association.tsx` |
| Card UID | `deal_companies_association_card` |
| Surface | Deal record — tab |
| HubSpot object | Deal |

## Reason

HubSpot's built-in association panel on a deal record does not surface company contact details (domain, phone, email) inline. This card gives deal owners a quick reference to the client companies linked to their deal without needing to navigate away.

### Why the table is read-only (no remove action)

Removing a company from a deal can leave the deal as an **orphan** — a deal with no company attached. Orphaned deals break downstream reporting, pipeline views, and the Sustain sync. Company associations must be managed deliberately. Keeping this view read-only prevents accidental removal and encourages users to manage company-deal relationships from a context where the full impact is visible.

## Columns

| Column | Source | Notes |
|---|---|---|
| Company Name | `name` | Linked to the company record in HubSpot |
| Domain | `domain` | Shown as plain text; `"-"` if not set |
| Phone | `phone` | Shown as plain text; `"-"` if not set |
| Email | `email` | Shown as plain text; `"-"` if not set |

## Behaviour

- Fetches all associated company IDs from the CRM v4 associations API, then batch-fetches company details (up to 100).
- Results are paginated at **5 rows per page** with prev/next and page-number buttons.
- Shows "No associated company found." when the deal has no linked companies.
- No add or remove actions are provided.
