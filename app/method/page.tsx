import type { Confidence } from "@/lib/schema";
import { CONFIDENCE_HINT } from "@/components/Badges";
import { CONFIDENCE_LABEL } from "@/lib/markdown";

export const metadata = { title: "How guides are verified" };

export default function Method() {
  return (
    <main className="page">
      <section className="prose">
        <div className="eyebrow">Method</div>
        <h1>How guides are verified</h1>
        <p>Every claim carries an evidence level and cites its sources. Each guide ends with a verification log.</p>

        <h2>Evidence levels</h2>
        <div className="levels">
          {(Object.keys(CONFIDENCE_HINT) as Confidence[]).map((c) => (
            <div key={c}>
              <b>
                <span className={`ev-dot c-${c}`} /> {CONFIDENCE_LABEL[c]}
              </b>
              <span>{CONFIDENCE_HINT[c]}</span>
            </div>
          ))}
        </div>

        <h2>What the agents do</h2>
        <div className="cards">
          <div>
            <h3>Read official docs</h3>
            <p>
              App registration, OAuth, scope, and review pages. Forums and blogs only fill gaps such as real review
              timelines, and are labeled Reported.
            </p>
          </div>
          <div>
            <h3>Probe live endpoints</h3>
            <p>
              Fetch OpenID discovery, send an authorization request with an invalid client ID, check the developer
              console. Only these earn a Tested label.
            </p>
          </div>
          <div>
            <h3>Log corrections</h3>
            <p>
              Each check is confirmed, corrected, contradicted, or unverified. Anything unconfirmed is listed as still
              uncertain.
            </p>
          </div>
          <div>
            <h3>Pass a server-side gate</h3>
            <p>
              Live guides are rejected if they cite a URL the agent never read, claim Tested without a probe, or fail the
              schema.
            </p>
          </div>
        </div>

        <h2>What agents do not do</h2>
        <p className="muted">
          Log in, create provider accounts, accept terms, verify domains, or submit review forms. Those need your
          identity, so guides mark them as yours.
        </p>

        <h2>Known limits</h2>
        <ul>
          <li>Review timelines are rarely published. Check the label and source on any range.</li>
          <li>Provider policies change. Each guide shows the date it was researched.</li>
          <li>A cited source means the agent read it, not that the claim is quoted verbatim.</li>
        </ul>
      </section>
    </main>
  );
}
