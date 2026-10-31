import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { DifficultyBadge, Evidence, EvidenceLegend } from "@/components/Badges";
import {
  Alert,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Flask,
  Hourglass,
  Info,
  Octagon,
  Plus,
  Shield,
  Sparkles,
  User,
} from "@/components/Icons";
import { ShareBar } from "@/components/ShareBar";
import { StepList } from "@/components/StepList";
import { StackBar, Swimlane, WaitMeter } from "@/components/Visuals";
import { glanceOf, hostOf } from "@/lib/glance";
import type { Guide } from "@/lib/schema";
import { getGuide, listGuides } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: `${g.name} OAuth setup`, description: g.verdict.headline } : {};
}

const REVIEW = {
  none: { value: "Not required", when: "No provider review for production" },
  conditional: { value: "Sometimes", when: "Depends on scopes or reach" },
  always: { value: "Required", when: "Every app is reviewed" },
} as const;

const REVIEW_LEVELS = ["none", "conditional", "always"] as const;
const REVIEW_COLOR = ["var(--easy)", "var(--moderate)", "var(--very-hard)"];

const TIERS = ["basic", "sensitive", "restricted", "gated"] as const;
const TIER_NOTE: Record<(typeof TIERS)[number], string> = {
  basic: "No review",
  sensitive: "Triggers review",
  restricted: "Review + extra checks",
  gated: "Partner access only",
};

// URL-style scopes (Google) read better as their last path segment; the full value is in the tooltip.
const shortScope = (s: string) => (/^https?:\/\//.test(s) ? s.replace(/\/$/, "").split("/").pop() || s : s);

const SEVERITY_ORDER = { blocker: 0, warning: 1, info: 2 } as const;
const SEVERITY_ICON = { blocker: Octagon, warning: Alert, info: Info } as const;

function Section({ id, title, lede, children }: { id: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section className="section" id={id}>
      <h2>{title}</h2>
      {lede && <p className="lede">{lede}</p>}
      <div className="content">{children}</div>
    </section>
  );
}

function sectionsFor(g: Guide) {
  return [
    ["overview", "Overview"],
    ["who", "Who does what"],
    g.prerequisites.length > 0 && ["before", "Before you start"],
    ["steps", "Steps"],
    ["review", "Review"],
    g.scopes.length > 0 && ["scopes", "Scopes"],
    ["watch", "Watch out for"],
    g.blockers.length > 0 && ["stuck", "Troubleshooting"],
    ["reference", "Technical reference"],
    ["evidence", "Evidence"],
  ].filter(Boolean) as [string, string][];
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const [g, all] = await Promise.all([getGuide(slug), listGuides()]);
  if (!g) notFound();

  const glance = glanceOf(g);
  const t = g.technical;
  const counts = g.checks.reduce<Record<string, number>>((m, c) => ({ ...m, [c.result]: (m[c.result] ?? 0) + 1 }), {});
  const gotchas = [...g.gotchas].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const sevCount = { blocker: 0, warning: 0, info: 0 };
  for (const x of g.gotchas) sevCount[x.severity]++;
  const blockerCount = sevCount.blocker;
  const reviewIdx = REVIEW_LEVELS.indexOf(g.approval.required);
  const technicalRows = (
    [
      ["Authorization URL", t.authorizationUrl],
      ["Token URL", t.tokenUrl],
      ["Discovery", t.discoveryUrl],
      ["PKCE", t.pkce],
      ["Refresh tokens", t.refreshTokens],
      ["Access token lifetime", t.accessTokenLifetime],
      ["Redirect URI rules", t.redirectUriRules],
    ] as [string, string | undefined][]
  ).filter((row): row is [string, string] => Boolean(row[1]));
  const sections = sectionsFor(g);
  const review = REVIEW[g.approval.required];

  return (
    <div className="docs">
      <aside className="sidebar">
        <div className="side-label">Apps</div>
        <nav>
          {all
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((x) => (
              <Link key={x.slug} href={`/guides/${x.slug}`} className={x.slug === g.slug ? "active" : ""}>
                <AppIcon name={x.name} website={x.website} size="sm" />
                {x.name}
                <span className={`lvl d-${x.verdict.difficulty}`} style={{ background: "currentColor" }} title={x.verdict.difficulty} />
              </Link>
            ))}
          <Link href="/generate" className="side-new">
            <Plus size={14} /> Generate a guide
          </Link>
        </nav>
      </aside>

      <article className="guide">
        <div className="crumbs">
          <Link href="/">Apps</Link> <span>/</span> <span>{g.category}</span>
        </div>

        <div className="guide-title">
          <AppIcon name={g.name} website={g.website} size="lg" />
          <div>
            <h1>{g.name}</h1>
            <div className="meta">
              <DifficultyBadge d={g.verdict.difficulty} />
              <a href={g.website} target="_blank" rel="noreferrer" className="muted">
                {hostOf(g.website)}
              </a>
              <span>·</span>
              <span>
                {g.meta.origin === "curated" ? "Reviewed" : "Live-generated"} {g.meta.generatedAt.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>

        <p className="headline">
          {g.verdict.headline}
          <Evidence g={g} x={g.verdict} />
        </p>

        <div className="guide-actions">
          <a className="btn primary" href="#steps">
            Start setup
          </a>
          <ShareBar slug={g.slug} />
        </div>

        <section id="overview">
          <div className="tiles">
            <div className="tile">
              <div className="label">
                <Clock size={13} /> Your setup time
              </div>
              <div className="value">{glance.handsOn.value}</div>
              {glance.handsOn.when && <div className="when">{glance.handsOn.when}</div>}
            </div>
            <div className="tile">
              <div className="label">
                <Hourglass size={13} /> Waiting on provider
              </div>
              <div className="value">{glance.approvalWait.value}</div>
              {glance.waitLevel && (
                <div style={{ margin: "6px 0 2px" }}>
                  <WaitMeter level={glance.waitLevel} />
                </div>
              )}
              {glance.approvalWait.when && <div className="when">{glance.approvalWait.when}</div>}
            </div>
            <div className="tile">
              <div className="label">
                <Flask size={13} /> Test before review
              </div>
              <div className="value" style={{ color: g.effort.testBeforeApproval ? "var(--easy)" : "var(--very-hard)" }}>
                {g.effort.testBeforeApproval ? "Yes" : "No"}
              </div>
              <div className="when">{glance.testing.when ?? glance.testing.value}</div>
            </div>
            <div className="tile">
              <div className="label">
                <Shield size={13} /> Provider review
              </div>
              <div className="value">{review.value}</div>
              <div className="when">
                <a href="#review">{review.when}</a>
              </div>
            </div>
          </div>

          <details className="more">
            <summary>Full details on time and limits</summary>
            <dl className="body">
              <div>
                <dt>Setup time</dt>
                <dd>{g.effort.handsOn}</dd>
              </div>
              <div>
                <dt>Waiting on the provider</dt>
                <dd>{g.effort.approvalWait}</dd>
              </div>
              <div>
                <dt>Limits before review</dt>
                <dd>
                  {g.effort.testingLimits}
                  <Evidence g={g} x={g.effort} />
                </dd>
              </div>
              <div>
                <dt>Summary</dt>
                <dd>{g.summary}</dd>
              </div>
            </dl>
          </details>

          {g.appTypeChoice && (
            <div className="callout">
              <span className="ico">
                <Info size={16} />
              </span>
              <div>
                <strong>Create this kind of app: </strong>
                {g.appTypeChoice.recommendation.replace(/\.$/, "")}.{" "}
                <span className="rest">{g.appTypeChoice.rationale}</span>
                <Evidence g={g} x={g.appTypeChoice} />
              </div>
            </div>
          )}

          {blockerCount > 0 && (
            <div className="callout" style={{ borderColor: "var(--very-hard)", background: "var(--very-hard-soft)" }}>
              <span className="ico" style={{ color: "var(--very-hard)" }}>
                <Octagon size={16} />
              </span>
              <div>
                <strong>
                  {blockerCount} possible blocker{blockerCount > 1 ? "s" : ""}.{" "}
                </strong>
                <span className="rest">
                  {g.gotchas
                    .filter((x) => x.severity === "blocker")
                    .map((x) => x.title)
                    .join("; ")}
                  .{" "}
                </span>
                <a href="#watch">Read before you start</a>
              </div>
            </div>
          )}
        </section>

        <Section id="who" title="Who does what">
          <Swimlane g={g} />
          <div className="duo" style={{ marginTop: 12 }}>
            <details className="more agent" style={{ margin: 0, padding: 16 }}>
              <summary>
                <span className="badge o-agent">
                  <Sparkles size={12} /> Agent can do
                </span>
                <span className="muted small">{g.agentVsYou.agentCan.length}</span>
              </summary>
              <ul>
                {g.agentVsYou.agentCan.map((x) => (
                  <li key={x}>
                    <Check size={14} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </details>
            <details className="more you" style={{ margin: 0, padding: 16 }}>
              <summary>
                <span className="badge o-developer">
                  <User size={12} /> You must do
                </span>
                <span className="muted small">{g.agentVsYou.youMust.length}</span>
              </summary>
              <ul>
                {g.agentVsYou.youMust.map((x) => (
                  <li key={x}>
                    <Circle size={12} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </Section>

        {g.prerequisites.length > 0 && (
          <Section id="before" title="Before you start">
            <div className="risks">
              {g.prerequisites.map((p) => (
                <details key={p.item} className="risk info">
                  <summary>
                    <span className="sev">
                      <Circle size={15} />
                    </span>
                    <span className="rt" style={{ fontWeight: 450 }}>
                      {p.item}
                    </span>
                    <span className="caret">
                      <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div className="rb">
                    <p>
                      {p.why}
                      <Evidence g={g} x={p} />
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </Section>
        )}

        <Section id="steps" title="Steps">
          <StepList g={g} />
        </Section>

        <Section id="review" title="Provider review">
          <div className="review-row">
            <div>
              <div className="k">Needed?</div>
              <div className="gauge">
                {REVIEW_LEVELS.map((r, i) => (
                  <span key={r} style={i <= reviewIdx ? { background: REVIEW_COLOR[reviewIdx] } : undefined} />
                ))}
              </div>
              <div className="gauge-labels">
                {REVIEW_LEVELS.map((r) => (
                  <span key={r} className={r === g.approval.required ? "cur" : ""}>
                    {REVIEW[r].value}
                  </span>
                ))}
              </div>
            </div>
            {glance.waitLevel && (
              <div>
                <div className="k">Wait to launch</div>
                <WaitMeter level={glance.waitLevel} />
              </div>
            )}
          </div>
          <div className="risks" style={{ marginTop: 18 }}>
            {(
              [
                ["When it's needed", g.approval.trigger, Shield],
                ["What happens", g.approval.process, Info],
                ["How long", g.approval.typicalDuration, Hourglass],
              ] as const
            ).map(([label, text, Icon]) => (
              <details key={label} className="risk info">
                <summary>
                  <span className="sev">
                    <Icon size={15} />
                  </span>
                  <span className="rt">{label}</span>
                  <span className="caret">
                    <ChevronDown size={15} />
                  </span>
                </summary>
                <div className="rb">
                  <p>
                    {text}
                    {label === "When it's needed" && <Evidence g={g} x={g.approval} />}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </Section>

        {g.scopes.length > 0 && (
          <Section id="scopes" title="Scopes">
            <div className="tiers">
              {TIERS.filter((tier) => g.scopes.some((s) => s.tier === tier)).map((tier) => (
                <div key={tier} className={`tier-col ${tier}`}>
                  <h4>{tier}</h4>
                  <div className="tier-note">{TIER_NOTE[tier]}</div>
                  <div className="chips">
                    {g.scopes
                      .filter((s) => s.tier === tier)
                      .map((s) => (
                        <span key={s.scope} className="chip" title={`${s.scope}\n\n${s.note}`}>
                          {shortScope(s.scope)}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <details className="more">
              <summary>What each scope means</summary>
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="tbl">
                  <tbody>
                    {g.scopes.map((s) => (
                      <tr key={s.scope}>
                        <td>
                          <code>{s.scope}</code>
                        </td>
                        <td>
                          {s.note}
                          <Evidence g={g} x={s} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Section>
        )}

        <Section id="watch" title="Watch out for">
          <StackBar
            parts={[
              { label: "blockers", value: sevCount.blocker, cls: "bg-very-hard" },
              { label: "warnings", value: sevCount.warning, cls: "bg-moderate" },
              { label: "notes", value: sevCount.info, cls: "bg-muted" },
            ]}
          />
          <div className="risks" style={{ marginTop: 14 }}>
            {gotchas.map((x) => {
              const Icon = SEVERITY_ICON[x.severity];
              return (
                <details key={x.title} className={`risk ${x.severity}`}>
                  <summary>
                    <span className="sev">
                      <Icon size={16} />
                    </span>
                    <span className="rt">{x.title}</span>
                    <span className="caret">
                      <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div className="rb">
                    <p>
                      {x.detail}
                      <Evidence g={g} x={x} />
                    </p>
                  </div>
                </details>
              );
            })}
          </div>
        </Section>

        {g.blockers.length > 0 && (
          <Section id="stuck" title="Troubleshooting">
            <div className="risks">
              {g.blockers.map((b) => (
                <details key={b.symptom} className="risk info">
                  <summary>
                    <span className="sev">
                      <Alert size={16} />
                    </span>
                    <span className="rt err">{b.symptom}</span>
                    <span className="caret">
                      <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div className="rb">
                    <p>
                      <span className="k">Cause</span>
                      {b.cause}
                    </p>
                    <p>
                      <span className="k">Fix</span>
                      {b.resolution}
                      <Evidence g={g} x={b} />
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </Section>
        )}

        <Section id="reference" title="Technical reference">
          <div className="table-wrap">
            <table className="tbl">
              <tbody>
                {technicalRows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ width: 190, color: "var(--muted)" }}>{k}</td>
                    <td>{/^https?:/.test(v) ? <code>{v}</code> : v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="evidence" title="Evidence">
          <StackBar
            parts={[
              { label: "confirmed", value: counts.confirmed ?? 0, cls: "bg-easy" },
              { label: "corrected", value: counts.corrected ?? 0, cls: "bg-moderate" },
              { label: "contradicted", value: counts.contradicted ?? 0, cls: "bg-very-hard" },
              { label: "unverified", value: counts.unverified ?? 0, cls: "bg-muted" },
            ]}
          />
          <div style={{ marginTop: 18 }}>
            <EvidenceLegend />
          </div>

          <details className="more" style={{ marginTop: 16 }}>
            <summary>Verification log ({g.checks.length} checks)</summary>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Result</th>
                    <th>Claim</th>
                    <th>What we found</th>
                  </tr>
                </thead>
                <tbody>
                  {g.checks.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`res r-${c.result}`}>{c.result}</span>
                        <div className="muted small">{c.method.replace("_", " ")}</div>
                      </td>
                      <td>{c.claim}</td>
                      <td>
                        {c.detail}
                        <span className="ev">
                          {c.sources
                            .map((id) => g.sources.findIndex((s) => s.id === id) + 1)
                            .filter((n) => n > 0)
                            .map((n, j) => (
                              <span key={n}>
                                {j > 0 && ","}
                                <a href={`#src-${n}`}>{n}</a>
                              </span>
                            ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {g.uncertainties.length > 0 && (
            <details className="more">
              <summary>Still uncertain ({g.uncertainties.length})</summary>
              <ul className="body" style={{ paddingLeft: 18 }}>
                {g.uncertainties.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </details>
          )}

          <details className="more" open>
            <summary>Sources ({g.sources.length})</summary>
            <ol className="sources">
              {g.sources.map((s, i) => (
                <li key={s.id} id={`src-${i + 1}`}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>{" "}
                  · {s.kind.replace("_", " ")} · {s.accessed}
                  {s.quote && <blockquote>{s.quote}</blockquote>}
                </li>
              ))}
            </ol>
          </details>
        </Section>
      </article>

      <aside className="toc">
        <div className="side-label" style={{ paddingLeft: 0 }}>
          On this page
        </div>
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </aside>
    </div>
  );
}
