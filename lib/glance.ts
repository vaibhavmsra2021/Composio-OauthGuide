import type { Guide } from "./schema";

export type GlanceValue = { value: string; when?: string };
export type WaitLevel = "none" | "days" | "weeks" | "months" | "varies";
export type Glance = { handsOn: GlanceValue; approvalWait: GlanceValue; testing: GlanceValue; waitLevel?: WaitLevel };

// Live-generated guides may predate `effort.glance`, so fall back to the first clause of the long text.
function firstClause(s: string): GlanceValue {
  const head = s.split(/[;.](\s|$)/)[0].trim();
  return head.length <= 32 ? { value: head } : { value: `${head.slice(0, 30).trimEnd()}…` };
}

export function glanceOf(g: Guide): Glance {
  return (
    g.effort.glance ?? {
      handsOn: firstClause(g.effort.handsOn),
      approvalWait: firstClause(g.effort.approvalWait),
      testing: g.effort.testBeforeApproval ? firstClause(g.effort.testingLimits) : { value: "No" },
    }
  );
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
