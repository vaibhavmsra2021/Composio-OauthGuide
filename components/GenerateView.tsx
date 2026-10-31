"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent";
import { Alert, Book, Check, Globe, Info, Radar, Search, Sparkles } from "./Icons";

type Event = AgentEvent | { type: "saved"; slug: string };
type Phase = "idle" | "running" | "matched" | "saved" | "failed";
type Line = { kind: string; text: string; t: number };

// Stages shown above the log; each event moves the run to at least its stage.
const STAGES = ["Research docs", "Probe endpoints", "Write and check", "Save"] as const;
const STAGE_OF: Partial<Record<Event["type"], number>> = { search: 0, fetch: 0, probe: 1, rejected: 2, done: 2, saved: 3 };

function describe(e: Event): { kind: string; text: string } | undefined {
  switch (e.type) {
    case "status":
      return { kind: "status", text: e.text };
    case "note":
      return { kind: "agent", text: e.text };
    case "search":
      return { kind: "search", text: e.query };
    case "fetch":
      return { kind: "fetch", text: e.url };
    case "probe": {
      const r = e.result;
      const outcome = r.error
        ? `failed: ${r.error}`
        : [r.status && `HTTP ${r.status}`, r.location && `-> ${r.location.slice(0, 160)}`, r.title, r.data && "metadata found"]
            .filter(Boolean)
            .join(" · ");
      return { kind: "probe", text: `${r.kind} ${r.url.split("?")[0]}: ${outcome}` };
    }
    case "rejected":
      return { kind: "rejected", text: `Evidence check sent the draft back: ${e.issues.slice(0, 4).join("; ")}${e.issues.length > 4 ? ` (+${e.issues.length - 4} more)` : ""}` };
    case "done":
      return { kind: "status", text: `Guide passed schema and evidence checks (${e.guide.sources.length} sources, ${e.guide.checks.length} checks)` };
    case "saved":
      return { kind: "status", text: "Saved to the library" };
    case "error":
      return { kind: "error", text: e.text };
  }
}

const ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  status: Check,
  agent: Sparkles,
  search: Search,
  fetch: Book,
  probe: Radar,
  rejected: Alert,
  error: Alert,
};

export function GenerateView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(-1);
  const [log, setLog] = useState<Line[]>([]);
  const [slug, setSlug] = useState("");
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);
  const ran = useRef(false);
  const logEnd = useRef<HTMLDivElement>(null);

  const run = useCallback(async (q: string, force = false) => {
    setPhase("running");
    setStage(0);
    setLog([]);
    const t0 = Date.now();
    setStarted(t0);
    const push = (kind: string, text: string) => setLog((l) => [...l, { kind, text, t: Date.now() - t0 }]);
    let res: Response;
    try {
      res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, force }),
      });
    } catch {
      push("error", "Could not reach the server.");
      return setPhase("failed");
    }
    if (res.headers.get("content-type")?.includes("application/json")) {
      const j = (await res.json()) as { match?: string; error?: string };
      if (j.match) {
        setSlug(j.match);
        return setPhase("matched");
      }
      push("error", j.error ?? `Request failed (${res.status})`);
      return setPhase("failed");
    }
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let savedSlug = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const e = JSON.parse(line) as Event;
        const d = describe(e);
        if (d) push(d.kind, d.text);
        const s = STAGE_OF[e.type];
        if (s !== undefined) setStage((cur) => Math.max(cur, s));
        if (e.type === "saved") savedSlug = e.slug;
      }
    }
    if (savedSlug) {
      setSlug(savedSlug);
      setStage(STAGES.length);
      setPhase("saved");
    } else setPhase("failed");
  }, []);

  useEffect(() => {
    if (initial && !ran.current) {
      ran.current = true;
      run(initial);
    }
  }, [initial, run]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [log.length]);

  const elapsed = phase === "running" && now > started ? Math.round((now - started) / 1000) : 0;
  const counts = log.reduce<Record<string, number>>((m, l) => ({ ...m, [l.kind]: (m[l.kind] ?? 0) + 1 }), {});

  return (
    <main className="page">
      <section className="gen">
        <div className="eyebrow">Live generation</div>
        <h1>Generate a guide</h1>
        <p>An agent reads the provider&apos;s docs, probes its live OAuth endpoints, and writes a guide you can share.</p>

        <form
          className="searchbox"
          onSubmit={(e) => {
            e.preventDefault();
            if (!query.trim() || phase === "running") return;
            router.replace(`/generate?q=${encodeURIComponent(query.trim())}`);
            run(query.trim());
          }}
        >
          <div className="field">
            <Globe />
            <input
              aria-label="App name or website"
              placeholder="App name or website, e.g. Airtable or figma.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={!initial}
            />
          </div>
          <button className="btn primary" disabled={!query.trim() || phase === "running"}>
            {phase === "running" ? (
              <>
                <span className="spinner" /> Researching
              </>
            ) : (
              <>
                <Sparkles size={15} /> Generate
              </>
            )}
          </button>
        </form>
        {phase === "idle" && <div className="hint">Takes 2 to 5 minutes. You can watch every step the agent takes.</div>}

        {phase === "matched" && (
          <div className="result">
            <Info size={18} />
            <div className="grow">
              <strong>Already in the library.</strong>
              <div className="muted small">A reviewed guide exists for this app.</div>
            </div>
            <button className="btn" onClick={() => run(query.trim(), true)}>
              Research again
            </button>
            <Link className="btn primary" href={`/guides/${slug}`}>
              Open guide
            </Link>
          </div>
        )}

        {(phase === "running" || log.length > 0) && (
          <>
            <div className="phases">
              {STAGES.map((label, i) => (
                <div
                  key={label}
                  className={`phase${i < stage || phase === "saved" ? " done" : i === stage && phase === "running" ? " active" : ""}`}
                >
                  <div className="bar">
                    <div />
                  </div>
                  {label}
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-head">
                {phase === "running" && <span className="spinner" />}
                <span className="grow">
                  {phase === "running"
                    ? `Working · ${elapsed}s`
                    : phase === "saved"
                      ? "Finished"
                      : phase === "failed"
                        ? "Stopped"
                        : ""}
                </span>
                <span className="muted small">
                  {counts.search ?? 0} searches · {counts.fetch ?? 0} pages · {counts.probe ?? 0} probes
                </span>
              </div>
              <div className="log">
                {log.map((l, i) => {
                  const Icon = ICON[l.kind] ?? Info;
                  return (
                    <div key={i} className={`log-item ${l.kind}`}>
                      <span className="ico">
                        <Icon size={14} />
                      </span>
                      <span className="txt">{l.text}</span>
                      <span className="t">{Math.round(l.t / 1000)}s</span>
                    </div>
                  );
                })}
                <div ref={logEnd} />
              </div>
            </div>
          </>
        )}

        {phase === "saved" && (
          <div className="result" style={{ borderColor: "var(--easy)" }}>
            <span style={{ color: "var(--easy)" }}>
              <Check size={18} />
            </span>
            <div className="grow">
              <strong>Guide ready</strong>
              <div className="muted small">Saved to the library and ready to share.</div>
            </div>
            <Link className="btn primary" href={`/guides/${slug}`}>
              Open guide
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
