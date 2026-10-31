# OAuth App Guides

Look up an app and find out what it takes to get an OAuth app ready for your users. Each guide covers how hard it is, how much of the time is your work versus waiting on the provider, what can block approval, and which steps an agent can do for you. If an app is not in the library, an agent researches it live and writes a shareable guide.

## What's here

- **Library** (`/`): agent-researched guides for eight apps, chosen because their setup paths differ: GitHub, Notion, Slack, HubSpot, Salesforce, Microsoft 365 (Graph), LinkedIn, and Google (Gmail). One table compares them: difficulty, setup time, a wait-to-launch meter, and whether you can test before review.
- **Guide page** (`/guides/:slug`):
  - verdict plus four tiles: setup time, wait on the provider, test before review, review needed
  - a "who does what" swimlane with every step plotted in the Agent, You, or Provider lane
  - a numbered step timeline that saves your progress; details and console values open on click
  - review gauge, scope chips grouped by tier, gotchas sorted by severity, and troubleshooting with exact error strings
  - technical reference, a verification bar and log, open uncertainties, and sources
- **Share**: copy link, or export Markdown or JSON (`/api/guides/:slug`, `?format=md`) for pasting into a ticket or an agent's context.
- **Live generation** (`/generate?q=…`): an agent searches and reads the provider's docs, probes the live OAuth endpoints, and submits a guide. A four-stage progress strip and an activity feed stream to the page as it goes.
- **Method page** (`/method`): how evidence is labeled and checked.

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for live generation
npm run dev                  # http://localhost:3000
```

The library and guide pages work without a key. Only live generation calls the model.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required for live generation (Claude with web search and web fetch) |
| `BLOB_READ_WRITE_TOKEN` | Optional. Stores generated guides in Vercel Blob, so share links survive redeploys. Without it, guides go to `data/generated/` (locally) or `/tmp` (on Vercel, not durable) |
| `GENERATE_RUNS_PER_HOUR` | Optional per-IP cap on live runs (default 6) |

Deploying to Vercel: import the repo, set the variables above, and add a Blob store. `/api/generate` sets `maxDuration = 300`.

Other scripts:

```bash
npm run validate                    # schema and citation-integrity check over data/guides/*.json
npm run test:gate                   # offline tests of the evidence gate that live guides must pass
npm run probe -- discovery https://accounts.google.com
npm run probe -- authorize https://github.com/login/oauth/authorize scope=repo
```

## Key decisions

**Scope: what decides launch timing.** Developers rarely get stuck on the OAuth protocol. The surprises are:
1. A review that starts right before launch (Google restricted scopes, LinkedIn partner APIs, Slack Marketplace).
2. Caps that apply while unreviewed (test-user limits, install caps, rate limits).
3. Setup only you can do (a Company Page, a partner ID, a verified domain).

So every guide separates **hands-on time** from **waiting on the provider**, says whether you can **test before approval** and within what limits, and ties review triggers to **specific scopes**. The same provider can be easy for sign-in and very hard for reading mail.

**One schema for everything** ([lib/schema.ts](lib/schema.ts)). Curated and live guides use the same typed contract. Every claim carries a confidence (`tested`, `documented`, `reported`, `inferred`) and source ids. The schema's comments double as the agent's field instructions.

**"Tested" means something.** Without a provider account, an agent can still try part of the setup. [lib/probe.ts](lib/probe.ts):
- fetches OIDC discovery metadata
- sends an authorization request with a deliberately invalid `client_id` to see how the provider rejects it
- checks where the developer console lands

These probes are the only basis for a "Tested" label. They found real things: LinkedIn's discovery document shows the current sign-in scopes, and Slack sends an unknown client to workspace sign-in instead of an error page.

**A server-side evidence gate on live generation** ([lib/agent.ts](lib/agent.ts) `reviewSubmission`). The agent's guide is rejected and sent back with a list of problems when:
- it cites a URL that never appeared in its search results, fetched pages, or probes during that run
- it labels a claim "tested" without a probe source that actually ran
- it labels a claim "documented" or "reported" without a source
- it fails the schema

This is the main defense against confident, made-up guidance. `npm run test:gate` covers it.

**Agents for research, humans for identity.** Agents do not log in, create accounts, accept terms, or submit review forms. Guides say what an agent can prepare (scope justifications, privacy-policy drafts, manifests, redirect URIs, demo scripts) and where you take over.

**Curated library built by the same kind of agent.** The eight seed guides were produced by research agents working in parallel. They had the same schema, the same probe tool, and an instruction to log corrections. Then `npm run validate` checked them and I reviewed them. Live generation is the same process, compressed into one agent run with the gate in front of it.

**Visual first, details on demand.** A developer's first questions are "how hard, how long, and who does what", so those are answered with shapes before words: difficulty bars, a wait meter, the swimlane, stacked bars for risks and checks. Every long explanation is still on the page, one click away in a collapsed row, and evidence shows as a small colored dot with citation numbers rather than a label on every line. The layout follows the docs style of the Composio managed-auth directory: a sidebar of apps, an "On this page" index, and plain tables.

**Short values live in the data, not the UI.** Tables and tiles need 1 to 4 word answers ("30-60 min", "Several weeks", "100 test users") that the long effort text cannot be safely truncated into. So the schema has an optional `effort.glance` block with a short value, an optional qualifier, and a `waitLevel` bucket (`none`, `days`, `weeks`, `months`, `varies`) for the meter. Its wait is the longest wait to launch to all users, not the wait to start testing, because that is the number that slips launches. Live guides fill it from the schema comments; if one does not, the UI falls back to the first clause of the long text.

**Stack.** Next.js on Node, deployable to Vercel. Claude (`claude-opus-5-5`, adaptive thinking, medium effort) with the server-side `web_search` and `web_fetch` tools plus three custom probe tools and a `submit_guide` tool. Server-side refusal fallback is enabled (`fallbacks: "default"`). Progress streams to the browser as NDJSON.

## Checking the guidance against sources

Every guide ends with a verification log. Across the library, agents recorded corrections where official docs or live probes contradicted common belief or older docs. Examples:

- **Slack**: the assumption that existing unlisted installs are exempt from the 2025 `conversations.history` rate limits is wrong. The limits reached existing installs on March 3, 2026.
- **Slack (probe)**: an unknown `client_id` at the authorize endpoint redirects to workspace sign-in instead of showing an error.
- **Notion**: `notion.so/my-integrations` now redirects to the Developer portal, and "integrations" are now "connections". Security review applies only to Marketplace listings.
- **LinkedIn (probe plus docs)**: sign-in scopes are `openid profile email`, not `r_liteprofile`. The Community Management Development tier limits were raised.
- **HubSpot**: developer accounts were merged into standard accounts (2026-03-09). Legacy public apps can no longer be created. Unlisted public apps are capped at 25 installs. The v1 token endpoint is deprecated in favor of `/oauth/v3/token`.

**Independent spot-check (by me, not the research agents).** I re-read the primary source for five high-stakes claims.

| Claim in guide | Source re-read | Result |
|---|---|---|
| Google Testing mode: up to 100 test users; refresh tokens expire 7 days after consent | support.google.com/cloud/answer/15549945 | Confirmed, including the exception the guide states (name/email/profile-only apps don't expire) |
| Slack: rate limits reached existing unlisted installs on March 3, 2026 | Slack changelog | Confirmed |
| HubSpot: unlisted marketplace-distribution apps capped at 25 installs from Sept 22, 2025 | HubSpot changelog | Confirmed. Private-distribution apps have a separate cap (10, or 100 for Solution Partners), which the guide also states |
| Salesforce: new Connected App creation is off by default since Spring '26; use an External Client App | developer.salesforce.com "Create a Connected App in Your Org" | Confirmed: Salesforce Customer Support must enable an org permission first. This guide leans on more "Reported" claims (8) than the others, because most Salesforce help pages returned 403 to the agent. The guide says so |
| HubSpot discovery probe | Probe result in the guide | The `.well-known` metadata at api.hubapi.com describes HubSpot's MCP server, not the app OAuth flow. The guide labels it correctly and turns it into a gotcha instead of a wrong endpoint |

Things the agents could not confirm are listed under "Still uncertain" in each guide rather than guessed. Examples: LinkedIn and Google review timelines (not published), Slack PKCE support, and Notion's access-token lifetime.

## Limitations

- **Review timelines are mostly not published.** Where a guide gives a range, check its label. "Reported" ranges come from vendor blogs and forums.
- **No authenticated setup attempts.** Agents stop at the login wall. A deeper version would run a browser agent inside a sandbox provider account to walk the console and record the real field names and screens.
- **Freshness.** Guides are dated but not re-verified automatically. The next step would be a scheduled re-run that diffs guides and flags changed claims.
- **Citation, not entailment.** The gate proves the agent read a source. It does not prove the source says exactly what the claim says. A second-pass checker that matches each claim against its quoted excerpt would close that gap.
- **The short values are a judgment call.** The `glance` values and wait levels for the eight curated guides were condensed by hand from each guide's own effort and approval text. A bucket like "weeks" hides the range, and "Per customer" hides that some customers approve in minutes. The full text and sources are one click away on every guide.
- **App icons come from Google's favicon service**, so the browser sends each provider's domain to Google. A letter shows if the icon fails to load.
- **Live runs take 2 to 5 minutes** and cost model and search spend, so they are rate limited per IP.
- **The library has 8 guides, not 100.** Scaling up means batching the same generation pipeline, putting a reviewer queue in front of anything with low evidence coverage, and running the scheduled refresh.
