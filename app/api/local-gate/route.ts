import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  buildCoverage,
  buildProfileReview,
  buildReport,
  buildRiskSurface,
  createDefaultConfig,
  discoverContext,
  generateSuite,
  inferProfileFromContext,
  initRiskReplay,
  loadConfig,
  localRiskCategories,
  mergeConfigWithInferredProfile,
  readIncidents,
  readSuite,
  runSuite,
  writeContextAudit,
  writeReports,
  writeSuite
} from "@/lib/localGate";
import type { GateReport, GateSeverity, Incident } from "@/lib/localGate";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await buildLocalGateState(process.cwd()));
}

export async function POST(request: Request) {
  const rootDir = process.cwd();
  const body = (await request.json().catch(() => ({}))) as { action?: string; fromIncidents?: boolean; incident?: Partial<Incident> };
  const action = body.action ?? "refresh";

  if (action === "init") {
    const result = await initRiskReplay(rootDir);
    if (result.discovery) {
      await writeContextAudit(rootDir, result.discovery);
    }
    return NextResponse.json(await buildLocalGateState(rootDir));
  }

  if (action === "generate") {
    const baseConfig = await loadExistingOrDefaultConfig(rootDir);
    const discovery = await discoverContext(rootDir, baseConfig);
    const inferred = inferProfileFromContext(discovery);
    const config = mergeConfigWithInferredProfile(baseConfig, inferred);
    const incidents = body.fromIncidents ? await readIncidents(rootDir) : [];
    const tests = generateSuite(config, incidents, { maxVariantsPerRiskSurfaceItem: 1 });
    await writeContextAudit(rootDir, discovery);
    await writeSuite(rootDir, tests);
    return NextResponse.json(await buildLocalGateState(rootDir));
  }

  if (action === "add-incident") {
    await loadExistingOrDefaultConfig(rootDir);
    const validation = validateIncident(body.incident);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const incident = validation.incident;
    const incidentsDir = path.join(rootDir, "risk-replay", "incidents");
    const incidentPath = path.join(incidentsDir, `${safeFileName(incident.title)}.json`);
    await fs.mkdir(incidentsDir, { recursive: true });
    await fs.writeFile(incidentPath, JSON.stringify(incident, null, 2));

    const baseConfig = await loadConfig(rootDir);
    const discovery = await discoverContext(rootDir, baseConfig);
    const inferred = inferProfileFromContext(discovery);
    const config = mergeConfigWithInferredProfile(baseConfig, inferred);
    const incidents = await readIncidents(rootDir);
    const tests = generateSuite(config, incidents, { maxVariantsPerRiskSurfaceItem: 1 });
    await writeContextAudit(rootDir, discovery);
    await writeSuite(rootDir, tests);
    return NextResponse.json(await buildLocalGateState(rootDir));
  }

  if (action === "run") {
    const baseConfig = await loadExistingOrDefaultConfig(rootDir);
    const discovery = await discoverContext(rootDir, baseConfig);
    const inferred = inferProfileFromContext(discovery);
    const config = mergeConfigWithInferredProfile(baseConfig, inferred);
    let tests;

    try {
      tests = await readSuite(rootDir);
    } catch {
      tests = generateSuite(config, [], { maxVariantsPerRiskSurfaceItem: 1 });
      await writeSuite(rootDir, tests);
    }

    const results = await runSuite(config, tests);
    const report = buildReport(config, tests, results, discovery);
    await writeContextAudit(rootDir, discovery);
    await writeReports(rootDir, report);
    return NextResponse.json(await buildLocalGateState(rootDir));
  }

  if (action === "refresh") {
    return NextResponse.json(await buildLocalGateState(rootDir));
  }

  return NextResponse.json({ error: `Unknown local gate action: ${action}` }, { status: 400 });
}

async function buildLocalGateState(rootDir: string) {
  const configExists = await fileExists(path.join(rootDir, "risk-replay.config.json"));
  const suiteExists = configExists && await fileExists(path.join(rootDir, "risk-replay", "tests", "generated-suite.json"));
  const reportPath = path.join(rootDir, "risk-replay", "reports", "latest.json");
  const reportExists = configExists && await fileExists(reportPath);
  const incidentCount = configExists ? (await readIncidents(rootDir)).length : 0;
  const baseConfig = configExists ? await loadConfig(rootDir) : createDefaultConfig();
  const discovery = await discoverContext(rootDir, baseConfig);
  const inferred = inferProfileFromContext(discovery);
  const review = buildProfileReview(baseConfig, inferred);
  const config = mergeConfigWithInferredProfile(baseConfig, inferred);
  const riskSurface = buildRiskSurface(config);
  const tests = suiteExists
    ? await readSuite(rootDir)
    : generateSuite(config, [], { maxVariantsPerRiskSurfaceItem: 1 });
  const coverage = buildCoverage(config, tests, riskSurface);
  const latestReport = reportExists ? await readLatestReport(reportPath) : null;

  return {
    status: {
      configExists,
      suiteExists,
      reportExists,
      configPath: "risk-replay.config.json",
      suitePath: "risk-replay/tests/generated-suite.json",
      reportPath: "risk-replay/reports/latest.json",
      incidentCount,
      usingPreviewSuite: !suiteExists,
      canRun: true
    },
    project: config.project,
    profile: config.agent,
    review,
    context: {
      filesRead: discovery.files.map((file) => ({
        path: file.path,
        sourceType: file.sourceType,
        bytes: file.bytes
      })),
      audit: discovery.audit
    },
    riskSurface,
    tests: tests.map((test) => ({
      id: test.id,
      name: test.name,
      category: test.category,
      severity: test.severity,
      why: test.why,
      detects: test.detects,
      linkedProfileFields: test.linkedProfileFields,
      variantOf: test.variantOf
    })),
    coverage,
    report: {
      readiness: latestReport?.readiness ?? "Not run yet",
      totalTests: latestReport?.totalTests ?? tests.length,
      passRate: latestReport?.passRate ?? null,
      riskCoverageScore: latestReport?.riskCoverageScore ?? scoreCoverage(coverage),
      releaseConfidence: latestReport?.releaseConfidence ?? null,
      failedCategories: latestReport?.failedCategories ?? [],
      blockingFailures: latestReport?.blockingFailures?.slice(0, 8) ?? [],
      recommendations: latestReport?.recommendations ?? ["Generate a suite, then run the local release gate to create a real report."],
      auditSummary: latestReport?.auditSummary ?? buildAuditSummary(discovery)
    },
    results: (latestReport?.results ?? []).slice(0, 8).map((result) => ({
      testId: result.testId,
      status: result.status,
      category: result.category,
      riskScore: result.riskScore,
      explanation: result.explanation,
      suggestedFix: result.suggestedFix,
      releaseBlocking: result.releaseBlocking
    }))
  };
}

async function loadExistingOrDefaultConfig(rootDir: string) {
  if (await fileExists(path.join(rootDir, "risk-replay.config.json"))) {
    return loadConfig(rootDir);
  }

  const result = await initRiskReplay(rootDir);
  if (result.discovery) {
    await writeContextAudit(rootDir, result.discovery);
  }
  return loadConfig(rootDir);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readLatestReport(reportPath: string): Promise<GateReport> {
  const raw = await fs.readFile(reportPath, "utf8");
  return JSON.parse(raw) as GateReport;
}

function buildAuditSummary(discovery: { files: Array<{ bytes: number; sourceType: string }>; audit: Array<{ status: string }> }) {
  const sourceTypes: Record<string, number> = {};
  for (const file of discovery.files) {
    sourceTypes[file.sourceType] = (sourceTypes[file.sourceType] ?? 0) + 1;
  }

  return {
    filesRead: discovery.audit.filter((entry) => entry.status === "read").length,
    filesSkipped: discovery.audit.filter((entry) => entry.status === "skipped").length,
    filesExcluded: discovery.audit.filter((entry) => entry.status === "excluded").length,
    filesMissing: discovery.audit.filter((entry) => entry.status === "missing").length,
    bytesRead: discovery.files.reduce((total, file) => total + file.bytes, 0),
    sourceTypes
  };
}

function scoreCoverage(coverage: Array<{ status: string }>) {
  if (!coverage.length) return 0;
  const score = coverage.reduce((total, item) => {
    if (item.status === "covered") return total + 1;
    if (item.status === "partially-covered") return total + 0.5;
    return total;
  }, 0);
  return Math.round((score / coverage.length) * 100);
}

function validateIncident(input: Partial<Incident> | undefined): { incident: Incident } | { error: string } {
  const errors: string[] = [];
  const severity = input?.severity;
  const category = input?.category;

  if (!input?.title?.trim()) errors.push("incident.title is required");
  if (!input?.userInput?.trim()) errors.push("incident.userInput is required");
  if (!input?.retrievedContext?.trim()) errors.push("incident.retrievedContext is required");
  if (!input?.actualBadResponse?.trim()) errors.push("incident.actualBadResponse is required");
  if (!input?.expectedSafeBehavior?.trim()) errors.push("incident.expectedSafeBehavior is required");
  if (!severity || !isGateSeverity(severity)) errors.push("incident.severity must be one of: low, medium, high, critical");
  if (category && !localRiskCategories.includes(category)) errors.push(`incident.category must be one of: ${localRiskCategories.join(", ")}`);

  if (errors.length) {
    return { error: errors.join("; ") };
  }

  return {
    incident: {
      title: input!.title!.trim(),
      userInput: input!.userInput!.trim(),
      retrievedContext: input!.retrievedContext!.trim(),
      actualBadResponse: input!.actualBadResponse!.trim(),
      expectedSafeBehavior: input!.expectedSafeBehavior!.trim(),
      severity: severity as GateSeverity,
      ...(category ? { category } : {})
    }
  };
}

function isGateSeverity(value: unknown): value is GateSeverity {
  return value === "low" || value === "medium" || value === "high" || value === "critical";
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "incident";
}
