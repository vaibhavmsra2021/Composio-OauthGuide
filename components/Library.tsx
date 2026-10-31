"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Glance } from "@/lib/glance";
import type { Difficulty } from "@/lib/schema";
import { AppIcon } from "./AppIcon";
import { DifficultyBadge } from "./Badges";
import { Check, Chevron, Clock, Flask, Hourglass, Search, Sparkles, X } from "./Icons";
import { WaitMeter } from "./Visuals";

export type GuideRow = {
  slug: string;
  name: string;
  provider: string;
  website: string;
  category: string;
  difficulty: Difficulty;
  glance: Glance;
  testBeforeApproval: boolean;
  origin: "curated" | "agent";
};

export function Library({ guides }: { guides: GuideRow[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const needle = q.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  const shown = useMemo(
    () =>
      needle
        ? guides.filter((g) => `${g.name} ${g.provider} ${g.category} ${g.website}`.toLowerCase().includes(needle))
        : guides,
    [guides, needle],
  );

  const generate = () => q.trim() && router.push(`/generate?q=${encodeURIComponent(q.trim())}`);

  return (
    <>
      <form
        className="searchbox"
        onSubmit={(e) => {
          e.preventDefault();
          if (shown.length === 1) router.push(`/guides/${shown[0].slug}`);
          else if (shown.length === 0) generate();
        }}
      >
        <div className="field">
          <Search />
          <input
            aria-label="App name or website"
            placeholder="Search apps, or paste a website"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <button type="button" className="btn primary" disabled={!needle} onClick={generate}>
          <Sparkles size={15} /> Generate guide
        </button>
      </form>
      <div className="hint">
        {needle && shown.length === 0 ? (
          <>
            Not listed. Press <kbd>Enter</kbd> to generate (2 to 5 min).
          </>
        ) : (
          <>{guides.length} apps · not listed? Type it and generate.</>
        )}
      </div>

      <div className="table-card" style={{ marginTop: 28 }}>
        <table className="apps">
          <thead>
            <tr>
              <th>App</th>
              <th>Difficulty</th>
              <th className="hide-sm">
                <span className="th-tip" title="Your hands-on time to get working tokens">
                  <Clock size={12} /> Setup
                </span>
              </th>
              <th className="hide-md">
                <span className="th-tip" title="Longest wait on the provider before you can launch to all users">
                  <Hourglass size={12} /> Wait to launch
                </span>
              </th>
              <th className="hide-md">
                <span className="th-tip" title="Can you get working tokens before any review?">
                  <Flask size={12} /> Test now
                </span>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => (
              <tr key={g.slug} onClick={() => router.push(`/guides/${g.slug}`)}>
                <td>
                  <div className="app">
                    <AppIcon name={g.name} website={g.website} />
                    <div>
                      <Link href={`/guides/${g.slug}`} onClick={(e) => e.stopPropagation()}>
                        {g.name}
                      </Link>
                      <div className="sub">
                        {g.category}
                        {g.origin === "agent" && " · Live-generated"}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <DifficultyBadge d={g.difficulty} />
                </td>
                <td className="hide-sm" title={g.glance.handsOn.when}>
                  {g.glance.handsOn.value}
                </td>
                <td className="hide-md">
                  {g.glance.waitLevel ? (
                    <WaitMeter
                      level={g.glance.waitLevel}
                      title={[g.glance.approvalWait.value, g.glance.approvalWait.when].filter(Boolean).join(": ")}
                    />
                  ) : (
                    g.glance.approvalWait.value
                  )}
                </td>
                <td className="hide-md" title={[g.glance.testing.value, g.glance.testing.when].filter(Boolean).join(": ")}>
                  <span className={g.testBeforeApproval ? "yes" : "no"} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    {g.testBeforeApproval ? <Check size={15} /> : <X size={15} />}
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>{g.glance.testing.value}</span>
                  </span>
                </td>
                <td className="chev">
                  <Chevron />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>
                  <div style={{ fontWeight: 550 }}>No guide for &ldquo;{q.trim()}&rdquo; yet</div>
                  <div className="muted small" style={{ margin: "4px 0 14px" }}>
                    An agent can read the provider&apos;s docs, probe its OAuth endpoints, and write one now.
                  </div>
                  <button className="btn primary" onClick={generate}>
                    <Sparkles size={15} /> Generate a guide for {q.trim()}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
