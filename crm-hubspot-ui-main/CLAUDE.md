# SLR APP

## 1. Project overview

SLR APP is a private HubSpot UI Extensions app built for SLR Consulting. It adds custom CRM cards to Deal, Company, and Contact records for association management, deal workflow guidance, and financial detail tracking with multi-currency, region-aware configuration.

## 2. How to run, test, lint

**Install dependencies** (first time or after `package.json` changes):
```
cd src/app/cards && npm install
```

**Develop** (watch mode — syncs to HubSpot dev sandbox):
```
hs project dev
```

**Deploy** (upload to HubSpot):
```
hs project upload
```

**Test:** No test suite configured.

**Lint:** No linter configured.

**Config — required before running:**
Copy the appropriate environment config to `src/app/cards/config.json`:
```
cp src/app/cards/dev-config.json src/app/cards/config.json   # dev
cp src/app/cards/uat-config.json src/app/cards/config.json   # UAT
cp src/app/cards/prod-config.json src/app/cards/config.json  # prod
```
These files contain HubSpot PAT tokens and are gitignored — never commit them.

## 3. Architecture

```
src/
  app/
    app-hsmeta.json       # App registration (uid, scopes, permitted fetch URLs)
    cards/                # One file per UI Extension card
      deal-contact/       # Deal Contact sidebar card (AssociationTable, PanelUI, index)
      dist/               # Generated build output — do not edit
      node_modules/       # npm dependencies — do not edit
    dist/                 # App-level build output — do not edit
    .vite/                # Vite dev cache — do not edit
  utils/
    hsFetch.js            # Thin wrapper around hubspot.fetch()
    useDebouncedValue.js  # Debounce hook
```

**Registered cards:**

| File | Card UID | Surface | Object |
|---|---|---|---|
| `company-deals-association.tsx` | `company_deals_association_card` | `crm.record.tab` | Company |
| `deal-companies-association.tsx` | `deal_companies_association_card` | `crm.record.tab` | Deal |
| `contact-deals-tab.tsx` | _(no hsmeta — check app config)_ | `crm.record.tab` | Contact |
| `deal-required-steps.tsx` | `deal_required_steps_card` | `crm.record.tab` | Deal |
| `financial-details-card.jsx` | `deal_financial_details_card` | `crm.record.tab` | Deal |
| `PrimaryDealContact.jsx` | `deal_contact_association_card` | `crm.record.sidebar` | Deal |

## 4. Conventions

- **Card registration:** Each card calls `hubspot.extend()` at file bottom; the companion `*-hsmeta.json` registers metadata (uid, location, objectTypes).
- **API calls:** Use `hubspot.fetch()` — never native `fetch()`. The sandbox proxies only whitelisted URLs (see `permittedUrls.fetch` in `app-hsmeta.json`). The EU1 endpoint `https://api-eu1.hubapi.com` is used for PATCH writes.
- **Config:** All tokens, custom object type IDs, property names, and stage IDs come from `config.json`. Never hardcode env-specific values.
- **Currency/region logic:** Financial Details resolves allowed currencies by: proposal manager ID → UserMeta custom object (region code) → Currency custom object (allowed currencies). Falls back to `DEFAULT_REGION_CODE` from config when any lookup fails.
- **Auto-save:** Financial Details card debounces writes at 500 ms using `savingRef`/`pendingSaveRef` queue pattern. Do not change the timing without testing against HubSpot API rate limits.
- **File naming:** Card files are kebab-case (`.jsx` or `.tsx`); each paired with a `*-hsmeta.json`.
- **Mixed JSX/TSX:** `.jsx` for older cards, `.tsx` for newer ones. New cards should use `.tsx`.

## 5. Do-not-touch

- `node_modules/` — managed by npm; do not edit manually
- `dist/`, `src/app/dist/` — generated build output
- `src/app/.vite/` — Vite dev cache
- `src/app/cards/config.json` and all `*-config.json` files — contain secrets; gitignored
- `.hubspot/` — HubSpot CLI local state

## 6. Pointers

- HubSpot UI Extensions reference: https://developers.hubspot.com/docs/guides/crm/ui-extensions/overview
- HubSpot CRM API reference: https://developers.hubspot.com/docs/reference/api/overview
- No ADR folder configured.
- No runbooks folder configured.
- No on-call document.

## 7. Owner

John Pollo — john@team8solutions.com

## 8. Card Functionalities

### Financial Details Card
**File:** `financial-details-card.jsx` | **Surface:** Deal record tab | **UID:** `deal_financial_details_card`

**Reason:** Centralises deal commercials in a structured, stage-aware UI within HubSpot. It locks fields automatically once a deal advances past the proposal stage, preventing accidental edits after approvals have started.

**What it does:**
- Displays and edits six financial fields in a two-row grid: Charge Type, Fee Basis, Deal Currency, Labour, Expenses, 3rd Party Fees, and FGD % (Fixed General Disbursement percentage).
- Computes and shows **Total Contract Value** live: `Labour + Expenses + 3rd Party Fees + (Labour × FGD%)`.
- Auto-saves all changes with a **500 ms debounce**. A queue (`savingRef` / `pendingSaveRef`) serialises concurrent saves to avoid race conditions against the HubSpot API rate limit.
- Also writes `deal_currency_code`, `amount` (= TCV), and `commercials_updated_at` on every save.
- **Editability is stage-gated:** fields are editable only in **Identify** (Stage 1), **Qualify** (Stage 2), and **Proposal In Progress** (Stage 3) when `sustain_status` is `null` or `"unknown"`. All fields become read-only in any other stage or when Sustain has taken ownership.
- **Currency resolution chain:** proposal manager ID → UserMeta custom object (region code) → Currency custom object (allowed currencies list). Falls back to `DEFAULT_REGION_CODE` from config if any lookup fails.
- Number inputs (Labour, Expenses, 3rd Party Fees) are disabled until a currency is selected, preventing saves with no currency set.

---

### Deal Required Steps Card
**File:** `deal-required-steps.tsx` | **Surface:** Deal record tab | **UID:** `deal_required_steps_card`

**Reason:** Acts as a persistent guardrail so deal owners don't accidentally skip required workflow steps — linking a contact or advancing the deal stage directly in HubSpot instead of through Sustain.

**What it does:**
- Static, non-interactive card rendered as a yellow-highlighted alert box.
- Displays two numbered steps:
  1. **Associate a contact** — reminds users to link at least one contact via the Deal Contact Association card.
  2. **Moving to Proposal Stage?** — instructs users to manage stage advancement and approvals via [Sustain](https://sustain.slrconsulting.com) rather than directly in HubSpot. Changes made in Sustain sync back automatically.

---

### Company Deals Association Card
**File:** `company-deals-association.tsx` | **Surface:** Company record tab | **UID:** `company_deals_association_card`

**Reason:** HubSpot's native association panel on a company record doesn't show enriched deal detail (stage labels, pipeline, owner name, formatted currency). This card gives a deal-aware table view directly on the company page.

**What it does:**
- Fetches all deal IDs associated with the company (CRM v4 associations API), then batch-fetches deal details.
- Displays a paginated table (5 per page) with columns: **Deal Name** (linked to the deal record), **Amount** (formatted with currency), **Owner**, **Stage** (human-readable label + pipeline name), **Close Date**.
- Resolves stage and pipeline labels from the pipelines API and owner names from the owners API on mount.
- **Add Deal** button (top-right) opens HubSpot's native record association form to create a new deal and link it to the company in one step.

---

### Deal Companies Association Card
**File:** `deal-companies-association.tsx` | **Surface:** Deal record tab | **UID:** `deal_companies_association_card`

**Reason:** Provides a clean, scannable view of which companies are linked to a deal, including contact details that aren't visible in HubSpot's default association panel.

**What it does:**
- Fetches all company IDs associated with the deal (CRM v4 associations API), then batch-fetches company details.
- Displays a paginated table (5 per page) with columns: **Company Name** (linked to the company record), **Domain**, **Phone**, **Email**.
- Read-only — no add/remove actions.

---

### Contact Deals Tab
**File:** `contact-deals-tab.tsx` | **Surface:** Contact record tab

**Reason:** Lets contact-record users see all associated deals at a glance without leaving the contact page. Uses the `useAssociations` hook so no API token is required.

**What it does:**
- Uses `useAssociations` (HubSpot CRM hook) to load deals linked to the current contact — no direct API calls needed.
- Displays a read-only table with columns: **Deal** (linked to the deal record, opens in new tab), **Amount** (number-formatted), **Stage**, **Close Date**.
- Shows "No deals associated." when none exist.

---

### Deal Contact / Primary Deal Contact Card
**Files:** `PrimaryDealContact.jsx` (re-export) → `deal-contact/index.jsx`, `deal-contact/AssociationTable.jsx`, `deal-contact/PanelUI.jsx`
**Surface:** Deal record sidebar | **UID:** `deal_contact_association_card`

**Reason:** HubSpot has no native concept of a "primary" contact on a deal. SLR needs to designate one specific contact per deal (for proposal and reporting purposes). This card creates that designation by writing a `primary_contact_id` custom property and creating the standard HubSpot association, pulling only from contacts already linked to the deal's associated companies.

**What it does — three sub-components:**

**`index.jsx` (DealContact — orchestrator)**
- Fetches the deal's associated company IDs and the current `primary_contact_id` property on load.
- Passes data down to AssociationTable (display) and PanelUI (editing).
- Triggers a full data refresh after a save via `needToRefresh` flag.

**`AssociationTable.jsx`**
- Displays the current primary contact (name + email) as a single-row bordered table, linked to the contact's HubSpot record.
- Only renders if a primary contact is set.
- Supports pagination if multiple contact IDs are passed (currently always one).

**`PanelUI.jsx` (Set Primary Contact panel)**
- Renders a **"Set Primary Contact"** button in the sidebar that opens a slide-in panel.
- Inside the panel: fetches all contacts belonging to the deal's associated companies (paginated, 10 per page). Supports live **search** with 500 ms debounce (fires when query is empty or > 3 characters).
- User selects a contact via **radio button**, then saves. On save:
  1. Creates the HubSpot deal→contact association (type ID 3, HUBSPOT_DEFINED).
  2. PATCHes `primary_contact_id` on the deal.
  3. **Verifies** the save persisted with up to 5 polling retries (300 ms apart) before declaring success.
- On success: shows a success alert, updates the sidebar display, and closes the panel.
- Cancel and Clear buttons allow discarding the selection without saving.
