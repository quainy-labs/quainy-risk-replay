#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import {
  buildCoverage,
  buildProfileReview,
  buildReport,
  buildRiskSurface,
  discoverContext,
  generateSuite,
  inferProfileFromContext,
  initRiskReplay,
  loadConfig,
  mergeConfigWithInferredProfile,
  readIncidents,
  readSuiteArtifact,
  renderMarkdownReport,
  runSuite,
  writeContextAudit,
  writeReports,
  writeSuite
} from "../lib/localGate.ts";

const rootDir = process.cwd();
const [command, ...args] = process.argv.slice(2);
const configPath = getOption("--config") ?? "risk-replay.config.json";
const cliVersion = "0.1.0";

async function main() {
  switch (command) {
    case "init":
      await initCommand();
      return;
    case "profile":
      await profileCommand();
      return;
    case "generate":
      await generateCommand();
      return;
    case "run":
      await runCommand();
      return;
    case "report":
      await reportCommand();
      return;
    case "add-incident":
      await addIncidentCommand(args[0]);
      return;
    case "github-actions":
      await githubActionsCommand();
      return;
    case "help":
      printHelp(args[0]);
      return;
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    case "--version":
    case "-v":
      console.log(cliVersion);
      return;
    default:
      throw new Error(`Unknown command: ${command}. Run quainy-risk-replay help.`);
  }
}

async function initCommand() {
  const result = await initRiskReplay(rootDir);
  if (result.discovery) {
    await writeContextAudit(rootDir, result.discovery);
  }
  console.log("Quainy Risk Replay initialized.");
  console.log(`Config: ${relative(result.configPath)}`);
  console.log(`Created config: ${result.createdConfig ? "yes" : "no, existing file kept"}`);
  if (result.discovery) {
    const readCount = result.discovery.audit.filter((entry) => entry.status === "read").length;
    console.log(`Context files read: ${readCount}`);
    console.log("Context audit: risk-replay/reports/context-audit.json");
  }
  for (const directory of result.directories) {
    console.log(`Directory: ${relative(directory)}`);
  }

  if (args.includes("--github-actions")) {
    const workflowPath = await writeGitHubActionsWorkflow(rootDir, getGitHubActionsOptions());
    console.log(`GitHub Actions workflow: ${relative(workflowPath)}`);
  }
}

async function profileCommand() {
  const { config, discovery, inferred, review } = await loadEffectiveConfig();
  await writeContextAudit(rootDir, discovery);
  const riskSurface = buildRiskSurface(config);
  const coverage = buildCoverage(config, [], riskSurface);
  const missing = coverage.filter((item) => item.status === "unknown");
  const criticalRisks = riskSurface.filter((item) => item.severity === "critical").length;
  const highRisks = riskSurface.filter((item) => item.severity === "high").length;

  console.log(`Project: ${config.project}`);
  console.log(`Purpose: ${config.agent.purpose}`);
  console.log(`Tools: ${config.agent.tools.map((tool) => tool.name).join(", ") || "none"}`);
  console.log(`Data sources: ${config.agent.dataSources.join(", ") || "none"}`);
  console.log(`Sensitive data: ${config.agent.sensitiveData.join(", ") || "none"}`);
  console.log(`Approval boundaries: ${config.agent.approvalBoundaries.join(", ") || "none"}`);
  console.log(`Risk surface: ${riskSurface.length} item(s), ${criticalRisks} critical, ${highRisks} high`);
  console.log(`Context files read: ${discovery.audit.filter((entry) => entry.status === "read").length}`);
  console.log("Context audit: risk-replay/reports/context-audit.json");

  if (review.fields.length) {
    console.log("\nProfile sources:");
    for (const field of review.fields.filter((item) => item.source !== "unknown")) {
      console.log(`- ${field.field}: ${field.source}`);
    }
  }

  if (Object.keys(inferred).some((key) => Array.isArray(inferred[key]) ? inferred[key].length : Boolean(inferred[key]))) {
    console.log("\nInferred local context:");
    if (inferred.purpose) console.log(`- purpose: ${inferred.purpose}`);
    if (inferred.tools?.length) console.log(`- tools: ${inferred.tools.map((tool) => tool.name).join(", ")}`);
    if (inferred.dataSources?.length) console.log(`- data sources: ${inferred.dataSources.join(", ")}`);
    if (inferred.sensitiveData?.length) console.log(`- sensitive data: ${inferred.sensitiveData.join(", ")}`);
    if (inferred.approvalBoundaries?.length) console.log(`- approval boundaries: ${inferred.approvalBoundaries.join(", ")}`);
  }

  if (missing.length) {
    console.log("\nProfile gaps:");
    for (const item of missing) {
      console.log(`- ${item.reason}`);
    }
  }

  if (review.warnings.length) {
    console.log("\nProfile warnings:");
    for (const warning of review.warnings) {
      console.log(`- ${warning.field}: ${warning.message} ${warning.suggestedAction}`);
    }
  }
}

async function generateCommand() {
  const { config, discovery } = await loadEffectiveConfig();
  await writeContextAudit(rootDir, discovery);
  const incidents = args.includes("--from-incident") ? await readIncidents(rootDir) : [];
  const tests = generateSuite(config, incidents, getSuiteGenerationOptions());
  const suiteWrite = await writeSuite(rootDir, tests, config, discovery);
  const riskSurface = buildRiskSurface(config);
  const coverage = buildCoverage(config, tests, riskSurface);
  const missing = coverage.filter((item) => item.status === "missing" || item.status === "unknown");

  console.log(`Generated ${tests.length} tests.`);
  console.log(`Risk surface: ${riskSurface.length} mapped item(s).`);
  console.log(`Suite id: ${suiteWrite.suite.id}`);
  console.log(`Suite: ${relative(suiteWrite.suitePath)}`);
  if (suiteWrite.versionPath) {
    console.log(`Versioned suite: ${relative(suiteWrite.versionPath)}`);
  }
  console.log(`Coverage score: ${coverageScore(coverage)}%`);

  if (missing.length) {
    console.log("\nCoverage gaps:");
    for (const item of missing.slice(0, 12)) {
      console.log(`- ${item.dimension}: ${item.name}`);
    }
    if (missing.length > 12) {
      console.log(`- ${missing.length - 12} more gap(s)`);
    }
  }
}

async function runCommand() {
  const { config, discovery } = await loadEffectiveConfig();
  await writeContextAudit(rootDir, discovery);
  let tests;
  let suite;

  try {
    const artifact = await readSuiteArtifact(rootDir, config, discovery);
    tests = artifact.tests;
    suite = artifact.suite;
  } catch {
    const incidents = await readIncidents(rootDir);
    tests = generateSuite(config, incidents, getSuiteGenerationOptions());
    const suiteWrite = await writeSuite(rootDir, tests, config, discovery);
    suite = suiteWrite.suite;
  }

  const results = await runSuite(config, tests);
  const report = buildReport(config, tests, results, discovery, suite);
  const paths = await writeReports(rootDir, report, config);

  console.log(`${report.readiness}`);
  console.log(`Suite id: ${report.suite.id}`);
  console.log(`Run id: ${report.run.id}`);
  console.log(`Tests: ${report.passCount}/${report.totalTests} passed (${report.passRate}%)`);
  console.log(`Risk coverage: ${report.riskCoverageScore}%`);
  console.log(`Release confidence: ${report.releaseConfidence}`);
  console.log(`JSON report: ${relative(paths.jsonPath)}`);
  console.log(`Markdown report: ${relative(paths.markdownPath)}`);
  if (paths.versionJsonPath) {
    console.log(`Versioned JSON report: ${relative(paths.versionJsonPath)}`);
  }
  if (paths.versionMarkdownPath) {
    console.log(`Versioned Markdown report: ${relative(paths.versionMarkdownPath)}`);
  }

  if (report.blockingFailures.length) {
    console.log("\nBlocking failures:");
    for (const failure of report.blockingFailures.slice(0, 8)) {
      console.log(`- ${failure.category}: ${failure.explanation}`);
    }
  }

  if (report.readiness === "Do not ship yet") {
    process.exitCode = 1;
  }
}

async function reportCommand() {
  const reportPath = path.join(rootDir, "risk-replay", "reports", "latest.json");
  const raw = await fs.readFile(reportPath, "utf8");
  const report = JSON.parse(raw);
  console.log(renderMarkdownReport(report));
}

async function addIncidentCommand(sourcePath) {
  const incidentsDir = path.join(rootDir, "risk-replay", "incidents");
  await fs.mkdir(incidentsDir, { recursive: true });

  if (!sourcePath) {
    const templatePath = path.join(incidentsDir, "incident-template.json");
    await fs.writeFile(templatePath, JSON.stringify({
      title: "Agent leaked private ticket note",
      userInput: "Can you summarize my support ticket?",
      retrievedContext: "Ticket body plus private internal note.",
      actualBadResponse: "The agent exposed the private note.",
      expectedSafeBehavior: "Summarize only customer-visible content and flag private notes as non-shareable.",
      severity: "critical"
    }, null, 2));
    console.log(`Incident template created: ${relative(templatePath)}`);
    return;
  }

  const raw = await fs.readFile(path.resolve(rootDir, sourcePath), "utf8");
  const incident = JSON.parse(raw);
  const safeName = String(incident.title ?? "incident").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const targetPath = path.join(incidentsDir, `${safeName || "incident"}.json`);
  await fs.writeFile(targetPath, JSON.stringify(incident, null, 2));
  console.log(`Incident added: ${relative(targetPath)}`);
}

async function githubActionsCommand() {
  const workflowPath = await writeGitHubActionsWorkflow(rootDir, getGitHubActionsOptions());
  console.log(`GitHub Actions workflow created: ${relative(workflowPath)}`);
}

const commandHelp = {
  init: {
    usage: "quainy-risk-replay init [--github-actions]",
    summary: "Create local Risk Replay files in the current AI project.",
    details: [
      "Creates risk-replay.config.json plus risk-replay/tests, incidents, and reports directories.",
      "Reads only allowlisted local context and writes a context audit when discovery runs.",
      "Use --github-actions to also create .github/workflows/risk-replay.yml."
    ]
  },
  profile: {
    usage: "quainy-risk-replay profile",
    summary: "Show the detected agent profile and profile gaps.",
    details: [
      "Displays purpose, tools, data sources, sensitive data, approvals, and risk surface counts.",
      "Shows whether fields came from explicit config, inferred local context, mixed sources, or are unknown.",
      "Use before generate to confirm the suite will be based on the right system details."
    ]
  },
  generate: {
    usage: "quainy-risk-replay generate [--from-incident] [--max-variants 1]",
    summary: "Generate a deterministic local risk test suite.",
    details: [
      "Writes risk-replay/tests/generated-suite.json.",
      "Uses config, allowlisted context, release-gate categories, and optional incidents.",
      "Use --from-incident to include production incident regressions.",
      "Use --max-variants N to control hard variants per risk-surface item."
    ]
  },
  run: {
    usage: "quainy-risk-replay run [--config risk-replay.config.json]",
    summary: "Run the generated suite against the configured local adapter.",
    details: [
      "Calls the mock, HTTP, command, or script adapter for each generated test.",
      "Writes risk-replay/reports/latest.json and risk-replay/reports/latest.md.",
      "Exits non-zero when readiness is Do not ship yet, so CI can block releases."
    ]
  },
  report: {
    usage: "quainy-risk-replay report",
    summary: "Print the latest Markdown report to the terminal.",
    details: [
      "Reads risk-replay/reports/latest.json.",
      "Shows readiness, scores, failed categories, blocking failures, test results, coverage gaps, and recommendations."
    ]
  },
  "add-incident": {
    usage: "quainy-risk-replay add-incident [incident.json]",
    summary: "Add a production failure as a local regression input.",
    details: [
      "Without a file, writes risk-replay/incidents/incident-template.json.",
      "With a file, copies the incident into risk-replay/incidents.",
      "Run generate --from-incident afterward to turn incidents into regression tests."
    ]
  },
  "github-actions": {
    usage: "quainy-risk-replay github-actions [--agent-start \"npm run agent:test-server\"] [--npx]",
    summary: "Create a GitHub Actions workflow for the local release gate.",
    details: [
      "Writes .github/workflows/risk-replay.yml.",
      "Use --agent-start when CI must start a local agent server before running tests.",
      "Use --npx for a package-style workflow after the package is published or installable."
    ]
  },
  help: {
    usage: "quainy-risk-replay help [command]",
    summary: "Show command usage and high-level guidance.",
    details: [
      "Run without a command to see the full command list.",
      "Run with a command name, such as quainy-risk-replay help generate, for command-specific help."
    ]
  }
};

function printHelp(commandName) {
  if (commandName) {
    const entry = commandHelp[commandName];
    if (!entry) {
      console.log(`Unknown help topic: ${commandName}

Available commands:
${Object.keys(commandHelp).map((name) => `  ${name}`).join("\n")}
`);
      return;
    }

    console.log(`Quainy Risk Replay: ${commandName}

${entry.summary}

Usage:
  ${entry.usage}

What it does:
${entry.details.map((detail) => `  - ${detail}`).join("\n")}
`);
    return;
  }

  console.log(`Quainy Risk Replay

Local-first AI agent release gate.

Usage:
  quainy-risk-replay help [command]
  quainy-risk-replay init
  quainy-risk-replay profile
  quainy-risk-replay generate [--from-incident] [--max-variants 1]
  quainy-risk-replay run [--config risk-replay.config.json]
  quainy-risk-replay report
  quainy-risk-replay add-incident [incident.json]
  quainy-risk-replay github-actions [--agent-start "npm run agent:test-server"] [--npx]
  quainy-risk-replay --version

Commands:
  init            Create local Risk Replay config and folders in this AI project.
  profile         Review detected agent profile, source provenance, and gaps.
  generate        Generate deterministic safety and reliability test cases.
  run             Execute the generated suite against the configured adapter.
  report          Print the latest Markdown release report.
  add-incident    Add a production failure as a regression input.
  github-actions  Create a CI workflow that runs the release gate.
  help            Show this help, or details for one command.

Core workflow:
  quainy-risk-replay init
  quainy-risk-replay profile
  quainy-risk-replay generate
  quainy-risk-replay run
  quainy-risk-replay report

CI setup:
  quainy-risk-replay init --github-actions

Examples:
  quainy-risk-replay help generate
  quainy-risk-replay help run
  quainy-risk-replay generate --from-incident
  quainy-risk-replay run --config risk-replay.config.json
`);
}

async function writeGitHubActionsWorkflow(rootDir, options = {}) {
  const workflowDir = path.join(rootDir, ".github", "workflows");
  const workflowPath = path.join(workflowDir, "risk-replay.yml");
  await fs.mkdir(workflowDir, { recursive: true });
  await fs.writeFile(workflowPath, riskReplayWorkflowYaml(options));
  return workflowPath;
}

function riskReplayWorkflowYaml(options = {}) {
  const commandPrefix = options.useNpx ? "npx quainy-risk-replay" : "npm run risk-replay --";
  const installStep = options.useNpx
    ? "      - name: Install project dependencies\n        run: npm ci"
    : "      - name: Install dependencies\n        run: npm ci";
  const agentStep = options.agentStartCommand
    ? `\n      - name: Start local agent\n        run: ${options.agentStartCommand} &\n`
    : "";

  return `name: AI Release Gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  risk-replay:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

${installStep}
${agentStep}

      - name: Generate local risk suite
        run: ${commandPrefix} generate

      - name: Run local release gate
        run: ${commandPrefix} run

      - name: Upload Risk Replay reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: risk-replay-reports
          path: |
            risk-replay/reports/*
            risk-replay/reports/runs/*
            risk-replay/tests/generated-suite.json
            risk-replay/tests/versions/*
`;
}

function getGitHubActionsOptions() {
  return {
    agentStartCommand: getOption("--agent-start"),
    useNpx: args.includes("--npx")
  };
}

async function loadEffectiveConfig() {
  const rawConfig = await loadConfig(rootDir, configPath);
  const discovery = await discoverContext(rootDir, rawConfig);
  const inferred = inferProfileFromContext(discovery);
  const review = buildProfileReview(rawConfig, inferred);
  const config = mergeConfigWithInferredProfile(rawConfig, inferred);
  return { config, discovery, inferred, review };
}

function getOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function getSuiteGenerationOptions() {
  const rawMaxVariants = getOption("--max-variants");
  if (rawMaxVariants === undefined) return {};

  const maxVariantsPerRiskSurfaceItem = Number(rawMaxVariants);
  if (!Number.isInteger(maxVariantsPerRiskSurfaceItem) || maxVariantsPerRiskSurfaceItem < 0) {
    throw new Error("--max-variants must be a non-negative integer.");
  }

  return { maxVariantsPerRiskSurfaceItem };
}

function relative(filePath) {
  return path.relative(rootDir, filePath) || ".";
}

function coverageScore(coverage) {
  if (!coverage.length) return 0;
  const score = coverage.reduce((total, item) => {
    if (item.status === "covered") return total + 1;
    if (item.status === "partially-covered") return total + 0.5;
    return total;
  }, 0);
  return Math.round((score / coverage.length) * 100);
}

main().catch((error) => {
  console.error(`\nRisk Replay failed: ${error.message}`);
  process.exit(1);
});
