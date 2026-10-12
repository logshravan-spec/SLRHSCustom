# Financial Details Card

## Overview

Displays and edits the commercial financials for a deal. Locks fields automatically once a deal advances past the proposal stage to prevent changes after approvals have begun.

| Attribute | Value |
|---|---|
| File | `src/app/cards/financial-details-card.jsx` |
| Card UID | `deal_financial_details_card` |
| Surface | Deal record — tab |
| HubSpot object | Deal |

## Reason

HubSpot's default deal properties form does not enforce stage-aware editability or compute a live Total Contract Value. This card provides a structured commercial data-entry experience that mirrors SLR's proposal workflow: fields are open during scoping and proposal preparation, then locked once Sustain takes ownership of the deal progression.

## Fields

| Label | HubSpot property | Type | Notes |
|---|---|---|---|
| Charge Type | `charge_type` | Select | Options loaded from HubSpot deal property definition |
| Fee Basis | `fee_basis` | Select | Options loaded from HubSpot deal property definition |
| Deal Currency | `deal_currency` | Select | Options restricted to the allowed currencies for the proposal manager's region |
| Labour | `labour` | Number | Requires currency to be selected before enabling |
| Expenses | resolved at runtime | Number | Tries `expenses`, `estimated_expenses`, `estimated_expense`, `estimated_expense_amount`, `deal_expenses` — uses first that exists |
| 3rd Party Fees | `estimated_3rd_party_fees` | Number | Requires currency to be selected before enabling |
| FGD % | `fixed_general_disbursement_percentage` | Number | Stored as a decimal (0.05 = 5%); displayed as a percentage; capped at 10% |
| Total Contract Value | computed / `amount` | Display only | `Labour + Expenses + 3rd Party Fees + (Labour × FGD%)` |

## Editability Rules

Fields are editable only when the deal is in one of the following states:

- **Identify** (Stage 1, config `STAGE_1`)
- **Qualify** (Stage 2, config `STAGE_2`)
- **Proposal In Progress** (Stage 3, config `STAGE_3`) — only when `sustain_status` is `null` or `"unknown"`

All fields become read-only in any other stage, or once Sustain has taken ownership of the deal (`sustain_status` is set to a known value).

Number inputs (Labour, Expenses, 3rd Party Fees, FGD %) are additionally disabled until a Deal Currency is selected.

## Currency Resolution

The list of selectable currencies is derived per deal:

1. Read `proposal_manager` property from the deal.
2. Look up the proposal manager in the **UserMeta** custom object to get their `region_code`.
3. Look up the region code in the **Currency** custom object to get the `allowed_currencies` list.
4. Fall back to `DEFAULT_REGION_CODE` (from `config.json`) if any lookup fails.

The current `deal_currency` value is always included in the options even if it is not in the allowed list, so existing records are never broken.

## Auto-Save Behaviour

- Changes trigger a save **500 ms after the last edit** (debounced).
- A `savingRef` / `pendingSaveRef` queue serialises concurrent saves to avoid race conditions against the HubSpot API rate limit.
- Every save also writes `deal_currency_code`, `amount` (Total Contract Value), and `commercials_updated_at` (ISO timestamp).
- Numeric values are rounded to 2 decimal places before saving (`FGD %` to 4 decimal places).
- The initial data load does not trigger a save.

## Alerts

| Condition | Alert type |
|---|---|
| Expenses property not found on the portal | Warning |
| Fee Basis or Charge Type options fail to load | Error |
| Currency config missing for the deal's region | Warning |
| Auto-save fails | Error |
| Initial data load fails | Error |
