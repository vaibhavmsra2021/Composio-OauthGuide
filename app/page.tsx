import { Chevron, Flask, Globe, Hourglass, Wrench } from "@/components/Icons";
import { Library, type GuideRow } from "@/components/Library";
import { glanceOf } from "@/lib/glance";
import { listGuides } from "@/lib/store";

export const dynamic = "force-dynamic";

const ORDER = { easy: 0, moderate: 1, hard: 2, very_hard: 3 } as const;

export default async function Home() {
  const guides = (await listGuides()).sort(
    (a, b) => ORDER[a.verdict.difficulty] - ORDER[b.verdict.difficulty] || a.name.localeCompare(b.name),
  );
  const rows: GuideRow[] = guides.map((g) => ({
    slug: g.slug,
    name: g.name,
    provider: g.provider,
    website: g.website,
    category: g.category,
    difficulty: g.verdict.difficulty,
    glance: glanceOf(g),
    testBeforeApproval: g.effort.testBeforeApproval,
    origin: g.meta.origin,
  }));

  return (
    <main className="page">
      <section className="home-head">
        <div className="eyebrow">OAuth app setup guides</div>
        <h1>Know what it takes to launch an OAuth app, before you start.</h1>
        <p>Setup time, provider wait, and blockers for each app.</p>
      </section>

      <Library guides={rows} />

      <section className="path" aria-label="Typical path to launch">
        <div className="node">
          <div className="ic">
            <Wrench size={18} />
          </div>
          <b>Register</b>
          <span>minutes</span>
        </div>
        <span className="arrow">
          <Chevron size={18} />
        </span>
        <div className="node">
          <div className="ic">
            <Flask size={18} />
          </div>
          <b>Test</b>
          <span>you + test users</span>
        </div>
        <span className="arrow">
          <Chevron size={18} />
        </span>
        <div className="node wait">
          <div className="ic">
            <Hourglass size={18} />
          </div>
          <b>Review</b>
          <span>where the wait is</span>
        </div>
        <span className="arrow">
          <Chevron size={18} />
        </span>
        <div className="node live">
          <div className="ic">
            <Globe size={18} />
          </div>
          <b>Live</b>
          <span>all users</span>
        </div>
      </section>
    </main>
  );
}
