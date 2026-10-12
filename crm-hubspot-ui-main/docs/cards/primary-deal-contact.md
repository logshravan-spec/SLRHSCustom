# Primary Deal Contact Card

## Overview

Allows a deal owner to designate one contact as the **primary contact** for a deal. The primary contact is stored on the deal as a custom property and must be selected from the contacts already linked to the deal's client company (or companies).

| Attribute | Value |
|---|---|
| Files | `src/app/cards/PrimaryDealContact.jsx` (re-export) |
| | `src/app/cards/deal-contact/index.jsx` (orchestrator) |
| | `src/app/cards/deal-contact/AssociationTable.jsx` (display) |
| | `src/app/cards/deal-contact/PanelUI.jsx` (selection panel) |
| Card UID | `deal_contact_association_card` |
| Surface | Deal record — sidebar |
| HubSpot object | Deal |

## Reason

HubSpot has no native concept of a "primary contact" on a deal. SLR needs to associate one specific contact per deal for proposal generation, reporting, and the Sustain approval workflow. Storing this designation as a custom property (`primary_contact_id`) makes it available to automations, integrations, and Sustain without requiring manual lookups.

### Why the contact pool is restricted to the deal's client

The primary contact must be someone from the **client organisation** associated with the deal — not an internal SLR user or an unrelated contact. By scoping the contact search to contacts already linked to the deal's associated companies, the card enforces this rule at the UI level and prevents incorrect assignments. Users cannot search all contacts in HubSpot; they can only see and select contacts that belong to one of the companies linked to the deal.

## Components

### `index.jsx` — Orchestrator

- Fetches the deal's associated company IDs on load.
- Fetches the current `primary_contact_id` property from the deal.
- Passes data to `AssociationTable` (display current primary contact) and `PanelUI` (change primary contact).
- Triggers a full data refresh after a successful save via `needToRefresh` flag.

### `AssociationTable.jsx` — Current Primary Contact Display

- Renders a bordered table row showing the primary contact's **name** (linked to their HubSpot contact record) and **email**.
- Only visible when a primary contact has been set.
- Supports pagination if multiple contact IDs are passed (currently always one).

### `PanelUI.jsx` — Set Primary Contact Panel

Renders a **"Set Primary Contact"** button. Clicking it opens a slide-in panel with the following flow:

1. **Load contacts** — fetches all contacts from the deal's associated companies (paginated via cursor, 500 per company, up to 100 shown in the panel at a time).
2. **Search** — live search input with 500 ms debounce. Fires when the query is empty or longer than 3 characters to avoid excessive API calls on short partial queries.
3. **Select** — user picks one contact via radio button.
4. **Save** — on clicking Save:
   - Creates the HubSpot deal→contact association (type ID 3, `HUBSPOT_DEFINED`) so the contact appears in HubSpot's native association panel as well.
   - PATCHes `primary_contact_id` on the deal record.
   - **Verifies** the save persisted by polling the deal up to **5 times** (300 ms apart) before declaring success. This guards against eventual-consistency delays in the HubSpot API.
5. **On success** — shows a success alert, updates the sidebar display immediately, and closes the panel.

| Panel action | Behaviour |
|---|---|
| Cancel | Closes the panel without saving |
| Clear | Deselects the current radio selection (does not clear the saved value) |
| Save | Saves the selected contact as the primary contact on the deal |

## HubSpot Properties Written

| Property | Value written |
|---|---|
| `primary_contact_id` | HubSpot object ID of the selected contact |

## HubSpot Associations Created

| Association | Type |
|---|---|
| Deal → Contact | `HUBSPOT_DEFINED`, type ID 3 |

An existing association (HTTP 409) is treated as a no-op and does not block saving the `primary_contact_id` property.
