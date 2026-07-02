import { NextResponse } from "next/server";
import {
  buildCoverage,
  buildProfileReview,
  buildReport,
  buildRiskSurface,
  createDefaultConfig,
  discoverContext,
  generateSuite,
  inferProfileFromContext,
  mergeConfigWithInferredProfile,
  runSuite
} from "@/lib/localGate";

export const dynamic = "force-dynamic";

export async function GET() {
  const rootDir = process.cwd();
  const baseConfig = createDefaultConfig();
  const discovery = await discoverContext(rootDir, baseConfig);
  const inferred = inferProfileFromContext(discovery);
  const review = buildProfileReview(baseConfig, inferred);
  const config = mergeConfigWithInferredProfile(baseConfig, inferred);
  const riskSurface = buildRiskSurface(config);
  const tests = generateSuite(config, [], { maxVariantsPerRiskSurfaceItem: 1 });
  const results = await runSuite(config, tests);
  const report = buildReport(config, tests, results, discovery);
  const coverage = buildCoverage(config, tests, riskSurface);

  return NextResponse.json({
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
      readiness: report.readiness,
      totalTests: report.totalTests,
      passRate: report.passRate,
      riskCoverageScore: report.riskCoverageScore,
      releaseConfidence: report.releaseConfidence,
      failedCategories: report.failedCategories,
      blockingFailures: report.blockingFailures.slice(0, 8),
      recommendations: report.recommendations,
      auditSummary: report.auditSummary
    },
    results: results.slice(0, 8).map((result) => ({
      testId: result.testId,
      status: result.status,
      category: result.category,
      riskScore: result.riskScore,
      explanation: result.explanation,
      suggestedFix: result.suggestedFix,
      releaseBlocking: result.releaseBlocking
    }))
  });
}
