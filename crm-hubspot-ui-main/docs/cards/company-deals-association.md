# Company Deals Association Card

## Overview

Displays a read-only table of all deals associated with a company record, with enriched detail that is not available in HubSpot's native association panel.

| Attribute | Value |
|---|---|
| File | `src/app/cards/company-deals-association.tsx` |
| Card UID | `company_deals_association_card` |
| Surface | Company record — tab |
| HubSpot object | Company |

## Reason

HubSpot's built-in association panel on a company record does not show deal pipeline, human-readable stage labels, owner names, or formatted currency amounts in a table layout. This card provides a clean, scannable summary of all related deals without requiring users to open each one individually.

### Why the table is read-only (no remove action)

Removing a company association from a deal can leave the deal as an **orphan** — a deal with no company attached. Orphaned deals break downstream reporting, pipeline views, and Sustain sync. To prevent this, association management (linking or unlinking companies to deals) must be done from the **deal record** directly, where both sides of the relationship are visible and the impact is clear.

The **Add Deal** button is provided to allow creating new deals associated with the company, which is safe because it creates a fully linked record from the outset.

## Columns

| Column | Source | Notes |
|---|---|---|
| Deal Name | `dealname` | Linked to the deal record in HubSpot |
| Amount | `amount` | Formatted with currency symbol; uses `deal_currency` or `hs_currency` |
| Owner | `hubspot_owner_id` | Resolved to full name (or email) via the owners API |
| Stage | `dealstage` + `pipeline` | Human-readable stage label and pipeline name, e.g. "Proposal (Main Pipeline)" |
| Close Date | `closedate` | Formatted as "Mon DD, YYYY" |

## Behaviour

- Fetches up to 100 associated deal IDs from the CRM v4 associations API, then batch-fetches deal details.
- Stage labels, pipeline names, and owner names are resolved on mount via separate API calls and cached in component state for the session.
- Results are paginated at **5 rows per page** with prev/next and page-number buttons.
- Shows "No associated deals found." when the company has no linked deals.

## Actions

| Action | Behaviour |
|---|---|
| Add Deal | Opens HubSpot's native record association form (`OPEN_RECORD_ASSOCIATION_FORM`) to create a new deal and associate it with the company in one step |
