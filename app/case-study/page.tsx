import { AlertTriangle, BrainCircuit, GitBranch, ShieldCheck } from "lucide-react";

const examples = [
  {
    title: "Prompt injection",
    before: "The assistant follows an instruction hidden inside retrieved customer text.",
    after: "The assistant treats retrieved text as evidence, not authority."
  },
  {
    title: "Weak grounding",
    before: "The assistant answers a compliance question with no citations.",
    after: "The assistant separates cited facts from unresolved questions."
  },
  {
    title: "Tool misuse",
    before: "The agent claims it issued a refund without approval.",
    after: "The agent drafts the action plan and waits for a human gate."
  }
];

export default function CaseStudyPage() {
  return (
    <main className="page case-page">
      <section className="case-hero">
        <div>
          <p className="eyebrow">Public lab case study</p>
          <h1>Make AI workflow failures visible before users discover them.</h1>
          <p className="lede">
            Quainy Risk Replay turns brittle AI demos into reproducible safety tests.
            Builders define the risky situation, replay it against a mock assistant,
            inspect the failure, and keep the case as a regression test.
          </p>
        </div>
        <div className="system-map" aria-label="Architecture map">
          <span>Test case</span>
          <GitBranch size={22} />
          <span>Replay adapter</span>
          <BrainCircuit size={22} />
          <span>Scoring</span>
          <ShieldCheck size={22} />
          <span>Release report</span>
        </div>
      </section>

      <section className="case-grid">
        <article>
          <p className="eyebrow">Problem</p>
          <h2>Successful demos hide production failure modes.</h2>
          <p>
            AI builders often test the happy path: one helpful prompt, one clean
            retrieval result, one answer that sounds right. Real users bring messy
            context, adversarial instructions, missing evidence, private data, and
            ambiguous tool boundaries.
          </p>
        </article>
        <article>
          <p className="eyebrow">Architecture</p>
          <h2>A small replay loop with replaceable execution.</h2>
          <p>
            The v1 app stores projects and test cases in local JSON. The runner
            calls a deterministic mock adapter today, then returns pass/fail,
            risk score, explanation, and suggested fix. A real LLM adapter can
            replace the mock without changing the test format.
          </p>
        </article>
      </section>

      <section className="failure-table">
        <div>
          <p className="eyebrow">Failure examples</p>
          <h2>Before and after reliability</h2>
        </div>
        <div className="example-list">
          {examples.map((example) => (
            <article key={example.title} className="example-card">
              <div className="example-title">
                <AlertTriangle size={18} />
                <h3>{example.title}</h3>
              </div>
              <p><strong>Before:</strong> {example.before}</p>
              <p><strong>After:</strong> {example.after}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="builder-learns">
        <p className="eyebrow">What a builder learns</p>
        <h2>Risk testing is engineering judgment made concrete.</h2>
        <p>
          A builder learns to name the failure mode, isolate the unsafe behavior,
          define the expected boundary, replay the case, and turn each fix into
          a durable regression test. The goal is not fear. The goal is ownership.
        </p>
      </section>
    </main>
  );
}
