# Quainy Risk Replay

Quainy Risk Replay is a local-first AI agent release gate. It helps builders understand where their assistant or agent can fail, generate relevant safety and reliability suites, run those suites locally or in CI, and ship with clearer confidence.

The product is designed for private agent work. No repository upload, prompt upload, production data upload, or Quainy server connection should be required for the core workflow.

## Current Status

This repository currently contains the first working showcase app:

- Next.js dashboard at `/`
- local JSON-backed projects and test cases
- starter test suites for common LLM risks
- deterministic mock replay runner
- pass/fail scoring, risk score, explanation, and suggested fix
- release report page at `/report`
- public case-study page at `/case-study`

The next build track expands this into the full local-first release gate described in [PRODUCT_PLAN.md](PRODUCT_PLAN.md) and implemented step-by-step through [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md).

## Product Direction

Risk Replay should help users answer:

- What can go wrong in this agent?
- Which high-risk paths are covered by tests?
- Which risks are still untested?
- What failed in replay?
- What should be fixed before shipping?

The honest promise is risk reduction and release confidence, not absolute safety.

## Security Model

Risk Replay is offline by design.

- Core profiling, suite generation, replay execution, scoring, and reporting run locally.
- No agent code, prompts, docs, logs, test data, or secrets leave the user's machine by default.
- Existing agents are tested through local adapters such as HTTP endpoints, commands, or scripts.
- Optional BYO LLM suite expansion may come later, but it must be explicit and initiated from the user's environment.
- Quainy-hosted generation is not part of the default product path.

## Target User Flow

```bash
npm install
npm run dev
```

Future CLI flow:

```bash
quainy-risk-replay init
quainy-risk-replay generate
quainy-risk-replay run --config risk-replay.config.json
quainy-risk-replay report
```

Expected result:

- local agent profile
- generated test suite
- coverage map
- replay results
- JSON and Markdown reports
- CI-ready exit code

## Existing Agent Integration

Teams should not need to expose their repository or agent internals. Risk Replay should call the agent from the user's local environment.

Supported adapter targets in the plan:

- mock adapter for demos and learning
- local HTTP endpoint
- local command
- stdin/stdout JSON runner
- custom test script

Example config:

```json
{
  "project": "Support Refund Agent",
  "agent": {
    "purpose": "Answer customer support questions and prepare refunds",
    "dataSources": ["Zendesk tickets", "refund policy docs"],
    "tools": ["refund.create", "email.send", "ticket.close"],
    "approvalBoundaries": ["refund.create", "email.send", "ticket.close"],
    "sensitiveData": ["customer email", "private ticket notes", "API keys"],
    "requiredGrounding": ["policy answers require citations"]
  },
  "adapter": {
    "type": "http",
    "url": "http://localhost:8000/agent"
  },
  "thresholds": {
    "blockOnCritical": true,
    "minimumPassRate": 90,
    "minimumCoverage": 80
  }
}
```

## Agent Context Sources

Risk Replay should start from existing local context when available, then ask only for missing details.

Planned sources:

- `risk-replay.config.json`
- `AGENTS.md`
- `agents.md`
- `README.md`
- `docs/agent.md`
- selected prompt files
- selected tool schemas
- selected OpenAPI specs
- incident JSON files
- guided UI intake

The user should always be able to see what was detected and confirm what becomes part of the profile.

## Release Gate Categories

The release gate focuses on practical agent failure modes:

- instruction boundary and prompt injection
- grounding, evidence, and hallucination
- sensitive data protection
- tool and action safety
- human approval boundaries
- overconfidence and uncertainty
- policy and compliance
- role and access control
- reliability under bad inputs
- workflow completion quality

## Suite Generation

Suite generation should be deterministic, explainable, deduplicated, and local.

Planned pipeline:

1. Read allowlisted local context.
2. Load or infer an agent profile.
3. Build a risk surface across tools, data, users, actions, and failure modes.
4. Generate tests from local templates.
5. Add high-risk variants.
6. Deduplicate by risk signature.
7. Score coverage.
8. Warn about missing or unknown coverage.
9. Save suites locally.

Each generated test should include why it exists, what failure it detects, pass criteria, fail criteria, severity, and linked profile fields.

## Incident-To-Regression Workflow

When a team sees a production failure, they should be able to convert it into a regression suite quickly.

Future CLI:

```bash
quainy-risk-replay add-incident incident.json
quainy-risk-replay generate --from-incident
quainy-risk-replay run
```

One incident should produce:

- exact regression test
- nearby variants
- linked risk category
- updated coverage map
- report entry

## GitHub Actions

Risk Replay should be usable as a CI release gate.

Future workflow:

```yaml
name: AI Release Gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  risk-replay:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Start local agent
        run: npm run agent:test-server &

      - name: Run release gate
        run: npx quainy-risk-replay run --config risk-replay.config.json

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: risk-replay-report
          path: risk-replay/reports/*
```

The CLI should exit non-zero when critical failures or required coverage gaps block release.

## Current App Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If that port is busy, Next.js will print the active port.

Useful checks:

```bash
npm run typecheck
npm run build
npm audit --omit=dev
```

## Current Tech Stack

- Next.js
- TypeScript
- local JSON storage in `data/projects.json`
- deterministic mock replay adapter in `lib/mockRunner.ts`
- plain CSS using Quainy brand tokens

## Current Pages

- `/` is the working dashboard.
- `/report` summarizes latest replay results.
- `/case-study` explains the product problem and architecture.

## Product Screenshots

![Dashboard](public/screenshots/dashboard.png)

![Report page](public/screenshots/report.png)

![Case study](public/screenshots/case-study.png)

## Current Starter Test Suites

The current starter dataset covers:

- prompt injection
- hallucination/confabulation
- missing source grounding
- sensitive information disclosure
- excessive agency/tool misuse
- overconfident wrong answer

The reusable sample dataset lives at `data/sample-test-suite.json`. The seeded demo project lives in `data/projects.json`.

## Project References

- [PRODUCT_PLAN.md](PRODUCT_PLAN.md): product direction, requirements, risk categories, security model, and architecture.
- [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md): ordered implementation and testing checklist.
- [QUAINY_CONTEXT.md](QUAINY_CONTEXT.md): Quainy voice, mission, design, and product principles.

## Quainy Labs Framing

Quainy Risk Replay is a builder-focused lab product. It helps AI builders reason from first principles about reliability, own their release process, and turn failures into durable regression tests.
