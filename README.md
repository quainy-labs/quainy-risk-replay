# Quainy Risk Replay

Quainy Risk Replay is a local-first AI agent release gate. It helps builders understand where their assistant or agent can fail, generate relevant safety and reliability suites, run those suites locally or in CI, and ship with clearer confidence.

The product is designed for private agent work. No repository upload, prompt upload, production data upload, or Quainy server connection should be required for the core workflow.

## Current Status

This repository currently contains the first working showcase app:

- Next.js dashboard at `/`
- local JSON-backed projects and test cases
- starter test suites for common LLM risks
- explicit local risk surface map for agent-specific tools, data, users, approvals, and sensitive data
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

Local CLI flow:

```bash
npm run risk-replay -- init
npm run risk-replay -- profile
npm run risk-replay -- generate
npm run risk-replay -- run
npm run risk-replay -- report
```

Expected result:

- local agent profile
- risk surface map
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
- local Node script
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

Risk Replay starts from existing local context when available, then uses explicit config as the source of truth. It then builds a risk surface before generating tests, so every suite item can be traced back to a specific tool, data source, approval boundary, sensitive data type, user role, unsupported topic, or general workflow failure mode.

Current local discovery sources:

- `risk-replay.config.json`
- `AGENTS.md`
- `agents.md`
- `README.md`
- `docs/agent.md`
- `prompts/*.md`, `prompts/*.txt`, `prompts/*.prompt`, `prompts/*.prompt.md`
- `prompt/*.md`, `prompt/*.txt`
- `tool-schemas/*.json`, `tool-schemas/*.schema.json`
- `tools/*.schema.json`, `schemas/tools/*.json`
- `openapi.json`, `openapi.yaml`, `openapi.yml`
- `docs/openapi.json`, `docs/openapi.yaml`, `docs/openapi.yml`

The config supports allowlisted include/exclude paths. Discovery skips obvious private/build locations such as `.env`, `.git`, `.next`, `node_modules`, `secrets`, `customer-data`, and `logs`.

Every profile/generation/run writes a local audit file:

```text
risk-replay/reports/context-audit.json
```

The audit records each file path, source type, byte size, and read/skip/exclude decision. Incident JSON files and guided UI intake remain later workflow additions.

The user should always be able to see what was detected and confirm what becomes part of the profile.

## Profile Review

The profile command shows where each profile field came from:

- `explicit`: provided in `risk-replay.config.json`
- `inferred`: detected from allowlisted local context
- `mixed`: explicit config plus inferred additions
- `unknown`: missing from config and not detected locally

Missing high-value fields such as tools, data sources, approval boundaries, sensitive data, target users, and grounding requirements produce profile warnings with suggested fixes.

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
6. Cap high-risk variants per risk surface item.
7. Deduplicate by risk signature.
8. Score coverage.
9. Warn about missing or unknown coverage.
10. Save suites locally.

Each generated test includes why it exists, what failure it detects, pass criteria, fail criteria, severity, linked profile fields, and `variantOf` when it is a harder variant of a risk-surface item.

## Risk Surface Mapping

The local gate now builds a structured risk surface before scoring coverage. Each item includes:

- category
- dimension
- name
- severity
- reason
- linked profile fields
- expected coverage
- stable risk signature

Reports include the risk surface alongside generated coverage, so users can see both the risks Risk Replay found and whether generated tests directly map to those risks.

## Incident-To-Regression Workflow

When a team sees a production failure, they should be able to convert it into a regression suite quickly.

Current CLI:

```bash
npm run risk-replay -- add-incident incident.json
npm run risk-replay -- generate --from-incident
npm run risk-replay -- run
```

One incident should produce:

- exact regression test
- nearby variants
- linked risk category
- updated coverage map
- report entry

Tool/action incidents also produce approval-boundary variants. Prompt-injection incidents produce instruction-boundary variants. Coverage includes a linked `incident-regression` item for each incident title, so teams can see which production failures are protected by replay.

## GitHub Actions

Risk Replay should be usable as a CI release gate.

Generate a workflow:

```bash
npm run risk-replay -- github-actions
```

Or during setup:

```bash
npm run risk-replay -- init --github-actions
```

Current generated workflow:

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

The CLI exits non-zero when the release gate says `Do not ship yet`.

The release gate also blocks when critical coverage is missing, even if the tests that did run passed. Approval boundaries, sensitive-data paths, and high-severity tool/action paths are treated as release-blocking coverage dimensions.

## Sample Local Agent

This repo includes a local demo agent in `examples/sample-agent`.

Run the command adapter demo:

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.command.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.command.config.json
```

Run the HTTP adapter demo:

```bash
npm run sample:http-agent
```

Then in another terminal:

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.http.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.http.config.json
```

The default sample agent is intentionally unsafe, so the release gate should block shipping.

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
npm test
npm audit --omit=dev
```

## Current CLI Setup

Initialize a local Risk Replay workspace in any agent repo:

```bash
npm run risk-replay -- init
```

This creates:

```text
risk-replay.config.json
risk-replay/tests/
risk-replay/incidents/
risk-replay/reports/
```

Generate a deterministic local suite:

```bash
npm run risk-replay -- generate
```

Control hard variant depth:

```bash
npm run risk-replay -- generate --max-variants 0
npm run risk-replay -- generate --max-variants 2
```

Risk Replay reads allowlisted local context, merges inferred fields with explicit config, builds a structured risk surface, deduplicates tests by risk signature, and writes the generated suite to:

```text
risk-replay/tests/generated-suite.json
```

Coverage currently includes categories, tools, data sources, sensitive data, approval boundaries, target users, high-severity paths, unsupported topics, risk-surface mapping, and incident regressions when incidents are present.

Run the release gate:

```bash
npm run risk-replay -- run
```

Reports are written to:

```text
risk-replay/reports/latest.json
risk-replay/reports/latest.md
```

The checked-in example config lives at `risk-replay.config.example.json`.
Sample adapter configs live under `examples/sample-agent`.

The script adapter runs a local Node script directly without shell parsing:

```json
{
  "adapter": {
    "type": "script",
    "path": "examples/sample-agent/command-agent.mjs"
  }
}
```

## Current Tech Stack

- Next.js
- TypeScript
- local JSON storage in `data/projects.json`
- deterministic mock replay adapter in `lib/mockRunner.ts`
- local-first release gate engine in `lib/localGate.ts`
- CLI entrypoint in `cli/index.mjs`
- Node built-in tests in `tests/localGate.test.mjs`
- sample local agents in `examples/sample-agent`
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
