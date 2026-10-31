// Offline test of the evidence gate that live-generated guides must pass (no model calls).
// Usage: npm run test:gate
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewSubmission } from "../lib/agent";

const base = JSON.parse(readFileSync("data/guides/slack.json", "utf8"));
delete base.meta;
const norm = (u: string) => {
  const x = new URL(u);
  return (x.origin + x.pathname).replace(/\/$/, "").toLowerCase();
};
const allSeen = () => new Set<string>(base.sources.filter((s: any) => s.kind !== "probe").map((s: any) => norm(s.url)));
const allProbed = () => new Set<string>(base.sources.filter((s: any) => s.kind === "probe").map((s: any) => norm(s.url)));
const ctx = () => ({ seen: allSeen(), probed: allProbed(), startedAt: Date.now() });
const clone = () => JSON.parse(JSON.stringify(base));

// 1. A guide whose sources were all seen passes.
let r = reviewSubmission(clone(), ctx());
assert.deepEqual(r.issues, [], `expected pass, got ${r.issues.join("; ")}`);
assert.equal(r.guide?.meta.origin, "agent");
console.log("ok   accepts a guide whose sources were all seen this session");

// 2. A source URL the agent never saw is rejected.
let g = clone();
g.sources.push({ id: "fake", title: "Made up", url: "https://example.org/not-read", kind: "official_docs", accessed: "2026-10-30" });
g.steps[0].sources.push("fake");
r = reviewSubmission(g, ctx());
assert.ok(r.issues.some((i) => i.includes("never appeared")), r.issues.join("; "));
console.log("ok   rejects a cited URL that never appeared in search, fetch, or probe");

// 3. "tested" without a probe source is rejected.
g = clone();
g.steps[0].confidence = "tested";
g.steps[0].sources = g.sources.filter((s: any) => s.kind !== "probe").slice(0, 1).map((s: any) => s.id);
r = reviewSubmission(g, ctx());
assert.ok(r.issues.some((i) => i.includes('"tested" but cites no probe')), r.issues.join("; "));
console.log("ok   rejects a tested claim that cites no probe");

// 4. A probe source that was not actually probed is rejected.
const c = ctx();
c.probed.clear();
r = reviewSubmission(clone(), c);
assert.ok(r.issues.some((i) => i.includes("was not probed")), r.issues.join("; "));
console.log("ok   rejects a probe source when no probe ran");

// 5. Dangling source ids and uncited documented claims are rejected.
g = clone();
g.gotchas[0].sources = ["nope"];
g.blockers[0].confidence = "documented";
g.blockers[0].sources = [];
r = reviewSubmission(g, ctx());
assert.ok(r.issues.some((i) => i.includes('unknown source id "nope"')));
assert.ok(r.issues.some((i) => i.includes('"documented" but cites no source')));
console.log("ok   rejects dangling source ids and uncited documented claims");

// 6. Schema violations come back as readable paths.
g = clone();
g.verdict.difficulty = "trivial";
r = reviewSubmission(g, ctx());
assert.ok(r.issues.some((i) => i.startsWith("verdict.difficulty")));
console.log("ok   reports schema errors by path");
