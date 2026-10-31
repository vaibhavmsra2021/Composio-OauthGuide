"use client";

import { useEffect, useState } from "react";
import type { Guide } from "@/lib/schema";
import { Evidence, OwnerBadge } from "./Badges";
import { ChevronDown, Clock, External } from "./Icons";

// Progress is a per-viewer convenience, so it lives in localStorage and the page works without it.
export function StepList({ g }: { g: Guide }) {
  const key = `oauth-guide-progress:${g.slug}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      /* storage unavailable */
    }
  }, [key]);

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const count = g.steps.filter((s) => done[s.id]).length;
  const next = g.steps.find((s) => !done[s.id]);

  return (
    <>
      <div className="progress-row">
        <span>
          {count}/{g.steps.length} done
        </span>
        <div className="progress">
          <div style={{ width: `${(100 * count) / Math.max(1, g.steps.length)}%` }} />
        </div>
        <button className="btn ghost" style={{ marginLeft: "auto", height: 28 }} onClick={() => setExpandAll((v) => !v)}>
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="steps">
        {g.steps.map((s, i) => (
          <li key={s.id} id={`step-${i + 1}`} className={`step ${s.owner}${done[s.id] ? " done" : ""}`}>
            <button
              className="step-num"
              onClick={() => toggle(s.id)}
              title={done[s.id] ? "Mark as not done" : "Mark as done"}
              aria-label={`Mark step ${i + 1} ${done[s.id] ? "not done" : "done"}`}
            >
              {done[s.id] ? "✓" : i + 1}
            </button>
            <details key={`${s.id}-${expandAll}`} open={expandAll || (s === next && count > 0)}>
              <summary>
                <span className="t">{s.title}</span>
                <OwnerBadge o={s.owner} />
                {s.duration && (
                  <span className="dur">
                    <Clock size={12} /> {s.duration}
                  </span>
                )}
                <span className="caret">
                  <ChevronDown size={15} />
                </span>
              </summary>
              <div className="detail">
                <p>
                  {s.detail}
                  <Evidence g={g} x={s} />
                </p>
                {s.fields.length > 0 && (
                  <dl className="fields">
                    {s.fields.map((f) => (
                      <div key={f.name} style={{ display: "contents" }}>
                        <dt>{f.name}</dt>
                        <dd>
                          <code>{f.value}</code>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {s.links.length > 0 && (
                  <div className="links">
                    {s.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                        {l.label} <External size={11} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </>
  );
}
