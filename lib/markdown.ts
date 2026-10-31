import type { Confidence, Guide, Owner } from "./schema";

export const DIFFICULTY_LABEL = { easy: "Easy", moderate: "Moderate", hard: "Hard", very_hard: "Very hard" } as const;
export const OWNER_LABEL: Record<Owner, string> = {
  agent: "Agent can do",
  developer: "You",
  provider: "Provider (wait)",
  shared: "Agent + you",
};
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  tested: "Tested",
  documented: "Documented",
  reported: "Reported",
  inferred: "Inferred",
};

function cite(g: Guide, ids: string[]): string {
  const nums = ids.map((id) => g.sources.findIndex((s) => s.id === id) + 1).filter((n) => n > 0);
  return nums.length ? ` [${nums.join(", ")}]` : "";
}

export function guideToMarkdown(g: Guide, url?: string): string {
  const L: string[] = [];
  const ev = (x: { confidence: Confidence; sources: string[] }) => `_${CONFIDENCE_LABEL[x.confidence]}_${cite(g, x.sources)}`;

  L.push(`# ${g.name}: OAuth app setup guide`, "");
  if (url) L.push(`Source: ${url}`, "");
  L.push(`**${DIFFICULTY_LABEL[g.verdict.difficulty]}.** ${g.verdict.headline} ${ev(g.verdict)}`, "", g.summary, "");
  L.push(
    "| Hands-on time | Wait for approval | Test before approval |",
    "|---|---|---|",
    `| ${g.effort.handsOn} | ${g.effort.approvalWait} | ${g.effort.testBeforeApproval ? "Yes" : "No"}: ${g.effort.testingLimits} |`,
    "",
  );
  if (g.appTypeChoice) L.push(`**Which app type:** ${g.appTypeChoice.recommendation.replace(/\.$/, "")}. ${g.appTypeChoice.rationale} ${ev(g.appTypeChoice)}`, "");

  L.push("## What an agent can do vs what you must do", "", "**Agent can:**");
  g.agentVsYou.agentCan.forEach((x) => L.push(`- ${x}`));
  L.push("", "**You must:**");
  g.agentVsYou.youMust.forEach((x) => L.push(`- ${x}`));
  L.push("");

  if (g.prerequisites.length) {
    L.push("## Before you start", "");
    g.prerequisites.forEach((p) => L.push(`- **${p.item}**: ${p.why} ${ev(p)}`));
    L.push("");
  }

  L.push("## Steps", "");
  g.steps.forEach((s, i) => {
    L.push(`${i + 1}. **${s.title}** (${OWNER_LABEL[s.owner]}${s.duration ? `, ${s.duration}` : ""}) ${ev(s)}`);
    L.push(`   ${s.detail}`);
    s.fields.forEach((f) => L.push(`   - \`${f.name}\`: ${f.value}`));
    s.links.forEach((l) => L.push(`   - [${l.label}](${l.url})`));
  });
  L.push("");

  L.push("## Approval", "", `**Required:** ${g.approval.required}. ${g.approval.trigger} ${ev(g.approval)}`, "");
  L.push(g.approval.process, "", `**Typical duration:** ${g.approval.typicalDuration}`, "");

  if (g.scopes.length) {
    L.push("## Scopes", "", "| Scope | Tier | Note |", "|---|---|---|");
    g.scopes.forEach((s) => L.push(`| \`${s.scope}\` | ${s.tier} | ${s.note}${cite(g, s.sources)} |`));
    L.push("");
  }

  L.push("## Nuances and gotchas", "");
  g.gotchas.forEach((x) => L.push(`- **[${x.severity}] ${x.title}**: ${x.detail} ${ev(x)}`));
  L.push("");

  L.push("## If you get stuck", "");
  g.blockers.forEach((b) => L.push(`- **${b.symptom}**`, `  - Cause: ${b.cause}`, `  - Fix: ${b.resolution} ${ev(b)}`));
  L.push("");

  const t = g.technical;
  L.push("## Technical reference", "");
  (
    [
      ["Authorization URL", t.authorizationUrl],
      ["Token URL", t.tokenUrl],
      ["Discovery", t.discoveryUrl],
      ["PKCE", t.pkce],
      ["Refresh tokens", t.refreshTokens],
      ["Access token lifetime", t.accessTokenLifetime],
      ["Redirect URI rules", t.redirectUriRules],
    ] as const
  ).forEach(([k, v]) => v && L.push(`- **${k}:** ${v}`));
  L.push("");

  L.push("## How this guide was verified", "");
  g.checks.forEach((c) => L.push(`- **${c.result}** (${c.method.replace("_", " ")}): ${c.claim}. ${c.detail}${cite(g, c.sources)}`));
  L.push("");
  if (g.uncertainties.length) {
    L.push("## Still uncertain", "");
    g.uncertainties.forEach((u) => L.push(`- ${u}`));
    L.push("");
  }
  L.push("## Sources", "");
  g.sources.forEach((s, i) => L.push(`${i + 1}. [${s.title}](${s.url}) (${s.kind.replace("_", " ")}, accessed ${s.accessed})`));
  L.push("", `_Generated ${g.meta.generatedAt.slice(0, 10)} (${g.meta.origin === "curated" ? "agent-researched, reviewed" : "live agent run"})._`);
  return L.join("\n");
}
