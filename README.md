SLR APP
HubSpot Custom Cards

Overview
This document describes the six custom HubSpot UI Extension cards built for the SLR APP. Each card is deployed as part of the HubSpot CRM extension and appears on deal, company, or contact records. The cards extend HubSpot's native functionality with SLR-specific business logic, enforced data relationships, and commercial workflow guardrails.

1. Company Deals Association Card
Displays a read-only table of all deals associated with a company record, with enriched detail that is not available in HubSpot's native association panel.

Card Details
File	src/app/cards/company-deals-association.tsx
Card UID	company_deals_association_card
Surface	Company record — tab
HubSpot Object	Company

Purpose
HubSpot's built-in association panel on a company record does not show deal pipeline, human-readable stage labels, owner names, or formatted currency amounts in a table layout. This card provides a clean, scannable summary of all related deals without requiring users to open each one individually.

Why the table is read-only
Removing a company association from a deal can leave the deal as an orphan — a deal with no company attached. Orphaned deals break downstream reporting, pipeline views, and Sustain sync. To prevent this, association management must be done from the deal record directly, where both sides of the relationship are visible and the impact is clear. The Add Deal button is provided to allow creating new deals associated with the company, which is safe because it creates a fully linked record from the outset.

Columns
Column	Source	Notes
Deal Name	dealname	Linked to the deal record in HubSpot
Amount	amount	Formatted with currency symbol; uses deal_currency or hs_currency
Owner	hubspot_owner_id	Resolved to full name (or email) via the owners API
Stage	dealstage + pipeline	Human-readable stage label and pipeline name
Close Date	closedate	Formatted as Mon DD, YYYY

Behaviour
Fetches up to 100 associated deal IDs from the CRM v4 associations API, then batch-fetches deal details. Stage labels, pipeline names, and owner names are resolved on mount via separate API calls and cached in component state for the session. Results are paginated at 5 rows per page with prev/next and page-number buttons. Shows 'No associated deals found.' when the company has no linked deals.

Actions
Action	Behaviour
Add Deal	Opens HubSpot's native record association form to create a new deal and associate it with the company in one step

2. Contact Deals Tab Card
A read-only table of all deals associated with a contact record. Provides a quick reference to related deals without leaving the contact page.

Card Details
File	src/app/cards/contact-deals-tab.tsx
Surface	Contact record — tab
HubSpot Object	Contact

Purpose
Sales and account management users frequently need to check which deals a contact is involved in while working on the contact record. HubSpot's native association panel does not surface key deal fields (amount, stage, close date) in a table view. This card fills that gap with a minimal, fast implementation using the useAssociations hook — no API token required.

Columns
Column	Source	Notes
Deal	dealname	Linked to the deal record; opens in a new tab
Amount	amount	Number-formatted; — if not set
Stage	dealstage	Raw stage ID (not resolved to label)
Close Date	closedate	Raw value from HubSpot; — if not set

Behaviour
Uses the useAssociations CRM hook — no direct API calls or token needed. Loads deals with properties: dealname, amount, dealstage, closedate. Shows 'Loading deals...' while fetching and 'No deals associated.' when none exist. No pagination — all associated deals are rendered in a single table. Entirely read-only; no add or remove actions.

3. Deal Companies Association Card
Displays a read-only table of all companies associated with a deal record, including contact details not shown in HubSpot's native association panel.

Card Details
File	src/app/cards/deal-companies-association.tsx
Card UID	deal_companies_association_card
Surface	Deal record — tab
HubSpot Object	Deal

Purpose
HubSpot's built-in association panel on a deal record does not surface company contact details (domain, phone, email) inline. This card gives deal owners a quick reference to the client companies linked to their deal without needing to navigate away.

Why the table is read-only
Removing a company from a deal can leave the deal as an orphan — a deal with no company attached. Orphaned deals break downstream reporting, pipeline views, and the Sustain sync. Company associations must be managed deliberately. Keeping this view read-only prevents accidental removal and encourages users to manage company-deal relationships from a context where the full impact is visible.

Columns
Column	Source	Notes
Company Name	name	Linked to the company record in HubSpot
Domain	domain	Shown as plain text; - if not set
Phone	phone	Shown as plain text; - if not set
Email	email	Shown as plain text; - if not set

Behaviour
Fetches all associated company IDs from the CRM v4 associations API, then batch-fetches company details (up to 100). Results are paginated at 5 rows per page with prev/next and page-number buttons. Shows 'No associated company found.' when the deal has no linked companies. No add or remove actions are provided.

4. Deal Required Steps Card
A static, non-interactive card displayed on every deal record. It communicates two mandatory workflow steps to deal owners and acts as a persistent reminder to prevent common process mistakes.

Card Details
File	src/app/cards/deal-required-steps.tsx
Card UID	deal_required_steps_card
Surface	Deal record — tab
HubSpot Object	Deal

Purpose
Without guidance embedded in the record itself, deal owners can: forget to link a contact before a deal progresses (leaving deals without a point of contact for proposals and reporting); or advance a deal to 'Proposal' or later stages directly in HubSpot, bypassing the Sustain approval workflow — which breaks the sync between HubSpot and Sustain and may trigger proposals without the required sign-offs. This card is always visible on the deal tab so the rules are present at the moment they are needed, not buried in a wiki.

Steps Displayed
Step 1 — Associate a contact
Users must link at least one contact to the deal using the Deal Contact Association sidebar card. This contact becomes the primary contact for proposal and reporting purposes.

Step 2 — Moving to Proposal Stage?
Deals must not be advanced to 'Proposal' or any later stage directly in HubSpot. Users must navigate to Sustain (https://sustain.slrconsulting.com) to manage stage advancement and approvals. Changes made in Sustain sync back to HubSpot automatically.

Styling
The card renders in a soft yellow box (#ddcb81) with a red danger alert banner at the top to ensure it is visually prominent on the deal record.

5. Financial Details Card
Displays and edits the commercial financials for a deal. Locks fields automatically once a deal advances past the proposal stage to prevent changes after approvals have begun.

Card Details
File	src/app/cards/financial-details-card.jsx
Card UID	deal_financial_details_card
Surface	Deal record — tab
HubSpot Object	Deal

Purpose
HubSpot's default deal properties form does not enforce stage-aware editability or compute a live Total Contract Value. This card provides a structured commercial data-entry experience that mirrors SLR's proposal workflow: fields are open during scoping and proposal preparation, then locked once Sustain takes ownership of the deal progression.

Fields
Label	HubSpot Property	Type	Notes
Charge Type	charge_type	Select	Options loaded from HubSpot deal property definition
Fee Basis	fee_basis	Select	Options loaded from HubSpot deal property definition
Deal Currency	deal_currency	Select	Options restricted to allowed currencies for the proposal manager's region
Labour	labour	Number	Requires currency to be selected before enabling
Expenses	resolved at runtime	Number	Tries expenses, estimated_expenses, estimated_expense, estimated_expense_amount, deal_expenses
3rd Party Fees	estimated_3rd_party_fees	Number	Requires currency to be selected before enabling
FGD %	fixed_general_disbursement_percentage	Number	Stored as decimal (0.05 = 5%); displayed as percentage; capped at 10%
Total Contract Value	computed / amount	Display only	Labour + Expenses + 3rd Party Fees + (Labour x FGD%)

Editability Rules
Fields are editable only when the deal is in one of the following states: Identify (Stage 1), Qualify (Stage 2), or Proposal In Progress (Stage 3) — only when sustain_status is null or 'unknown'. All fields become read-only in any other stage, or once Sustain has taken ownership of the deal. Number inputs (Labour, Expenses, 3rd Party Fees, FGD %) are additionally disabled until a Deal Currency is selected.

Currency Resolution
The list of selectable currencies is derived per deal: (1) Read proposal_manager property from the deal. (2) Look up the proposal manager in the UserMeta custom object to get their region_code. (3) Look up the region code in the Currency custom object to get the allowed_currencies list. (4) Fall back to DEFAULT_REGION_CODE (from config.json) if any lookup fails. The current deal_currency value is always included in the options even if it is not in the allowed list, so existing records are never broken.

Auto-Save Behaviour
Changes trigger a save 500 ms after the last edit (debounced). A savingRef / pendingSaveRef queue serialises concurrent saves to avoid race conditions against the HubSpot API rate limit. Every save also writes deal_currency_code, amount (Total Contract Value), and commercials_updated_at (ISO timestamp). Numeric values are rounded to 2 decimal places before saving (FGD % to 4 decimal places). The initial data load does not trigger a save.

Commercial Updated At
This card updates the commercial updated at field whenever any commercial field changes and on change of that field, there is a workflow that calls sustain Api and sends the commercial fields to sustain.

Alerts
Condition	Alert Type
Expenses property not found on the portal	Warning
Fee Basis or Charge Type options fail to load	Error
Currency config missing for the deal's region	Warning
Auto-save fails	Error
Initial data load fails	Error

6. Primary Deal Contact Card
Allows a deal owner to designate one contact as the primary contact for a deal. The primary contact is stored on the deal as a custom property and must be selected from the contacts already linked to the deal's client company (or companies).

Card Details
Files	src/app/cards/PrimaryDealContact.jsx (re-export)
	src/app/cards/deal-contact/index.jsx (orchestrator)
	src/app/cards/deal-contact/AssociationTable.jsx (display)
	src/app/cards/deal-contact/PanelUI.jsx (selection panel)
Card UID	deal_contact_association_card
Surface	Deal record — sidebar
HubSpot Object	Deal

Purpose
HubSpot has no native concept of a 'primary contact' on a deal. SLR needs to associate one specific contact per deal for proposal generation, reporting, and the Sustain approval workflow. Storing this designation as a custom property (primary_contact_id) makes it available to automations, integrations, and Sustain without requiring manual lookups.

Why the contact pool is restricted to the deal's client
The primary contact must be someone from the client organisation associated with the deal — not an internal SLR user or an unrelated contact. By scoping the contact search to contacts already linked to the deal's associated companies, the card enforces this rule at the UI level and prevents incorrect assignments. Users cannot search all contacts in HubSpot; they can only see and select contacts that belong to one of the companies linked to the deal.

Components
index.jsx — Orchestrator
Fetches the deal's associated company IDs on load. Fetches the current primary_contact_id property from the deal. Passes data to AssociationTable (display current primary contact) and PanelUI (change primary contact). Triggers a full data refresh after a successful save via needToRefresh flag.

AssociationTable.jsx — Current Primary Contact Display
Renders a bordered table row showing the primary contact's name (linked to their HubSpot contact record) and email. Only visible when a primary contact has been set. Supports pagination if multiple contact IDs are passed (currently always one).

PanelUI.jsx — Set Primary Contact Panel
Renders a 'Set Primary Contact' button. Clicking it opens a slide-in panel with the following flow:
1. Load contacts — fetches all contacts from the deal's associated companies (paginated via cursor, 500 per company, up to 100 shown in the panel at a time).
2. Search — live search input with 500 ms debounce. Fires when the query is empty or longer than 3 characters to avoid excessive API calls on short partial queries.
3. Select — user picks one contact via radio button.
4. Save — creates the HubSpot deal-to-contact association (type ID 3, HUBSPOT_DEFINED) so the contact appears in HubSpot's native association panel as well, then PATCHes primary_contact_id on the deal record. Verifies the save persisted by polling the deal up to 5 times (300 ms apart) before declaring success.
5. On success — shows a success alert, updates the sidebar display immediately, and closes the panel.

Panel Action	Behaviour
Cancel	Closes the panel without saving
Clear	Deselects the current radio selection (does not clear the saved value)
Save	Saves the selected contact as the primary contact on the deal

HubSpot Properties Written
Property	Value Written
primary_contact_id	HubSpot object ID of the selected contact


 
HubSpot Associations Created
Association	Type
Deal to Contact	HUBSPOT_DEFINED, type ID 3

An existing association (HTTP 409) is treated as a no-op and does not block saving the primary_contact_id property.

<img width="451" height="695" alt="image" src="https://github.com/user-attachments/assets/be857e89-7b94-413d-8ff7-f0414672422e" />
