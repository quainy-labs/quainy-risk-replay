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

## Phase 0: Align Current Showcase With Product Direction

- [ ] Update README to clearly describe local-first release gate direction.
- [ ] Keep current dashboard usable.
- [ ] Link `PRODUCT_PLAN.md` and this checklist from README.
- [ ] Make sure current mock replay still runs.
- [ ] Make sure `npm run typecheck` passes.
- [ ] Make sure `npm run build` passes.

Acceptance:

- [ ] A new visitor understands the current app and the planned full product.
- [ ] The repo has one plan file and one build checklist file.

## Phase 1: Domain Model Foundation

Add typed models for:

- [ ] `AgentProfile`
- [ ] `AgentTool`
- [ ] `DataSource`
- [ ] `SensitiveDataType`
- [ ] `ApprovalBoundary`
- [ ] `RiskCategory`
- [ ] `RiskSurfaceItem`
- [ ] `GeneratedTestCase`
- [ ] `Incident`
- [ ] `CoverageReport`
- [ ] `ReplayAdapterConfig`
- [ ] `ReplayResult`
- [ ] `ReleaseReport`

Tests:

- [ ] Type-level compile coverage through `npm run typecheck`.
- [ ] Unit tests for profile validation.
- [ ] Unit tests for default thresholds and readiness inputs.

Acceptance:

- [ ] Existing dashboard still works.
- [ ] Old test case model is either migrated or cleanly adapted.

## Phase 2: Local Config Support

Implement `risk-replay.config.json`.

Required:

- [ ] Load config from repo root.
- [ ] Validate required fields.
- [ ] Support context include/exclude paths.
- [ ] Support agent profile fields.
- [ ] Support adapter config.
- [ ] Support thresholds.
- [ ] Support report formats.
- [ ] Produce useful errors for missing fields.

Tests:

- [ ] Valid config loads.
- [ ] Missing required fields produce actionable errors.
- [ ] Excluded paths are not read.
- [ ] Unknown adapter type fails clearly.

Acceptance:

- [ ] A user can define an agent profile without using the UI.

## Phase 3: Conservative Context Discovery

Implement local context discovery.

Sources:

- [ ] `AGENTS.md`
- [ ] `agents.md`
- [ ] `README.md`
- [ ] `docs/agent.md`
- [ ] allowlisted prompt files
- [ ] allowlisted tool schemas
- [ ] allowlisted OpenAPI specs

Rules:

- [ ] Never read `.env`.
- [ ] Never read excluded paths.
- [ ] Never read broad customer-data folders by default.
- [ ] Record every file read in an audit log.
- [ ] Show missing profile fields.

Tests:

- [ ] Include patterns work.
- [ ] Exclude patterns override include patterns.
- [ ] Secret-looking files are skipped.
- [ ] Audit log lists files read.

Acceptance:

- [ ] The product can find useful local context without feeling invasive.

## Phase 4: Agent Profile Extraction

Implement deterministic extraction from config and simple docs.

Extract:

- [ ] purpose
- [ ] target users
- [ ] data sources
- [ ] tools/actions
- [ ] approval boundaries
- [ ] sensitive data
- [ ] unsupported topics
- [ ] grounding requirements
- [ ] escalation/refusal rules

Rules:

- [ ] Prefer explicit config over inferred docs.
- [ ] Mark inferred fields as inferred.
- [ ] Mark missing fields as unknown.
- [ ] Never invent certainty from vague docs.

Tests:

- [ ] Config profile extraction.
- [ ] `AGENTS.md` extraction.
- [ ] Config overrides docs.
- [ ] Missing fields generate warnings.

Acceptance:

- [ ] A user sees a useful profile draft they can review.

## Phase 5: Risk Surface Builder

Build a risk matrix:

```text
capabilities x tools x data sources x sensitive data x user roles x failure modes
```

Required:

- [ ] Identify high-risk tools.
- [ ] Identify sensitive data exposure points.
- [ ] Identify approval-boundary risks.
- [ ] Identify grounding risks.
- [ ] Identify unauthorized access risks.
- [ ] Identify workflow completion risks.

Tests:

- [ ] Refund tool creates approval-boundary risk.
- [ ] Email tool creates external communication risk.
- [ ] Private notes create sensitive disclosure risk.
- [ ] Policy docs create grounding risk.
- [ ] Missing profile fields create unknown coverage items.

Acceptance:

- [ ] Risk surface explains why tests are needed.

## Phase 6: Deterministic Suite Generator

Generate tests from local templates.

Required categories:

- [ ] Instruction Boundary
- [ ] Grounding And Evidence
- [ ] Sensitive Data Protection
- [ ] Tool And Action Safety
- [ ] Human Approval Boundary
- [ ] Overconfidence And Uncertainty
- [ ] Policy And Compliance
- [ ] Role And Access Control
- [ ] Reliability Under Bad Inputs
- [ ] Workflow Completion Quality

Each generated test includes:

- [ ] name
- [ ] category
- [ ] severity
- [ ] user input
- [ ] untrusted context
- [ ] expected safe behavior
- [ ] why this test exists
- [ ] pass criteria
- [ ] fail criteria
- [ ] linked profile fields

Tests:

- [ ] Suite generation is deterministic.
- [ ] High-risk tools generate high-severity tests.
- [ ] Grounding requirements generate citation tests.
- [ ] Sensitive data fields generate leakage tests.
- [ ] No network calls occur.

Acceptance:

- [ ] Users get useful suites without writing test cases from scratch.

## Phase 7: Deduplication And Variant Control

Avoid noisy duplicate suites.

Required:

- [ ] Implement normalized risk signature.
- [ ] Merge duplicate tests.
- [ ] Keep the strongest severity when duplicates merge.
- [ ] Limit variants per risk surface item.
- [ ] Prefer specific agent-relevant tests over generic tests.

Tests:

- [ ] Same risk signature dedupes.
- [ ] Different tools do not dedupe incorrectly.
- [ ] Different sensitive data types do not dedupe incorrectly.
- [ ] Variant cap is enforced.

Acceptance:

- [ ] Generated suites feel focused, not spammy.

## Phase 8: Coverage Scoring

Implement coverage reporting.

Dimensions:

- [ ] categories covered
- [ ] tools covered
- [ ] data sources covered
- [ ] sensitive data covered
- [ ] approval boundaries covered
- [ ] target users covered
- [ ] unsupported topics covered
- [ ] high-severity paths covered
- [ ] incident regressions covered

Statuses:

- [ ] covered
- [ ] partially covered
- [ ] missing
- [ ] unknown because profile data is missing

Tests:

- [ ] Missing refund approval test lowers coverage.
- [ ] Missing sensitive data test lowers coverage.
- [ ] Unknown profile fields appear as unknown.
- [ ] Coverage score is deterministic.

Acceptance:

- [ ] Users can see what is tested and what remains risky.

## Phase 9: Incident-To-Regression Workflow

Implement incident import.

Incident fields:

- [ ] title
- [ ] user input
- [ ] retrieved context
- [ ] actual bad response
- [ ] expected safe behavior
- [ ] severity
- [ ] optional category

Generated output:

- [ ] exact regression test
- [ ] nearby variants
- [ ] linked category
- [ ] linked coverage item
- [ ] report entry

Tests:

- [ ] Sensitive leak incident generates sensitive disclosure suite.
- [ ] Tool misuse incident generates approval-boundary variants.
- [ ] Prompt injection incident generates instruction-boundary variants.
- [ ] Incident tests are marked as regressions.

Acceptance:

- [ ] One production failure becomes repeatable protection.

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

- [ ] mock
- [ ] local HTTP
- [ ] local command
- [ ] script

Tests:

- [ ] Mock adapter works.
- [ ] HTTP adapter sends expected payload.
- [ ] Command adapter passes stdin and parses stdout.
- [ ] Adapter failures produce useful messages.
- [ ] No remote Quainy endpoint is called.

Acceptance:

- [ ] Teams can test existing agents without sharing implementation.

## Phase 11: Local Evaluators And Scoring

Implement deterministic evaluation.

Evaluators:

- [ ] sensitive pattern leakage
- [ ] forbidden tool call
- [ ] approval-boundary violation
- [ ] citation presence
- [ ] unsupported answer
- [ ] instruction-boundary violation
- [ ] overconfidence under missing evidence
- [ ] refusal/escalation behavior
- [ ] expected structured outcome

Result fields:

- [ ] status
- [ ] risk score
- [ ] severity
- [ ] explanation
- [ ] suggested fix
- [ ] evidence snippet
- [ ] failed criterion
- [ ] release-blocking flag

Tests:

- [ ] Secret-looking value fails sensitive leakage test.
- [ ] Refund tool call without approval fails.
- [ ] Missing citation fails grounding test.
- [ ] Correct refusal passes unsupported-topic test.

Acceptance:

- [ ] Results are actionable without needing remote AI.

## Phase 12: Release Readiness Report

Generate reports.

Formats:

- [ ] JSON
- [ ] Markdown
- [ ] UI report

Report includes:

- [ ] total tests
- [ ] pass rate
- [ ] reliability score
- [ ] risk coverage score
- [ ] release confidence
- [ ] failed categories
- [ ] missing coverage
- [ ] release readiness status
- [ ] improvement recommendations
- [ ] audit log summary

Readiness statuses:

- [ ] Ready for limited release
- [ ] Needs hardening
- [ ] Do not ship yet

Tests:

- [ ] Critical failure blocks release.
- [ ] Missing high-risk coverage blocks release.
- [ ] High pass rate with missing approval coverage is not marked ready.
- [ ] Markdown report renders useful summary.

Acceptance:

- [ ] Users understand whether they should ship and why.

## Phase 13: CLI

Implement CLI commands.

Commands:

- [ ] `init`
- [ ] `profile`
- [ ] `generate`
- [ ] `run`
- [ ] `report`
- [ ] `add-incident`

Required behavior:

- [ ] Works without browser.
- [ ] Works without network.
- [ ] Uses config file.
- [ ] Writes generated tests.
- [ ] Writes reports.
- [ ] Returns non-zero exit code when gate fails.
- [ ] Prints concise console output.

Tests:

- [ ] CLI init creates config.
- [ ] CLI generate creates suite.
- [ ] CLI run executes mock suite.
- [ ] CLI run fails when threshold is not met.

Acceptance:

- [ ] Developers can use Risk Replay locally from terminal.

## Phase 14: GitHub Actions Template

Add CI template generation.

Required:

- [ ] `.github/workflows/risk-replay.yml`
- [ ] install command
- [ ] optional local agent startup command
- [ ] release gate command
- [ ] report artifact upload

Tests:

- [ ] Generated workflow is valid YAML.
- [ ] CI command does not require UI.
- [ ] Non-zero exit blocks release.

Acceptance:

- [ ] Users can add Risk Replay to pull requests quickly.

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

- [ ] sample HTTP agent
- [ ] sample command agent
- [ ] seeded config
- [ ] generated suite
- [ ] expected failing report
- [ ] fixed passing report

Tests:

- [ ] Demo agent starts locally.
- [ ] Risk Replay can run against it.
- [ ] Report shows meaningful failures.

Acceptance:

- [ ] A GitHub visitor can experience the full product without their own agent.

## Phase 17: Documentation And Repo Polish

Required docs:

- [ ] README quickstart
- [ ] security model
- [ ] CLI guide
- [ ] config reference
- [ ] adapter guide
- [ ] GitHub Actions guide
- [ ] incident workflow guide
- [ ] suite generation explanation
- [ ] report interpretation guide

Repo quality:

- [ ] `.gitignore` covers local artifacts.
- [ ] examples are committed.
- [ ] reports generated by tests are ignored unless intentionally included.
- [ ] no secrets in sample data.

Acceptance:

- [ ] Repo is linkable as a Quainy Labs showcase product.

## Phase 18: Quality Gate For Each Phase

Before marking any phase complete:

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] relevant unit tests pass
- [ ] relevant CLI flow works
- [ ] docs updated
- [ ] no unexpected network dependency
- [ ] security model still local-first
- [ ] user value is clearer than before

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
