# Quainy Risk Replay

Quainy Risk Replay is a local-first release gate for AI assistants, agents, and workflows. It helps builders find risky behavior before shipping: prompt injection, hallucination, missing source grounding, sensitive data leakage, excessive tool use, weak approval boundaries, overconfidence, and unsafe workflow completion.

The core workflow runs locally. No repository upload, prompt upload, production data upload, or Quainy server connection is required.

## What You Are Using

Risk Replay has two surfaces:

- Installed CLI: the real integration path for your own AI project. Install it once, then run `quainy-risk-replay init`, `generate`, and `run` from the root of the project that contains your agent docs, prompts, adapter, or local agent server.
- Showcase app in this repository: a Quainy Labs demo and development UI. It reads the files inside this repository checkout. It does not independently know the inner details of another private project after a CLI install.

If a builder only runs the installer, they get the CLI, not the showcase web app. To use the web dashboard against a project today, the dashboard must be running from a checkout that has access to that project’s local files. The intended product path for external projects is the CLI and generated local artifacts.

## Why This Exists

Many AI apps pass a few demos and still fail in production. Risk Replay gives builders a repeatable way to ask:

- What can go wrong in this agent?
- Which high-risk paths are covered by tests?
- Which risks are still untested?
- What failed in replay?
- What should be fixed before release?

The honest promise is risk reduction and release confidence, not absolute safety.

## Install The CLI

The package is not published to the npm registry yet. For the first public path, install the CLI from the GitHub repo.

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/quainy-labs/quainy-risk-replay/main/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/quainy-labs/quainy-risk-replay/main/install.ps1 | iex
```

The installer checks for Node.js 22 or newer and installs the CLI globally from `github:quainy-labs/quainy-risk-replay`.

Dry run without installing:

```bash
curl -fsSL https://raw.githubusercontent.com/quainy-labs/quainy-risk-replay/main/install.sh | QRR_DRY_RUN=1 sh
```

Pin a branch, tag, or commit:

```bash
curl -fsSL https://raw.githubusercontent.com/quainy-labs/quainy-risk-replay/main/install.sh | QRR_REF=v0.1.0 sh
```

## Setup In Your AI Project

Run these commands from the project that owns your chatbot, assistant, or agent behavior. Risk Replay should be installed as a tool; do not copy this whole repository into your app.

### 1. Initialize Local Release-Gate Files

```bash
quainy-risk-replay init
```

This creates:

```text
risk-replay.config.json
risk-replay/tests/
risk-replay/incidents/
risk-replay/reports/
```

Use `risk-replay.config.json` to describe your agent purpose, users, tools, data sources, approval boundaries, sensitive data, unsupported topics, grounding rules, and local adapter.

### 2. Review The Detected Agent Profile

```bash
quainy-risk-replay profile
```

This shows what Risk Replay understood from your config and allowlisted local context. Review this before generating tests so the suite is tied to the real system instead of vague assumptions.

### 3. Generate A Risk Suite

```bash
quainy-risk-replay generate
```

This builds a local risk surface and writes deterministic tests to:

```text
risk-replay/tests/generated-suite.json
```

Each generated test explains why it exists, what it detects, its severity, and which profile fields it came from. If versioning is enabled, Risk Replay also writes `risk-replay/tests/versions/suite-<timestamp>-<hash>.json`.

### 4. Run The Release Gate

```bash
quainy-risk-replay run
```

This executes the suite against your configured local adapter and writes:

```text
risk-replay/reports/latest.json
risk-replay/reports/latest.md
```

The command exits non-zero when the release gate says `Do not ship yet`, so it can block unsafe CI releases. Every run report includes the suite ID, suite hash, and suite artifact path used for that run. If versioning is enabled, Risk Replay also writes timestamped copies under `risk-replay/reports/runs/`.

### 5. Read The Latest Report

```bash
quainy-risk-replay report
```

The report has suite-level and test-level detail:

- Suite level: total tests, pass rate, reliability score, risk coverage score, release confidence, readiness status, failed categories, missing coverage, context audit summary, and recommendations.
- Test level: test ID, status, category, severity, risk score, release-blocking flag, explanation, suggested fix, evidence snippet, and raw adapter response in JSON.

Versioning is off by default. To keep suite and run history, set `"versioning": { "enabled": true }` in `risk-replay.config.json`.

## Integration Options

Risk Replay can test agents written in any language. The tool currently runs on Node.js, but the chatbot under test can be Python, Go, Java, Ruby, Rust, or anything else.

Supported adapters:

- `mock`: built-in deterministic demo adapter.
- `http`: call a local chatbot or agent API.
- `command`: run a local command that reads JSON from stdin and writes JSON to stdout.
- `script`: run a local Node script without shell parsing.

For the exact adapter request/response JSON keys, config examples, and deeper setup details, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

For a detailed explanation of report fields, sample Markdown/JSON output, and how to interpret repeated runs, see [Read The Report](docs/USER_GUIDE.md#9-read-the-report).

## Current Showcase App

This repository also contains the Quainy Labs showcase UI:

- dashboard at `/`
- release report page at `/report`
- public case-study page at `/case-study`
- local JSON-backed demo projects and test cases
- local release-gate controls for initialize, generate, run, and incident intake

Run the repo locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If that port is busy, Next.js will print the active port.

Important: this dashboard is repo-local. It shows and operates on the repository where `npm run dev` is running. The installer does not deploy this dashboard into another project, and the dashboard cannot inspect another private repo unless you intentionally run the app from a checkout that has those files available. For normal external usage, run the CLI inside the target AI project and inspect `risk-replay/tests/generated-suite.json` plus `risk-replay/reports/latest.*`.

The intended user-facing UI should become a local project studio, similar in spirit to Swagger UI for FastAPI apps: a command such as `quainy-risk-replay studio` would run from the user's AI project root, open a localhost dashboard, and use that project's config, context, suites, incidents, adapters, and reports. That is tracked as a planned phase; the current app is the showcase and development surface.

Useful development checks:

```bash
npm run typecheck
npm run build
npm test
npm pack --dry-run
npm audit --omit=dev
```

## Sample Local Agent

A runnable demo agent lives in `examples/sample-agent`.

```bash
npm run risk-replay -- generate --config examples/sample-agent/risk-replay.command.config.json
npm run risk-replay -- run --config examples/sample-agent/risk-replay.command.config.json
```

The default sample is intentionally unsafe, so the gate should block release. The safer mode should pass:

```bash
SAMPLE_AGENT_SAFE=1 npm run risk-replay -- run --config examples/sample-agent/risk-replay.command.config.json
```

## Project Docs

- [docs/USER_GUIDE.md](docs/USER_GUIDE.md): install, workflow, config, adapters, incidents, CI, and sample agent guide.
- [PRODUCT_PLAN.md](PRODUCT_PLAN.md): product direction, requirements, risk categories, security model, and architecture.
- [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md): ordered implementation and testing checklist.
- [QUAINY_CONTEXT.md](QUAINY_CONTEXT.md): Quainy voice, mission, design, and product principles.

## Current Tech Stack

- Next.js
- TypeScript
- local JSON storage
- deterministic local release-gate engine
- CLI entrypoint at `cli/index.mjs`
- Node built-in tests
