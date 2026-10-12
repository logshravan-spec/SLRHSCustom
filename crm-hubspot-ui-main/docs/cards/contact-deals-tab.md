# Contact Deals Tab Card

## Overview

A read-only table of all deals associated with a contact record. Provides a quick reference to related deals without leaving the contact page.

| Attribute | Value |
|---|---|
| File | `src/app/cards/contact-deals-tab.tsx` |
| Surface | Contact record — tab |
| HubSpot object | Contact |

## Reason

Sales and account management users frequently need to check which deals a contact is involved in while working on the contact record. HubSpot's native association panel does not surface key deal fields (amount, stage, close date) in a table view. This card fills that gap with a minimal, fast implementation using the `useAssociations` hook — no API token required.

## Columns

| Column | Source | Notes |
|---|---|---|
| Deal | `dealname` | Linked to the deal record; opens in a new tab |
| Amount | `amount` | Number-formatted; `"—"` if not set |
| Stage | `dealstage` | Raw stage ID (not resolved to label) |
| Close Date | `closedate` | Raw value from HubSpot; `"—"` if not set |

## Behaviour

- Uses the `useAssociations` CRM hook — no direct API calls or token needed.
- Loads deals with properties: `dealname`, `amount`, `dealstage`, `closedate`.
- Shows "Loading deals…" while fetching and "No deals associated." when none exist.
- No pagination — all associated deals are rendered in a single table.
- Entirely read-only; no add or remove actions.
