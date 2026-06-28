"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, ShieldX, TrendingUp } from "lucide-react";
import { buildProjectReport } from "@/lib/report";
import { riskCategoryLabels, type Project, type Workspace } from "@/lib/types";

export function ReportDashboard() {
  const [workspace, setWorkspace] = useState<Workspace>({ projects: [] });
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = (await response.json()) as Workspace;
      setWorkspace(data);
      setSelectedProjectId(data.projects[0]?.id ?? "");
    }

    void load();
  }, []);

  const project = useMemo<Project | undefined>(
    () =>
      workspace.projects.find((item) => item.id === selectedProjectId) ??
      workspace.projects[0],
    [selectedProjectId, workspace.projects]
  );

  const report = useMemo(() => (project ? buildProjectReport(project) : null), [project]);

  return (
    <main className="page report-page">
      <section className="report-header">
        <div>
          <p className="eyebrow">Release report</p>
          <h1>{project?.name ?? "No project yet"}</h1>
          <p>
            Latest replay results across the workflow. The report uses the newest
            result per test case, so regressions stay visible after repeated runs.
          </p>
        </div>
        <label className="project-select">
          Project
          <select
            value={project?.id ?? ""}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {workspace.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {project && report ? (
        <>
          <div className="metric-grid report-metrics">
            <ReportMetric icon={<FileText size={20} />} label="Total tests" value={report.totalTests.toString()} />
            <ReportMetric icon={<CheckCircle2 size={20} />} label="Pass rate" value={`${report.passRate}%`} />
            <ReportMetric icon={<ShieldX size={20} />} label="Failed risks" value={report.failedCategories.length.toString()} />
            <ReportMetric icon={<TrendingUp size={20} />} label="Readiness" value={report.readiness} />
          </div>

          <section className="report-band">
            <article>
              <p className="eyebrow">Failed risk categories</p>
              {report.failedCategories.length ? (
                <div className="tag-row large">
                  {report.failedCategories.map((category) => (
                    <span className="fail" key={category}>
                      {riskCategoryLabels[category]}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No failed categories in the latest replay run.</p>
              )}
            </article>
            <article>
              <p className="eyebrow">Improvement recommendations</p>
              <ul className="recommendation-list">
                {report.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="result-table">
            <div className="table-header">
              <span>Test</span>
              <span>Status</span>
              <span>Risk</span>
              <span>Suggested fix</span>
            </div>
            {project.testCases.map((test) => {
              const run = report.latestRuns.find((item) => item.testCaseId === test.id);
              return (
                <article className="table-row" key={test.id}>
                  <span>{test.name}</span>
                  <span className={run?.status === "pass" ? "pass" : run ? "fail" : ""}>
                    {run?.status ?? "not run"}
                  </span>
                  <span>{run?.riskScore ?? "-"}</span>
                  <span>{run?.suggestedFix ?? "Run replay to generate a fix recommendation."}</span>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className="empty-state">
          <h1>No report data</h1>
          <p>Create a project and run a replay from the dashboard.</p>
        </section>
      )}
    </main>
  );
}

function ReportMetric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card report-metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
