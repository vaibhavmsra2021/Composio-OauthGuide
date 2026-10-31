import { z } from "zod";

// How much we trust a claim. Every claim-bearing item in a guide carries one.
//   tested      - an agent observed it directly (live HTTP probe of the provider's endpoints)
//   documented  - stated in a cited official provider source
//   reported    - stated in a cited non-official source (forum, blog, community answer)
//   inferred    - reasoned from other evidence; not directly supported by a source
export const Confidence = z.enum(["tested", "documented", "reported", "inferred"]);
export type Confidence = z.infer<typeof Confidence>;

// Who performs a step. "agent" means an automated agent can do it with no human
// account access (research, generating config, probing endpoints, drafting text).
export const Owner = z.enum(["agent", "developer", "provider", "shared"]);
export type Owner = z.infer<typeof Owner>;

export const Difficulty = z.enum(["easy", "moderate", "hard", "very_hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

const Evidence = {
  confidence: Confidence,
  // ids into guide.sources
  sources: z.array(z.string()).default([]),
};

export const Source = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  kind: z.enum(["official_docs", "official_policy", "community", "probe"]),
  accessed: z.string(), // YYYY-MM-DD
  // Short verbatim excerpt that supports the claims citing this source, when available.
  quote: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const Step = z.object({
  id: z.string(),
  title: z.string(),
  owner: Owner,
  detail: z.string(),
  // Rough hands-on time for this step, e.g. "5 min". Omit when unknown.
  duration: z.string().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  // Field values a developer will be asked for in the provider console, with suggested values.
  fields: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
  ...Evidence,
});
export type Step = z.infer<typeof Step>;

export const Gotcha = z.object({
  title: z.string(),
  detail: z.string(),
  severity: z.enum(["blocker", "warning", "info"]),
  ...Evidence,
});
export type Gotcha = z.infer<typeof Gotcha>;

export const Blocker = z.object({
  symptom: z.string(), // what the developer sees, e.g. an error message or a stalled review
  cause: z.string(),
  resolution: z.string(),
  ...Evidence,
});
export type Blocker = z.infer<typeof Blocker>;

export const Check = z.object({
  claim: z.string(),
  method: z.enum(["probe", "source_review", "setup_attempt"]),
  result: z.enum(["confirmed", "corrected", "contradicted", "unverified"]),
  // What happened. For "corrected", state the earlier belief and the correction.
  detail: z.string(),
  sources: z.array(z.string()).default([]),
});
export type Check = z.infer<typeof Check>;

export const Guide = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(), // e.g. "Google (Gmail API)"
  provider: z.string(), // e.g. "Google"
  website: z.string().url(),
  category: z.string(), // e.g. "Email", "CRM", "Developer tools"
  summary: z.string(), // 2-3 sentences: what the path looks like overall

  verdict: z.object({
    difficulty: Difficulty,
    headline: z.string(), // one line, e.g. "Instant for testing; 4-8 weeks if you need restricted Gmail scopes"
    ...Evidence,
  }),

  effort: z.object({
    handsOn: z.string(), // developer working time, e.g. "30-60 min"
    approvalWait: z.string(), // calendar time waiting on the provider, e.g. "None" or "2-6 weeks"
    // Can a developer get working tokens (for themselves / test users) before any review?
    testBeforeApproval: z.boolean(),
    testingLimits: z.string(), // e.g. "Up to 100 test users while unverified"
    // Scannable versions of the three answers above, shown in tables and tiles. Each value is
    // 1-4 words (e.g. "30-60 min", "Several weeks", "100 test users"); "when" is an optional
    // short qualifier saying what the value depends on (e.g. "for restricted Gmail scopes").
    // approvalWait is the longest wait to launch to users broadly, not the wait for testing.
    // waitLevel buckets that wait for a visual meter; "varies" means it depends on each customer.
    glance: z
      .object({
        handsOn: z.object({ value: z.string(), when: z.string().optional() }),
        approvalWait: z.object({ value: z.string(), when: z.string().optional() }),
        testing: z.object({ value: z.string(), when: z.string().optional() }),
        waitLevel: z.enum(["none", "days", "weeks", "months", "varies"]).optional(),
      })
      .optional(),
    ...Evidence,
  }),

  // Which kind of provider app to create when a provider offers more than one (e.g. GitHub App vs OAuth App).
  appTypeChoice: z
    .object({
      recommendation: z.string(),
      rationale: z.string(),
      ...Evidence,
    })
    .optional(),

  prerequisites: z.array(
    z.object({
      item: z.string(),
      why: z.string(),
      ...Evidence,
    }),
  ),

  steps: z.array(Step),

  approval: z.object({
    // "none": no review for production use. "conditional": only for certain scopes/audiences/listing.
    required: z.enum(["none", "conditional", "always"]),
    trigger: z.string(), // what makes review necessary
    process: z.string(),
    typicalDuration: z.string(),
    ...Evidence,
  }),

  scopes: z
    .array(
      z.object({
        scope: z.string(),
        tier: z.enum(["basic", "sensitive", "restricted", "gated"]),
        note: z.string(),
        ...Evidence,
      }),
    )
    .default([]),

  gotchas: z.array(Gotcha),
  blockers: z.array(Blocker),

  technical: z.object({
    authorizationUrl: z.string().optional(),
    tokenUrl: z.string().optional(),
    discoveryUrl: z.string().optional(),
    pkce: z.string().optional(), // "required" | "supported" | "not supported" | free text
    refreshTokens: z.string().optional(),
    accessTokenLifetime: z.string().optional(),
    redirectUriRules: z.string().optional(),
    ...Evidence,
  }),

  agentVsYou: z.object({
    agentCan: z.array(z.string()),
    youMust: z.array(z.string()),
  }),

  checks: z.array(Check), // the verification log: what was tested, confirmed, corrected
  uncertainties: z.array(z.string()), // what remains unverified, stated plainly
  sources: z.array(Source),

  meta: z.object({
    origin: z.enum(["curated", "agent"]), // curated = researched by agents offline and reviewed; agent = live-generated
    generatedAt: z.string(), // ISO timestamp
    model: z.string().optional(),
    durationMs: z.number().optional(),
  }),
});
export type Guide = z.infer<typeof Guide>;
