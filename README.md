# LeadFlow NYC

LeadFlow NYC is a real-estate prospecting workspace for New York City agents and
brokerage teams. It helps agents turn public property-record signals into
researched, organized opportunities and manage the work that may lead to a
seller conversation.

LeadFlow is a prospecting and workflow tool, **not** a database of confirmed
sellers. A property score or public record does not establish that its owner
wants to sell, is the current owner, or has consented to be contacted.

## What it does

- **Solo-agent workspace:** Configure borough coverage, focus areas, and property
  preferences; review a personalized opportunity feed and manage follow-ups.
- **Brokerage workspace:** Organize a team, view borough coverage, and distribute
  opportunities across agents.
- **Property research:** Search for NYC addresses, review property attributes
  and public-record signals, and research ownership candidates.
- **Opportunity pipeline:** Track researched properties through prospecting and
  listing stages.
- **Research briefs:** Generate an AI-assisted seller research brief and
  download a PDF. A rules-based summary is available when AI credentials are
  not configured.
- **Outreach planning:** Prepare call, voicemail, and mail drafts, create a
  follow-up sequence, and save conversation notes.
- **Public data:** Retrieve property information from NYC Open Data's Primary
  Land Use Tax Lot Output (PLUTO), with related ACRIS and Department of Finance
  lookups where available.

## How it is intended to be used

1. Choose a solo-agent or brokerage workspace.
2. Set a territory or review NYC property opportunities.
3. Research a specific address and check the available public records.
4. Verify ownership, authority, contact information, and permission to contact
   using appropriate current sources.
5. Add qualified research to the pipeline, plan compliant outreach, and record
   follow-ups and conversations.
6. Track appointments and listing outcomes.

Opportunity scores are heuristic research-prioritization signals based on
public property attributes. They are not predictions of sale intent or
guaranteed lead quality.

## Current project status

This is an actively evolving prototype. The interface and core prospecting
workflows are implemented, but some integrations and production foundations are
not complete:

- Most workspace preferences, pipeline records, tasks, and notes are stored in
  browser `localStorage`; they are not synchronized across devices or users.
- Workspace selection is not a production-grade authorization boundary.
  Brokerage access controls, secure invitations, and server-side tenant
  isolation still need to be implemented.
- Opportunity scoring is heuristic and is not trained on conversion outcomes.
- Public records can be incomplete, delayed, or outdated; owner and entity
  information must be independently verified.
- Outreach drafts and follow-up sequences are planning tools. The app does not
  automatically send mail, email, SMS, or calls.
- Call notes can be entered as text; browser recording and transcription are not
  integrated.
- Notifications, durable background reminders, and historical property-change
  monitoring are not yet production services.
- Brokerage access controls, secure invitations, workspace-scoped CRM
  persistence, audit history, and applicable privacy and communications
  compliance workflows need further production work.

Do not treat public records as verified contact details or permission to
contact. Agents and brokerages remain responsible for verifying information,
respecting suppression requests, and following applicable laws and professional
rules.

## Technology

- Next.js App Router, React, TypeScript, and Tailwind CSS
- NYC Open Data APIs for public property research
- Supabase Auth and PostgreSQL-backed public intake
- Organization and property-intelligence schemas in `supabase/migrations`
- Optional Mapbox address autocomplete
- Optional OpenAI-assisted research briefs
- Optional Stripe and voice integration scaffolding

Some integrations are only partially wired or reserved for future development.
See `.env.example` and the setup guides before enabling them.

## Run locally

Requirements: Node.js compatible with the installed Next.js version and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

### Optional configuration

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configure the
  Supabase intake flow.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the
  browser.
- `SCHOOL_API_KEY` and `SCHOOL_API_BASE_URL` enable server-side property
  enrichment. Without a key, enrichment uses a deterministic local summary.
- `MAPBOX_ACCESS_TOKEN` enables server-side address autocomplete.
- `OPENAI_API_KEY` enables AI-assisted seller research briefs and personalized
  outreach drafts and action-plan chat. Without it, the assistant uses an
  explicitly labeled rules-based planning preview and outreach uses a
  template fallback. Model-written plans and drafts require an authenticated
  workspace. The assistant can automatically run read-only lookups against the
  app's configured official NYC public-record sources; it asks for approval
  before saving internal tasks or drafts. Contact names, phone/email values,
  and owner mailing candidates are displayed in the results panel and excluded
  from AI research summaries. General-purpose web crawling is not implemented.
  Calls, emails, and mail are never sent automatically.
- Stripe and voice environment variables are integration scaffolding and may
  require additional setup before use.

See [Phase 1 setup](./docs/phase1-setup.md) for the Supabase database foundation
and [Phase 2 setup](./docs/phase2-setup.md) for the public intake flow. The
multi-tenant and property-intelligence migrations are in `supabase/migrations`.

## Data sources

Property opportunity data is requested from NYC Open Data, using the PLUTO
dataset. Ownership and tax research may use ACRIS and Department of Finance
public datasets. These sources are informational and do not guarantee that a
record is current or correctly matched to a person.

## License

No license has been selected yet. All rights are reserved unless a license is
added to this repository.
