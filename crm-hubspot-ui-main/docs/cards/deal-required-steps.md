# Deal Required Steps Card

## Overview

A static, non-interactive card displayed on every deal record. It communicates two mandatory workflow steps to deal owners and acts as a persistent reminder to prevent common process mistakes.

| Attribute | Value |
|---|---|
| File | `src/app/cards/deal-required-steps.tsx` |
| Card UID | `deal_required_steps_card` |
| Surface | Deal record — tab |
| HubSpot object | Deal |

## Reason

Without guidance embedded in the record itself, deal owners can:

- Forget to link a contact before a deal progresses (leaving deals without a point of contact for proposals and reporting).
- Advance a deal to "Proposal" or later stages directly in HubSpot, bypassing the Sustain approval workflow — which breaks the sync between HubSpot and Sustain and may trigger proposals without the required sign-offs.

This card is always visible on the deal tab so the rules are present at the moment they are needed, not buried in a wiki.

## Steps Displayed

### Step 1 — Associate a contact

Users must link at least one contact to the deal using the **Deal Contact Association** sidebar card. This contact becomes the primary contact for proposal and reporting purposes.

### Step 2 — Moving to Proposal Stage?

Deals must not be advanced to "Proposal" or any later stage directly in HubSpot. Users must navigate to [Sustain](https://sustain.slrconsulting.com) to manage stage advancement and approvals. Changes made in Sustain sync back to HubSpot automatically.

## Styling

The card renders in a soft yellow box (`#ddcb81`) with a red danger alert banner at the top to ensure it is visually prominent on the deal record.
