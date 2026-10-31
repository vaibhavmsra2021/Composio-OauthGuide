import type { WaitLevel } from "@/lib/glance";
import type { Difficulty, Guide, Owner } from "@/lib/schema";

const WAIT_STEPS = ["none", "days", "weeks", "months"] as const;
const WAIT_LABEL: Record<WaitLevel, string> = {
  none: "None",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  varies: "Per customer",
};

/** Four-cell meter: how long you wait on the provider before launching broadly. */
export function WaitMeter({ level, title }: { level: WaitLevel; title?: string }) {
  const filled = level === "varies" ? -1 : WAIT_STEPS.indexOf(level);
  return (
    <span className={`meter wait-${level}`} title={title}>
      <span className="cells">
        {WAIT_STEPS.map((s, i) => (
          <span key={s} className={i <= filled ? "on" : level === "varies" ? "dash" : ""} />
        ))}
      </span>
      <span className="meter-label">{WAIT_LABEL[level]}</span>
    </span>
  );
}

const DIFF_STEPS: Difficulty[] = ["easy", "moderate", "hard", "very_hard"];

/** Four bars that fill with difficulty, like a signal indicator. */
export function DifficultyBars({ d }: { d: Difficulty }) {
  const n = DIFF_STEPS.indexOf(d);
  return (
    <span className={`bars d-${d}`} aria-hidden>
      {DIFF_STEPS.map((s, i) => (
        <span key={s} style={{ height: 5 + i * 3 }} className={i <= n ? "on" : ""} />
      ))}
    </span>
  );
}

const LANES: { key: Owner; label: string }[] = [
  { key: "agent", label: "Agent" },
  { key: "developer", label: "You" },
  { key: "provider", label: "Provider" },
];

/** Every step as a dot in the lane of whoever does it. Shared steps sit in both Agent and You. */
export function Swimlane({ g }: { g: Guide }) {
  const inLane = (o: Owner, lane: Owner) => o === lane || (o === "shared" && (lane === "agent" || lane === "developer"));
  const counts = LANES.map((l) => g.steps.filter((s) => inLane(s.owner, l.key)).length);
  return (
    <div className="swim" style={{ ["--n" as string]: g.steps.length }}>
      <div className="swim-row swim-head">
        <span />
        {g.steps.map((_, i) => (
          <span key={i} className="swim-num">
            {i + 1}
          </span>
        ))}
      </div>
      {LANES.map((lane, li) => (
        <div key={lane.key} className={`swim-row lane-${lane.key}`}>
          <span className="swim-label">
            {lane.label} <b>{counts[li]}</b>
          </span>
          {g.steps.map((s, i) => (
            <span key={s.id} className="swim-cell">
              {inLane(s.owner, lane.key) && (
                <a
                  href={`#step-${i + 1}`}
                  className={`swim-dot o-${s.owner}`}
                  title={`${i + 1}. ${s.title}${s.duration ? ` (${s.duration})` : ""}`}
                />
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Horizontal stacked bar with a legend underneath. */
export function StackBar({ parts }: { parts: { label: string; value: number; cls: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="stack">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.label} className={p.cls} style={{ width: `${(100 * p.value) / total}%` }} title={`${p.value} ${p.label}`} />
          ))}
      </div>
      <div className="stack-legend">
        {parts.map((p) => (
          <span key={p.label}>
            <i className={p.cls} /> <b>{p.value}</b> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
