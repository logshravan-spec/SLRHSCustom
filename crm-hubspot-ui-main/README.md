# SLR APP — HubSpot UI Extensions

Custom CRM cards for SLR Consulting built on the HubSpot UI Extensions platform. The cards add deal workflow guidance, financial data entry, and association management to Deal, Company, and Contact records in HubSpot.

## Cards

| Card | Object | Surface | Purpose |
|---|---|---|---|
| [Financial Details](docs/cards/financial-details-card.md) | Deal | Tab | Edit deal commercials (Labour, Expenses, 3rd Party Fees, FGD %, Currency) with stage-gated locking and live TCV calculation |
| [Deal Required Steps](docs/cards/deal-required-steps.md) | Deal | Tab | Persistent workflow guardrail — associate a contact and use Sustain for stage advancement |
| [Deal Companies Association](docs/cards/deal-companies-association.md) | Deal | Tab | Read-only view of companies linked to a deal |
| [Company Deals Association](docs/cards/company-deals-association.md) | Company | Tab | Read-only view of deals linked to a company, with an Add Deal action |
| [Contact Deals Tab](docs/cards/contact-deals-tab.md) | Contact | Tab | Read-only view of deals linked to a contact |
| [Primary Deal Contact](docs/cards/primary-deal-contact.md) | Deal | Sidebar | Designate one contact (from the deal's client company) as the primary contact |

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [HubSpot CLI](https://developers.hubspot.com/docs/guides/crm/ui-extensions/quickstart) — `npm install -g @hubspot/cli`
- Access to the SLR HubSpot portal
- A HubSpot Personal Access Token (PAT) with CRM read/write scopes

## Setup

**1. Install dependencies**

```bash
cd src/app/cards
npm install
```

**2. Configure environment**

Copy the example config and fill in your values:

```bash
cp src/app/cards/config.example.json src/app/cards/config.json
```

Then open `src/app/cards/config.json` and replace:
- `HUBSPOT_TOKEN` / `HUBSPOT_TOKEN_FINANCIAL` — your HubSpot Personal Access Token (PAT)
- `USER_META_CUSTOM_OBJECT_TYPE_ID` / `CURRENCY_CUSTOM_OBJECT_TYPE_ID` — custom object type IDs from your portal (Settings → Objects → Custom Objects)
- `STAGE_1` / `STAGE_2` / `STAGE_3` — deal pipeline stage IDs for Identify, Qualify, and Proposal In Progress (Settings → CRM → Deals → Pipelines)

If you have been given a pre-filled environment config, copy that instead:

```bash
# Development sandbox
cp src/app/cards/dev-config.json src/app/cards/config.json

# UAT
cp src/app/cards/uat-config.json src/app/cards/config.json

# Production
cp src/app/cards/prod-config.json src/app/cards/config.json
```

> `config.json` and all `*-config.json` files are gitignored — never commit them. They contain secrets.

**3. Authenticate the HubSpot CLI**

```bash
hs auth
```

## Development

Run in watch mode — changes sync to the HubSpot dev sandbox automatically:

```bash
hs project dev
```

## Deployment

Upload to HubSpot:

```bash
hs project upload
```

## Project Structure

```
src/
  app/
    app-hsmeta.json              # App registration (uid, scopes, permitted fetch URLs)
    cards/
      financial-details-card.jsx         # Deal financial details
      financial-details-card-hsmeta.json
      deal-required-steps.tsx            # Deal workflow guardrail
      deal_required_steps_card-hsmeta.json
      deal-companies-association.tsx     # Companies on deal record
      deal-companies-hsmeta.json
      company-deals-association.tsx      # Deals on company record
      company-deals-hsmeta.json
      contact-deals-tab.tsx              # Deals on contact record
      PrimaryDealContact.jsx             # Primary contact sidebar (re-export)
      deal-contact/
        index.jsx                        # Orchestrator
        AssociationTable.jsx             # Current primary contact display
        PanelUI.jsx                      # Contact selection panel
      config.json                        # Local config (gitignored)
      dev-config.json                    # Dev template
docs/
  cards/                         # Per-card documentation
  tech-analysis/                 # Tech analysis docs (CRM tickets)
```

## Key Conventions

- **API calls** use `hubspot.fetch()` — never native `fetch()`. Only URLs listed in `app-hsmeta.json` under `permittedUrls.fetch` are allowed by the HubSpot sandbox.
- **Config values** (tokens, stage IDs, custom object type IDs, property names) always come from `config.json`. Never hardcode environment-specific values in source files.
- **Association cards are read-only** — removing a company from a deal creates orphaned deals that break reporting and Sustain sync.
- **Primary contact** must belong to one of the companies linked to the deal (enforced at the UI level).
- **New cards** should use `.tsx`; existing `.jsx` cards are not being migrated.

## Environment Config Keys

| Key | Description |
|---|---|
| `HUBSPOT_TOKEN` | PAT used by association and contact cards |
| `HUBSPOT_TOKEN_FINANCIAL` | PAT used by the Financial Details card |
| `USER_META_CUSTOM_OBJECT_TYPE_ID` | HubSpot type ID for the UserMeta custom object |
| `CURRENCY_CUSTOM_OBJECT_TYPE_ID` | HubSpot type ID for the Currency custom object |
| `DEFAULT_REGION_CODE` | Fallback region when no proposal manager is found |
| `PROPOSAL_MANAGER_PROPERTY` | Deal property holding the proposal manager owner ID |
| `USER_META_USER_PROPERTY` | UserMeta property to match against the proposal manager |
| `REGION_CODE_PROPERTY` | UserMeta property containing the region code |
| `COMPANY_CODE_PROPERTY` | Currency object property matching the region code |
| `ALLOWED_CURRENCIES_PROPERTY` | Currency object property listing allowed currency codes |
| `SUSTAIN_STATUS_PROPERTY` | Deal property set by Sustain to indicate ownership |
| `STAGE_1` | Deal stage ID for **Identify** |
| `STAGE_2` | Deal stage ID for **Qualify** |
| `STAGE_3` | Deal stage ID for **Proposal In Progress** |

## Further Reading

- [HubSpot UI Extensions overview](https://developers.hubspot.com/docs/guides/crm/ui-extensions/overview)
- [HubSpot CRM API reference](https://developers.hubspot.com/docs/reference/api/overview)
- [Card documentation](docs/cards/)
- [CLAUDE.md](CLAUDE.md) — conventions and architecture notes for AI-assisted development

## Owner

John Pollo — john@team8solutions.com
