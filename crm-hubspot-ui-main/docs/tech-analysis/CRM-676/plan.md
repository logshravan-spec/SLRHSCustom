# Tech Analysis: CRM-676 — Deal Field Editability by Stage + Risk Affecting Fields Card

**Ticket:** [CRM-676](https://slrconsulting.atlassian.net/browse/CRM-676)
**Size:** Small
**Assignee:** Shravan Chitlur
**Status at analysis time:** Development in Progress
**Author:** John Pollo
**Date:** 2026-06-02

---

## 1. Problem / Context

HubSpot deal records have several fields whose editability must vary by deal stage. The legacy approach locked too many fields too broadly. The finalized requirement introduces a three-tier model:

1. **Financial fields** (Fee Basis, Billing Currency/Currency, Labour, Expenses, 3rd Party Fees, FGD%) — editable in **Identify** (STAGE_1) and **Quality** (STAGE_2) stages; also editable in **Proposal In Progress** (STAGE_3) but **only** when `sustain_status = "unknown"`.
2. **Risk affecting fields** (Proposal Manager, Proposal Director, Project Location Country, Reputational Risk) — **always view-only** in the CRM; managed via a new dedicated card.
3. **General deal fields** (Close Date, Next Steps, probability fields, notes, etc.) — editable in all non-terminal stages (not Closed Won / Closed Lost / Not Going Ahead); this is handled by HubSpot native property permissions and is **out of scope** for this card work.

The current `financial-details-card.jsx` only knows about STAGE_1 and STAGE_2. STAGE_3 is not yet in config, and the `sustain_status` condition is not implemented. The "Risk affecting fields" card does not yet exist.

---

## 2. Approach

### Option A (chosen): Targeted card changes
- Add `STAGE_3` to config files.
- Extend the financial card editability check to include the `sustain_status` gate for STAGE_3.
- Build a new `risk-affecting-fields.tsx` card that renders the four risk fields as read-only text.

### Option B (rejected): Rebuild as a single composite card
Merging all field groups into one card would simplify state management but introduce a large surface area, break existing HubSpot card registrations, and exceed the scope of this ticket.

**Decision: Option A.** Minimal surface change, follows established card pattern.

---

## 3. Implementation Plan

### 3.1 Config changes (all four files: `dev-config.json`, `uat-config.json`, `prod-config.json`, `config.json`)

Add the following key to each config file:

```json
"STAGE_3": "<proposal-in-progress-stage-id>"
```

> **Open question OQ-1** (owner: Shravan Chitlur): Confirm the HubSpot stage ID for Proposal In Progress across dev, UAT, and prod portals. The ID likely differs per environment — update each config file accordingly.

Also add property name keys if they differ from the defaults below (likely they do not):

```json
"PROPOSAL_DIRECTOR_PROPERTY": "proposal_director",
"PROJECT_LOCATION_COUNTRY_PROPERTY": "project_location_country",
"REPUTATIONAL_RISK_PROPERTY": "reputational_risk",
"SUSTAIN_STATUS_PROPERTY": "sustain_status"
```

### 3.2 Financial card update (`src/app/cards/financial-details-card.jsx`)

**a. Load new config constants at top of file:**

```js
const PROPOSAL_IN_PROGRESS_STAGE = config.STAGE_3;
const SUSTAIN_STATUS_PROPERTY = config.SUSTAIN_STATUS_PROPERTY;
```

**b. Add `sustain_status` to the properties fetched from the deal API:**

In the `propertiesToFetch` array inside `fetchDealData`, append:
```js
SUSTAIN_STATUS_PROPERTY
```

**c. Store it in state and derive the editability flag:**

```js
const [sustainStatus, setSustainStatus] = useState(null);
// after setProperties(props):
setSustainStatus(props?.[SUSTAIN_STATUS_PROPERTY] ?? null);
```

**d. Update `isEditableDealStage`:**

Replace:
```js
const isEditableDealStage = EDITABLE_DEAL_STAGES.has(
  toTrimmedString(properties?.[DEAL_STAGE_PROPERTY])
);
```

With:
```js
const currentStage = toTrimmedString(properties?.[DEAL_STAGE_PROPERTY]);
const isProposalInProgress = currentStage === PROPOSAL_IN_PROGRESS_STAGE;
const isEditableDealStage =
  EDITABLE_DEAL_STAGES.has(currentStage) ||
  (isProposalInProgress && sustainStatus === "unknown");
```

> Note: `EDITABLE_DEAL_STAGES` continues to hold STAGE_1 and STAGE_2. STAGE_3 is handled separately to allow the `sustain_status` gate.

**e. Update `draftProperties` diff check** — no changes needed; `sustainStatus` is derived from `properties`, not `draftProperties`.

### 3.3 New Risk affecting fields card

**File: `src/app/cards/risk-affecting-fields.tsx`**

A read-only card that:
- Fetches the four risk fields via `hubspot.fetch` using `HUBSPOT_TOKEN` from config.
- Renders them as labelled text rows (no inputs).
- Shows a loading spinner during fetch.
- Shows "–" for any empty field.
- Registers via `hubspot.extend()`.

Displayed fields:
| Label | Property |
|---|---|
| Proposal Manager | `proposal_manager` (from `config.PROPOSAL_MANAGER_PROPERTY`) |
| Proposal Director | `proposal_director` (from `config.PROPOSAL_DIRECTOR_PROPERTY`) |
| Project Location Country | `project_location_country` (from `config.PROJECT_LOCATION_COUNTRY_PROPERTY`) |
| Reputational Risk | `reputational_risk` (from `config.REPUTATIONAL_RISK_PROPERTY`) |

> **Open question OQ-2** (owner: Shravan Chitlur): Confirm that `proposal_director`, `project_location_country`, `reputational_risk` are the exact HubSpot internal property names. Verify in HubSpot → Settings → Properties.

**File: `src/app/cards/risk-affecting-fields-hsmeta.json`**

```json
{
  "uid": "risk_affecting_fields_card",
  "type": "card",
  "config": {
    "name": "Risk Affecting Fields",
    "description": "View-only display of risk-influencing deal fields.",
    "entrypoint": "/app/cards/risk-affecting-fields.tsx",
    "location": "crm.record.tab",
    "objectTypes": ["DEAL"]
  }
}
```

> **Open question OQ-3** (owner: John Pollo): Confirm `crm.record.tab` is the correct surface. If the card should appear in the sidebar alongside Deal Contact, change `location` to `crm.record.sidebar`.

### 3.4 Config: permitted URLs check

`sustain_status` is read from HubSpot's own CRM API (`api.hubapi.com` / `api-eu1.hubapi.com`) — both are already in `app-hsmeta.json`'s `permittedUrls.fetch`. No change needed.

---

## 4. Testing Approach

| Scenario | How |
|---|---|
| Financial card: editable in STAGE_1 | Set deal to Identify stage → all financial inputs enabled |
| Financial card: editable in STAGE_2 | Set deal to Quality stage → all financial inputs enabled |
| Financial card: editable in STAGE_3 + sustain_status="unknown" | Set deal to Proposal In Progress + sustain_status=unknown → inputs enabled |
| Financial card: locked in STAGE_3 + sustain_status≠"unknown" | Set deal to Proposal In Progress + sustain_status="approved" → inputs disabled |
| Financial card: locked in terminal stages | Set deal to Closed Won/Lost → inputs disabled |
| Risk card: shows all four fields | Open any deal → verify labels and values |
| Risk card: fields are not editable | Attempt to edit values → no edit controls present |
| Risk card: handles empty fields | Open a deal where one property is blank → shows "–" |

> **Open question OQ-4** (owner: Abhay Shrivastava): Testing of the Sustain risk-approval retrigger behaviour (whether editing commercials after risk approval correctly re-triggers or not) is explicitly out of scope for this card work — it is handled in the Sustain integration layer. Confirm this is tracked in a separate ticket.

---

## 5. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| OQ-1 | Confirm HubSpot stage ID for Proposal In Progress (STAGE_3) in dev, UAT, and prod portals | Shravan Chitlur | Before implementation |
| OQ-2 | Confirm exact internal property names for `proposal_director`, `project_location_country`, `reputational_risk` | Shravan Chitlur | Before implementation |
| OQ-3 | Confirm display surface for Risk card: tab (`crm.record.tab`) or sidebar (`crm.record.sidebar`) | John Pollo | Before implementation |
| OQ-4 | Confirm Sustain retrigger testing is tracked in a separate ticket and not blocking this one | Abhay Shrivastava | Before release |

---

## 6. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `sustain_status` field not populated on older deals → card shows editable when it should be locked | Medium | Default to `locked` when `sustain_status` is null/empty (fail closed) |
| HubSpot property names for risk fields differ from assumed values | Medium | OQ-2 must be confirmed before deploying to UAT |
| Stage ID for STAGE_3 differs per environment | High | Already mitigated by config-per-environment pattern; OQ-1 tracks this |
| New Risk card registration requires HubSpot portal re-deploy | Low | Standard `hs project upload` handles this |
| Comments note financial values not syncing to Sustain post-approval | Low (separate concern) | OQ-4 confirms this is tracked elsewhere; do not block this ticket on it |

---

## Artifacts

- Plan: `docs/tech-analysis/CRM-676/plan.md` (this file)
- BDD scenarios: `tests/features/CRM-676.feature`
