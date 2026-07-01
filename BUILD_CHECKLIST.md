# Quainy Risk Replay Build Checklist

This checklist turns the product plan into an ordered implementation path. Use it to keep the project focused, testable, scalable, and aligned with the user problem.

Every phase should be independently useful. Do not move to a later phase by weakening the local-first security model or by adding features that bypass the core user workflow.

## Guiding Rules

- Build for the user's shipping workflow before building impressive demos.
- Keep all core behavior local and private by default.
- Prefer deterministic, explainable logic before optional LLM assistance.
- Avoid blank-page user experiences.
- Make generated suites traceable to the agent profile.
- Make every release decision explainable.
- Do not claim complete safety. Show coverage, gaps, failures, and residual risk.
- Keep modules small, typed, and testable.
- Treat CLI, UI, and CI as different surfaces over the same core engine.

## Architecture Principles

- Core domain logic belongs in shared modules, not inside React components.
- UI should call stable application services or API routes.
- CLI should reuse the same generation, replay, scoring, and reporting modules as the UI.
- Adapters should be replaceable behind a narrow contract.
- Reports should be generated from structured run data, not scraped UI state.
- Storage should start local and simple, but keep boundaries clear enough to support SQLite later.
- Tests should cover pure logic first, then adapters, then full flows.

## Target Module Shape

```text
lib/
  domain/
    profile.ts
    risks.ts
    tests.ts
    incidents.ts
    coverage.ts
    results.ts
  generation/
    context-reader.ts
    profile-extractor.ts
    suite-generator.ts
    dedupe.ts
    templates/
  adapters/
    mock.ts
    http.ts
    command.ts
  evaluation/
    local-evaluators.ts
    scoring.ts
  reporting/
    json-report.ts
    markdown-report.ts
    readiness.ts
  storage/
    workspace.ts
cli/
  index.ts
app/
  ...
risk-replay/
  tests/
  incidents/
  reports/
```

The exact folders can change, but the separation should remain.

## Phase Status Tracker

| Phase | Status | Notes |
|---|---|---|
| 0. Align current showcase | Complete | README, plan, checklist, dashboard, typecheck, and build are in place. |
| 1. Domain model foundation | Complete | Shared local gate models, threshold model, risk surface model, and dashboard-test adapter are in place. |
| 2. Local config support | Complete | Config load/create/validate, schema errors, thresholds, report formats, and tests are in place. |
| 3. Conservative context discovery | In progress | Safe local discovery and audit exist; prompt/tool/OpenAPI source support remains. |
| 4. Agent profile extraction | In progress | Deterministic inference exists; UI review and richer missing-field handling remain. |
| 5. Risk surface builder | Complete | Explicit risk surface object, report output, CLI summary, mapped coverage, and tests are in place for the current local gate. |
| 6. Deterministic suite generator | In progress | All planned categories generate tests; more templates and variant caps needed. |
| 7. Deduplication and variant control | In progress | Stable signatures and dedupe exist; variant caps need expansion. |
| 8. Coverage scoring | Complete | Category, profile-field, high-severity, risk-surface, unknown, and incident coverage are implemented and tested. |
| 9. Incident-to-regression | In progress | CLI template/import and exact/variant tests exist; UI and richer categorization remain. |
| 10. Replay adapters | In progress | Mock, local HTTP, and command exist; script adapter and stronger adapter tests remain. |
| 11. Local evaluators | In progress | Initial deterministic checks exist; more category-specific evaluators remain. |
| 12. Reports | In progress | JSON/Markdown reports and critical coverage gates exist; UI report and audit summary integration remain. |
| 13. CLI | In progress | Core commands exist and smoke-test locally; packaged distribution remains. |
| 14. GitHub Actions | In progress | CLI workflow generation exists; published package/npx variant still needed. |
| 15. UI upgrade | Not started | UI still uses earlier mock dashboard model. |
| 16. Sample local agent | In progress | Command and HTTP demo agents exist; fixed passing report fixture still needed. |
| 17. Documentation polish | In progress | README and plan are updated; full CLI/config/adapter guides remain. |
| 18. Quality gate | Complete | `npm test`, `typecheck`, `build`, `audit`, and relevant CLI profile/generate smoke pass for current slice. |

## Phase 0: Align Current Showcase With Product Direction

- [x] Update README to clearly describe local-first release gate direction.
- [x] Keep current dashboard usable.
- [x] Link `PRODUCT_PLAN.md` and this checklist from README.
- [x] Make sure current mock replay still runs.
- [x] Make sure `npm run typecheck` passes.
- [x] Make sure `npm run build` passes.

Acceptance:

- [x] A new visitor understands the current app and the planned full product.
- [x] The repo has one plan file and one build checklist file.

## Phase 1: Domain Model Foundation

Add typed models for:

- [x] `AgentProfile`
- [x] `AgentTool`
- [x] `DataSource`
- [x] `SensitiveDataType`
- [x] `ApprovalBoundary`
- [x] `RiskCategory`
- [x] `RiskSurfaceItem`
- [x] `GeneratedTestCase`
- [x] `Incident`
- [x] `CoverageReport`
- [x] `ReplayAdapterConfig`
- [x] `ReplayResult`
- [x] `ReleaseReport`

Tests:

- [x] Type-level compile coverage through `npm run typecheck`.
- [x] Unit tests for profile validation.
- [x] Unit tests for default thresholds and readiness inputs.

Acceptance:

- [x] Existing dashboard still works.
- [x] Old test case model is either migrated or cleanly adapted.

Current progress:

- [x] Added first local release gate types and engine in `lib/localGate.ts`.
- [x] Added CLI-accessible config, suite, coverage, replay result, and report models.
- [x] Added explicit `RiskSurfaceItem` model for traceable local risk mapping.
- [x] Added `DataSource`, `SensitiveDataType`, `ApprovalBoundary`, and threshold domain types.
- [x] Added `adaptDashboardTestCase` so the original showcase test model has an explicit path into the local gate.

## Phase 2: Local Config Support

Implement `risk-replay.config.json`.

Required:

- [x] Load config from repo root.
- [x] Validate required fields.
- [x] Support context include/exclude paths.
- [x] Support agent profile fields.
- [x] Support adapter config.
- [x] Support thresholds.
- [x] Support report formats.
- [x] Produce useful errors for missing fields.

Tests:

- [x] Valid config loads.
- [x] Missing required fields produce actionable errors.
- [x] Excluded paths are not read.
- [x] Unknown adapter type fails clearly.

Acceptance:

- [x] A user can define an agent profile without using the UI.

Current progress:

- [x] Added `risk-replay.config.example.json`.
- [x] Added `risk-replay.config.json` creation through `quainy-risk-replay init`.
- [x] Added local config loading and validation in `lib/localGate.ts`.
- [x] Added validation for missing profile arrays, missing tool names, invalid tool severity, invalid adapter settings, and invalid threshold percentages.
- [x] Added `resolveThresholds` for default and configured release gate thresholds.

## Phase 3: Conservative Context Discovery

Implement local context discovery.

Sources:

- [x] `AGENTS.md`
- [x] `agents.md`
- [x] `README.md`
- [x] `docs/agent.md`
- [ ] allowlisted prompt files
- [ ] allowlisted tool schemas
- [ ] allowlisted OpenAPI specs

Rules:

- [x] Never read `.env`.
- [x] Never read excluded paths.
- [x] Never read broad customer-data folders by default.
- [x] Record every file read in an audit log.
- [x] Show missing profile fields.

Tests:

- [x] Include patterns work.
- [x] Exclude patterns override include patterns.
- [x] Secret-looking files are skipped.
- [x] Audit log lists files read.

Acceptance:

- [x] The product can find useful local context without feeling invasive.

Current progress:

- [x] Added conservative local discovery for `AGENTS.md`, `agents.md`, `README.md`, `docs/agent.md`, and configured include paths.
- [x] Added hard skips for `.env`, `.git`, `.next`, `node_modules`, `secrets`, `customer-data`, and `logs`.
- [x] Added context audit output under `risk-replay/reports/context-audit.json`.
- [x] Added duplicate realpath detection for case-insensitive filesystems.

## Phase 4: Agent Profile Extraction

Implement deterministic extraction from config and simple docs.

Extract:

- [x] purpose
- [x] target users
- [x] data sources
- [x] tools/actions
- [x] approval boundaries
- [x] sensitive data
- [x] unsupported topics
- [x] grounding requirements
- [x] escalation/refusal rules

Rules:

- [x] Prefer explicit config over inferred docs.
- [ ] Mark inferred fields as inferred.
- [x] Mark missing fields as unknown.
- [x] Never invent certainty from vague docs.

Tests:

- [x] Config profile extraction.
- [x] `AGENTS.md` extraction.
- [x] Config overrides docs.
- [ ] Missing fields generate warnings.

Acceptance:

- [x] A user sees a useful profile draft they can review.

Current progress:

- [x] Added deterministic local inference for purpose, users, tools, data sources, sensitive data, approval boundaries, unsupported topics, grounding requirements, output types, and escalation rules.
- [x] Explicit config is preserved while inferred profile data fills gaps.

## Phase 5: Risk Surface Builder

Build a risk matrix:

```text
capabilities x tools x data sources x sensitive data x user roles x failure modes
```

Required:

- [x] Identify high-risk tools.
- [x] Identify sensitive data exposure points.
- [x] Identify approval-boundary risks.
- [x] Identify grounding risks.
- [x] Identify unauthorized access risks.
- [x] Identify workflow completion risks.

Tests:

- [x] Refund tool creates approval-boundary risk.
- [x] Email tool creates external communication risk.
- [x] Private notes create sensitive disclosure risk.
- [x] Policy docs create grounding risk.
- [x] Missing profile fields create unknown coverage items.

Acceptance:

- [x] Risk surface explains why tests are needed.

Current progress:

- [x] Added `buildRiskSurface(config)` with stable IDs, severity, rationale, linked profile fields, expected coverage, and risk signatures.
- [x] Added risk-surface coverage entries that map generated tests back to the explicit risk surface.
- [x] Added risk surface summary to JSON/Markdown reports and CLI `profile`/`generate` output.

## Phase 6: Deterministic Suite Generator

Generate tests from local templates.

Required categories:

- [x] Instruction Boundary
- [x] Grounding And Evidence
- [x] Sensitive Data Protection
- [x] Tool And Action Safety
- [x] Human Approval Boundary
- [x] Overconfidence And Uncertainty
- [x] Policy And Compliance
- [x] Role And Access Control
- [x] Reliability Under Bad Inputs
- [x] Workflow Completion Quality

Each generated test includes:

- [x] name
- [x] category
- [x] severity
- [x] user input
- [x] untrusted context
- [x] expected safe behavior
- [x] why this test exists
- [x] pass criteria
- [x] fail criteria
- [x] linked profile fields

Tests:

- [x] Suite generation is deterministic.
- [x] High-risk tools generate high-severity tests.
- [x] Grounding requirements generate citation tests.
- [x] Sensitive data fields generate leakage tests.
- [x] No network calls occur.

Acceptance:

- [x] Users get useful suites without writing test cases from scratch.

Current progress:

- [x] Added deterministic suite generation for all planned release gate categories.
- [x] Added per-test rationale, detection target, pass criteria, fail criteria, and linked profile fields.

## Phase 7: Deduplication And Variant Control

Avoid noisy duplicate suites.

Required:

- [x] Implement normalized risk signature.
- [x] Merge duplicate tests.
- [x] Keep the strongest severity when duplicates merge.
- [ ] Limit variants per risk surface item.
- [x] Prefer specific agent-relevant tests over generic tests.

Tests:

- [x] Same risk signature dedupes.
- [ ] Different tools do not dedupe incorrectly.
- [ ] Different sensitive data types do not dedupe incorrectly.
- [ ] Variant cap is enforced.

Acceptance:

- [x] Generated suites feel focused, not spammy.

Current progress:

- [x] Added stable risk signatures and deterministic deduplication.

## Phase 8: Coverage Scoring

Implement coverage reporting.

Dimensions:

- [x] categories covered
- [x] tools covered
- [x] data sources covered
- [x] sensitive data covered
- [x] approval boundaries covered
- [x] target users covered
- [x] unsupported topics covered
- [x] high-severity paths covered
- [x] incident regressions covered
- [x] risk-surface items covered

Statuses:

- [x] covered
- [x] partially covered
- [x] missing
- [x] unknown because profile data is missing

Tests:

- [x] Missing refund approval test lowers coverage.
- [x] Missing sensitive data test lowers coverage.
- [x] Unknown profile fields appear as unknown.
- [x] Coverage score is deterministic.

Acceptance:

- [x] Users can see what is tested and what remains risky.

Current progress:

- [x] Added category, tool, sensitive-data, approval-boundary, data-source, target-user, high-severity-path, incident-regression, and unsupported-topic coverage scoring.
- [x] Added direct risk-surface coverage mapping and unknown-profile coverage tests.
- [x] Added direct generated-test mapping for explicit risk-surface items.

## Phase 9: Incident-To-Regression Workflow

Implement incident import.

Incident fields:

- [x] title
- [x] user input
- [x] retrieved context
- [x] actual bad response
- [x] expected safe behavior
- [x] severity
- [x] optional category

Generated output:

- [x] exact regression test
- [x] nearby variants
- [x] linked category
- [ ] linked coverage item
- [x] report entry

Tests:

- [x] Sensitive leak incident generates sensitive disclosure suite.
- [ ] Tool misuse incident generates approval-boundary variants.
- [ ] Prompt injection incident generates instruction-boundary variants.
- [x] Incident tests are marked as regressions.

Acceptance:

- [x] One production failure becomes repeatable protection.

Current progress:

- [x] Added `add-incident` CLI command.
- [x] Added incident template generation.
- [x] Added incident-to-exact-regression and nearby-variant generation.

## Phase 10: Replay Adapter Contract

Define and implement adapter contract.

Input:

```json
{
  "userInput": "User message",
  "untrustedContext": "Retrieved or external context",
  "metadata": {
    "testId": "test-id",
    "category": "instruction-boundary"
  }
}
```

Output:

```json
{
  "response": "Agent final answer",
  "toolCalls": [],
  "citations": [],
  "metadata": {}
}
```

Adapters:

- [x] mock
- [x] local HTTP
- [x] local command
- [ ] script

Tests:

- [x] Mock adapter works.
- [x] HTTP adapter sends expected payload.
- [x] Command adapter passes stdin and parses stdout.
- [ ] Adapter failures produce useful messages.
- [x] No remote Quainy endpoint is called.

Acceptance:

- [x] Teams can test existing agents without sharing implementation.

Current progress:

- [x] Added mock, local HTTP, and command adapter implementations.
- [x] HTTP adapter is restricted to localhost, `127.0.0.1`, or `::1`.

## Phase 11: Local Evaluators And Scoring

Implement deterministic evaluation.

Evaluators:

- [x] sensitive pattern leakage
- [x] forbidden tool call
- [x] approval-boundary violation
- [x] citation presence
- [ ] unsupported answer
- [x] instruction-boundary violation
- [x] overconfidence under missing evidence
- [ ] refusal/escalation behavior
- [ ] expected structured outcome

Result fields:

- [x] status
- [x] risk score
- [x] severity
- [x] explanation
- [x] suggested fix
- [x] evidence snippet
- [x] failed criterion
- [x] release-blocking flag

Tests:

- [x] Secret-looking value fails sensitive leakage test.
- [x] Refund tool call without approval fails.
- [x] Missing citation fails grounding test.
- [ ] Correct refusal passes unsupported-topic test.

Acceptance:

- [x] Results are actionable without needing remote AI.

Current progress:

- [x] Added initial deterministic evaluators for leakage, tool calls, approval boundary, grounding, instruction boundary, and overconfidence checks.

## Phase 12: Release Readiness Report

Generate reports.

Formats:

- [x] JSON
- [x] Markdown
- [ ] UI report

Report includes:

- [x] total tests
- [x] pass rate
- [x] reliability score
- [x] risk coverage score
- [x] release confidence
- [x] failed categories
- [x] missing coverage
- [x] risk surface summary
- [x] release readiness status
- [x] improvement recommendations
- [ ] audit log summary

Readiness statuses:

- [x] Ready for limited release
- [x] Needs hardening
- [x] Do not ship yet

Tests:

- [x] Critical failure blocks release.
- [x] Missing high-risk coverage blocks release.
- [x] High pass rate with missing approval coverage is not marked ready.
- [x] Markdown report renders useful summary.

Acceptance:

- [x] Users understand whether they should ship and why.

Current progress:

- [x] Added JSON and Markdown report generation.
- [x] Added readiness, reliability score, risk coverage score, release confidence, blockers, and recommendations.

## Phase 13: CLI

Implement CLI commands.

Commands:

- [x] `init`
- [x] `profile`
- [x] `generate`
- [x] `run`
- [x] `report`
- [x] `add-incident`

Required behavior:

- [x] Works without browser.
- [x] Works without network.
- [x] Uses config file.
- [x] Writes generated tests.
- [x] Writes reports.
- [x] Returns non-zero exit code when gate fails.
- [x] Prints concise console output.

Tests:

- [x] CLI init creates config.
- [x] CLI generate creates suite.
- [x] CLI run executes mock suite.
- [x] CLI run fails when threshold is not met.

Acceptance:

- [x] Developers can use Risk Replay locally from terminal.

Current progress:

- [x] Added CLI entrypoint at `cli/index.mjs`.
- [x] Added `init`, `profile`, `generate`, `run`, `report`, and `add-incident` commands.
- [x] Added `npm run risk-replay -- ...` script.

## Phase 14: GitHub Actions Template

Add CI template generation.

Required:

- [x] `.github/workflows/risk-replay.yml`
- [x] install command
- [ ] optional local agent startup command
- [x] release gate command
- [x] report artifact upload

Tests:

- [x] Generated workflow is valid YAML.
- [x] CI command does not require UI.
- [x] Non-zero exit blocks release.

Acceptance:

- [x] Users can add Risk Replay to pull requests quickly.

Current progress:

- [x] Added `github-actions` CLI command.
- [x] Added `init --github-actions`.
- [x] Added workflow generation test.

## Phase 15: UI Upgrade

Upgrade current UI around the new core engine.

Screens:

- [ ] project dashboard
- [ ] agent profile review
- [ ] context discovery review
- [ ] generated suite review
- [ ] coverage map
- [ ] incident intake
- [ ] replay run view
- [ ] release report

UX rules:

- [ ] First screen remains working product.
- [ ] No blank-page test design as default.
- [ ] Every generated test explains why it exists.
- [ ] Missing coverage is visible.
- [ ] Security model is visible but not noisy.

Tests:

- [ ] Main workflows work on desktop.
- [ ] Main workflows work on mobile.
- [ ] Text does not overflow controls.
- [ ] Dashboard works with empty, partial, and complete profiles.

Acceptance:

- [ ] UI feels like an engineering release tool.

## Phase 16: Sample Local Agent And Demo

Add a sample agent for full local demo.

Required:

- [x] sample HTTP agent
- [x] sample command agent
- [x] seeded config
- [ ] generated suite
- [ ] expected failing report
- [ ] fixed passing report

Tests:

- [x] Demo agent starts locally.
- [x] Risk Replay can run against it.
- [x] Report shows meaningful failures.

Acceptance:

- [x] A GitHub visitor can experience the full product without their own agent.

Current progress:

- [x] Added `examples/sample-agent/command-agent.mjs`.
- [x] Added `examples/sample-agent/http-agent.mjs`.
- [x] Added command and HTTP sample configs.
- [x] Added sample agent README.

## Phase 17: Documentation And Repo Polish

Required docs:

- [x] README quickstart
- [x] security model
- [x] CLI guide
- [ ] config reference
- [ ] adapter guide
- [x] GitHub Actions guide
- [x] incident workflow guide
- [x] suite generation explanation
- [x] report interpretation guide

Repo quality:

- [x] `.gitignore` covers local artifacts.
- [x] examples are committed.
- [x] reports generated by tests are ignored unless intentionally included.
- [x] no secrets in sample data.

Acceptance:

- [ ] Repo is linkable as a Quainy Labs showcase product.

## Phase 18: Quality Gate For Each Phase

Before marking any phase complete:

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm test`
- [x] relevant unit tests pass
- [x] relevant CLI flow works
- [x] docs updated
- [x] no unexpected network dependency
- [x] security model still local-first
- [x] user value is clearer than before

## Final Definition Of Done

The full product is ready when a developer can clone the repo and run:

```bash
npm install
npm run build
npm run dev
quainy-risk-replay init
quainy-risk-replay generate
quainy-risk-replay run --config risk-replay.config.json
```

And a CI runner can run:

```bash
npx quainy-risk-replay run --config risk-replay.config.json
```

Without sending private project data to Quainy or any remote service.

The final user experience should make builders feel:

- setup is lightweight
- private agent details stay private
- generated suites are relevant
- duplicate tests are controlled
- corner cases are systematically covered
- coverage gaps are visible
- failures are actionable
- release decisions are explainable
- shipping feels more trustworthy
