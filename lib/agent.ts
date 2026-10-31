import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Guide } from "./schema";
import { checkUrl, fetchDiscovery, probeAuthorize, type ProbeResult } from "./probe";

export const MODEL = "claude-opus-5-5";
const MAX_TURNS = 30;
const MAX_SUBMIT_ATTEMPTS = 4;

export type AgentEvent =
  | { type: "status"; text: string }
  | { type: "note"; text: string } // the agent's own narration between tool calls
  | { type: "search"; query: string }
  | { type: "fetch"; url: string }
  | { type: "probe"; result: ProbeResult }
  | { type: "rejected"; issues: string[] } // submit_guide failed a server-side check
  | { type: "done"; guide: Guide }
  | { type: "error"; text: string };

// The schema source is the contract; its comments double as field-level instructions.
const SCHEMA_SOURCE = readFileSync(join(process.cwd(), "lib", "schema.ts"), "utf8");

function systemPrompt(today: string) {
  return `You are an OAuth setup research agent. A developer building an AI agent wants their users to connect a third-party app. Before launch they must register an OAuth app (client) with that provider, and sometimes pass a review. You investigate the provider and produce a guide that tells them how hard it is, how long it takes (hands-on time vs waiting on approval), the requirements and nuances, what an agent can do vs where they must take over, and how to get past blockers.

Today is ${today}.

## Process
1. Identify the provider and the API most agent builders would use. If the app has no public OAuth (API keys only, partner-only, or no API), say so plainly in the guide: set difficulty very_hard or explain the alternative, and do not invent an OAuth flow.
2. Find the official docs: app registration, OAuth endpoints, scopes, review/verification/marketplace policy, token lifetimes. Use web_search, then web_fetch the most relevant official pages. Prefer docs over blogs; use community sources only for things docs do not cover (e.g. real-world review timelines), and label them "reported".
3. Probe the live OAuth surface:
   - probe_discovery on the provider's issuer (it may not exist; that is a finding).
   - probe_authorize on the authorization endpoint with a realistic scope. You send a deliberately invalid client_id; report what the provider returned (status, redirect, error text). This confirms the endpoint is live and shows the error a misconfigured client produces.
   - check_url on the developer console / app registration page (shows whether it needs a login, or redirects).
4. Cross-check: for each important claim, does a fetched source actually say it? Record this in \`checks\`. If something you expected turned out different, record result "corrected". If you could not confirm something, record "unverified" and add it to \`uncertainties\`.
5. Call submit_guide exactly once with the full guide. If it returns errors, fix them and call it again.

## Evidence rules (strict)
- Every source you cite must be a URL you actually saw this session in a web_search result, a web_fetch, or a probe. The server rejects sources it did not see.
- confidence "tested" requires citing a source of kind "probe" whose url is a URL you probed this session.
- "documented" requires citing an official source; "reported" a community source; "inferred" means no direct source, and should be used honestly where you reason from evidence.
- Include a short verbatim quote on sources where you have one.
- Time estimates for approval are usually not published. Do not make up numbers: give the documented figure if one exists, otherwise a reported range with the source, otherwise say it is unknown and mark it inferred.

## Guide content
- steps: ordered path from zero to working production tokens. owner: "agent" for things an automated agent can do without the developer's account (drafting privacy policy/justification text, generating redirect URIs and config, checking scopes, research); "developer" for things needing their account, identity, payment, or judgment; "provider" for waiting on the provider. Use \`fields\` for console field names with suggested values.
- blockers: exact error strings where known.
- agentVsYou: concrete. "Agent can draft the scope justification for the verification form" beats "Agent can help".
- Keep strings plain and specific. No em dashes. No marketing language.
- Omit \`meta\`; the server fills it.

## Output schema (TypeScript / zod source; the guide must validate against \`Guide\`)
\`\`\`ts
${SCHEMA_SOURCE}
\`\`\``;
}

const tools: Anthropic.Beta.BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12, max_content_tokens: 20000 },
  {
    name: "probe_discovery",
    description:
      "Fetch OpenID Connect / OAuth authorization-server metadata. Pass an issuer (e.g. https://accounts.google.com) or a full .well-known URL. Returns endpoints, PKCE methods, grant types, scopes, or the failure.",
    input_schema: {
      type: "object",
      properties: { issuer: { type: "string", description: "https issuer or .well-known URL" } },
      required: ["issuer"],
    },
  },
  {
    name: "probe_authorize",
    description:
      "Send a request to an OAuth authorization endpoint with a deliberately invalid client_id and a dummy redirect_uri, without following redirects. Returns status, Location header, and page text so you can see how the provider rejects an unknown client. Non-destructive; does not log in.",
    input_schema: {
      type: "object",
      properties: {
        authorization_url: { type: "string" },
        scope: { type: "string", description: "Scope string to include, space-separated as the provider expects" },
      },
      required: ["authorization_url"],
    },
  },
  {
    name: "check_url",
    description:
      "GET a URL (e.g. developer console or app registration page), following redirects. Returns final URL, status, title and a text snippet. Use to see whether a console needs login and where it lands.",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "submit_guide",
    description:
      "Submit the finished guide. The input is validated against the Guide schema and the evidence rules; on failure you receive the list of problems to fix.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { guide: { type: "object", description: "The Guide object, without meta" } },
      required: ["guide"],
    },
  },
];

function normUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    return (x.origin + x.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

// Collect every URL that appears inside server-tool result blocks (search hits, fetched pages).
function collectSeenUrls(content: Anthropic.Beta.BetaContentBlock[], into: Set<string>) {
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "url" && typeof x === "string") into.add(normUrl(x));
        else walk(x);
      }
    }
  };
  for (const b of content) if (b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result") walk(b);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Server-side gate on a submitted guide: schema validity plus evidence integrity. */
export function reviewSubmission(
  raw: unknown,
  ctx: { seen: Set<string>; probed: Set<string>; startedAt: number },
): { guide?: Guide; issues: string[] } {
  const obj = (raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  if (typeof obj.slug === "string") obj.slug = slugify(obj.slug);
  obj.meta = {
    origin: "agent",
    generatedAt: new Date().toISOString(),
    model: MODEL,
    durationMs: Date.now() - ctx.startedAt,
  };
  const parsed = Guide.safeParse(obj);
  if (!parsed.success) {
    return { issues: parsed.error.issues.slice(0, 25).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
  }
  const g = parsed.data;
  const issues: string[] = [];
  const ids = new Map(g.sources.map((s) => [s.id, s]));
  for (const s of g.sources) {
    const n = normUrl(s.url);
    if (s.kind === "probe") {
      if (!ctx.probed.has(n)) issues.push(`source ${s.id} is kind "probe" but ${s.url} was not probed this session`);
    } else if (!ctx.seen.has(n) && !ctx.probed.has(n)) {
      issues.push(`source ${s.id} (${s.url}) never appeared in a search result or fetch this session; fetch it to verify or remove it`);
    }
  }
  // Every cited id must exist, and "tested" must rest on a probe.
  const visit = (v: unknown, path: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visit(x, `${path}[${i}]`));
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (path !== "" && Array.isArray(o.sources)) {
      for (const id of o.sources as string[]) if (!ids.has(id)) issues.push(`${path}: cites unknown source id "${id}"`);
      if (o.confidence === "tested" && !(o.sources as string[]).some((id) => ids.get(id)?.kind === "probe")) {
        issues.push(`${path}: confidence "tested" but cites no probe source`);
      }
      if ((o.confidence === "documented" || o.confidence === "reported") && (o.sources as string[]).length === 0) {
        issues.push(`${path}: confidence "${o.confidence}" but cites no source`);
      }
    }
    for (const [k, x] of Object.entries(o)) if (k !== "sources") visit(x, path ? `${path}.${k}` : k);
  };
  visit(g, "");
  const text = JSON.stringify(g);
  if (text.includes("—")) issues.push("remove em dashes from all strings");
  return issues.length ? { issues: issues.slice(0, 25) } : { guide: g, issues: [] };
}

async function runProbe(name: string, input: Record<string, unknown>): Promise<ProbeResult | { error: string }> {
  const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : "");
  if (name === "probe_discovery") return fetchDiscovery(str("issuer"));
  if (name === "probe_authorize") {
    const scope = str("scope");
    return probeAuthorize(str("authorization_url"), scope ? { scope } : {});
  }
  if (name === "check_url") return checkUrl(str("url"));
  return { error: `unknown tool ${name}` };
}

export async function generateGuide(
  query: string,
  emit: (e: AgentEvent) => void,
  opts: { signal?: AbortSignal; existingSlugs?: string[] } = {},
): Promise<Guide | undefined> {
  const client = new Anthropic();
  const startedAt = Date.now();
  const seen = new Set<string>();
  const probed = new Set<string>();
  let submitAttempts = 0;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Investigate this app and produce its OAuth setup guide: ${JSON.stringify(query)}${
        opts.existingSlugs?.length ? `\n\nSlugs already used in the library (pick a different slug): ${opts.existingSlugs.join(", ")}` : ""
      }`,
    },
  ];
  emit({ type: "status", text: `Starting research on ${query}` });

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (opts.signal?.aborted) throw new Error("aborted");
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system: [{ type: "text", text: systemPrompt(new Date().toISOString().slice(0, 10)), cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      },
      { signal: opts.signal },
    );
    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use") {
        const input = block.input as Record<string, string>;
        if (block.name === "web_search") emit({ type: "search", query: input.query ?? "" });
        else if (block.name === "web_fetch") emit({ type: "fetch", url: input.url ?? "" });
      } else if (block.type === "text" && block.text.trim()) {
        emit({ type: "note", text: block.text.trim() });
      }
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.APIError) throw err;
      emit({ type: "status", text: "A tool input was cut off; retrying the turn" });
      continue;
    }
    collectSeenUrls(message.content, seen);

    if (message.stop_reason === "refusal") {
      emit({ type: "error", text: "The model declined this request." });
      return undefined;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (message.stop_reason === "max_tokens") throw new Error("model output hit max_tokens");
    messages.push({ role: "assistant", content: message.content });

    if (toolUses.length === 0) {
      // Ended without submitting; nudge once per turn.
      messages.push({ role: "user", content: "Call submit_guide with the complete guide now." });
      continue;
    }

    const results = await Promise.all(
      toolUses.map(async (tu): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const input = (tu.input ?? {}) as Record<string, unknown>;
        if (tu.name === "submit_guide") {
          submitAttempts++;
          const review = reviewSubmission(input.guide, { seen, probed, startedAt });
          if (review.guide) return { type: "tool_result", tool_use_id: tu.id, content: "__ACCEPTED__" };
          emit({ type: "rejected", issues: review.issues });
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: `Guide rejected. Fix these and call submit_guide again:\n- ${review.issues.join("\n- ")}`,
          };
        }
        const r = await runProbe(tu.name, input);
        if ("kind" in r) {
          probed.add(normUrl(r.url));
          // Record the base URL too, so a source can cite the endpoint without our probe query string.
          if (r.kind === "authorize") probed.add(normUrl(String(input.authorization_url)));
          if (r.kind === "url" && r.finalUrl) probed.add(normUrl(r.finalUrl));
          emit({ type: "probe", result: r });
        }
        return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(r) };
      }),
    );

    const accepted = toolUses.find((tu, i) => tu.name === "submit_guide" && results[i].content === "__ACCEPTED__");
    if (accepted) {
      const g = reviewSubmission((accepted.input as Record<string, unknown>).guide, { seen, probed, startedAt }).guide!;
      emit({ type: "done", guide: g });
      return g;
    }
    if (submitAttempts >= MAX_SUBMIT_ATTEMPTS) {
      emit({ type: "error", text: "The agent could not produce a guide that passes the evidence checks." });
      return undefined;
    }
    messages.push({ role: "user", content: results });
  }
  emit({ type: "error", text: "The agent ran out of turns before finishing." });
  return undefined;
}
