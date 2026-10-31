import type { Confidence, Difficulty, Guide, Owner } from "@/lib/schema";
import { CONFIDENCE_LABEL, DIFFICULTY_LABEL } from "@/lib/markdown";
import { DifficultyBars } from "./Visuals";

export function DifficultyBadge({ d }: { d: Difficulty }) {
  return (
    <span className={`badge d-${d}`}>
      <DifficultyBars d={d} />
      {DIFFICULTY_LABEL[d]}
    </span>
  );
}

const OWNER_SHORT: Record<Owner, string> = {
  agent: "Agent",
  developer: "You",
  provider: "Provider",
  shared: "Agent + you",
};

export function OwnerBadge({ o }: { o: Owner }) {
  return <span className={`badge o-${o}`}>{OWNER_SHORT[o]}</span>;
}

export const CONFIDENCE_HINT: Record<Confidence, string> = {
  tested: "Observed directly by an agent probing the provider's live endpoints",
  documented: "Stated in an official provider source",
  reported: "Stated in a non-official source such as a forum or blog",
  inferred: "Reasoned from other evidence; no direct source",
};

/** Quiet evidence marker: a colored dot (label in the tooltip) plus citation numbers. */
export function Evidence({ g, x }: { g: Guide; x: { confidence: Confidence; sources: string[] } }) {
  const nums = x.sources.map((id) => g.sources.findIndex((s) => s.id === id) + 1).filter((n) => n > 0);
  return (
    <span className="ev" title={`${CONFIDENCE_LABEL[x.confidence]}: ${CONFIDENCE_HINT[x.confidence]}`}>
      <span className={`ev-dot c-${x.confidence}`} />
      {nums.map((n, i) => (
        <span key={n}>
          {i > 0 && ","}
          <a href={`#src-${n}`}>{n}</a>
        </span>
      ))}
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <div className="legend">
      {(Object.keys(CONFIDENCE_HINT) as Confidence[]).map((c) => (
        <span key={c} title={CONFIDENCE_HINT[c]}>
          <span className={`ev-dot c-${c}`} /> {CONFIDENCE_LABEL[c]}
        </span>
      ))}
    </div>
  );
}
