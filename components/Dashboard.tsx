"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  FilePlus2,
  GitBranch,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import {
  riskCategories,
  riskCategoryLabels,
  severityLevels,
  type NewProjectInput,
  type NewTestCaseInput,
  type Project,
  type RiskCategory,
  type RunResult,
  type Severity,
  type Workspace
} from "@/lib/types";
import { buildProjectReport, latestRunsByTest } from "@/lib/report";

const emptyProject: NewProjectInput = {
  name: "",
  targetAssistant: "",
  description: ""
};

const emptyTest: NewTestCaseInput = {
  name: "",
  userInput: "",
  untrustedContext: "",
  expectedBehavior: "",
  riskCategory: "prompt-injection",
  severity: "high"
};

const emptyIncident = {
  title: "",
  userInput: "",
  retrievedContext: "",
  actualBadResponse: "",
  expectedSafeBehavior: "",
  severity: "high"
};

type LocalGateAction = "init" | "generate" | "run" | "refresh" | "add-incident";

type IncidentInput = typeof emptyIncident;

type LocalGatePreview = {
  status: {
    configExists: boolean;
    suiteExists: boolean;
    reportExists: boolean;
    configPath: string;
    suitePath: string;
    suiteId: string | null;
    suiteVersionPath: string | null;
    reportPath: string;
    runId: string | null;
    runVersionPath: string | null;
    incidentCount: number;
    usingPreviewSuite: boolean;
    canRun: boolean;
  };
  project: string;
  profile: {
    purpose: string;
    targetUsers: string[];
    dataSources: string[];
    tools: Array<{ name: string; riskLevel?: string; requiresApproval?: boolean }>;
    approvalBoundaries: string[];
    sensitiveData: string[];
    unsupportedTopics: string[];
    requiredGrounding: string[];
  };
  review: {
    fields: Array<{ field: string; source: string; finalValues: string[]; message: string }>;
    warnings: Array<{ field: string; message: string; suggestedAction: string }>;
  };
  context: {
    filesRead: Array<{ path: string; sourceType: string; bytes: number }>;
  };
  riskSurface: Array<{ id: string; category: string; name: string; severity: string; reason: string }>;
  tests: Array<{ id: string; name: string; category: string; severity: string; why: string; detects: string; variantOf?: string }>;
  coverage: Array<{ dimension: string; name: string; status: string; reason: string }>;
  report: {
    readiness: string;
    totalTests: number;
    passRate: number | null;
    riskCoverageScore: number;
    releaseConfidence: number | null;
    recommendations: string[];
    auditSummary: { filesRead: number; filesSkipped: number; filesExcluded: number; filesMissing: number };
  };
  results: Array<{ testId: string; status: string; category: string; riskScore: number; explanation: string; suggestedFix: string }>;
};

function coverageStatusClass(status: string) {
  if (status === "covered") return "pass";
  if (status === "partially-covered") return "warn";
  return "fail";
}

export function Dashboard() {
  const [workspace, setWorkspace] = useState<Workspace>({ projects: [] });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [localGate, setLocalGate] = useState<LocalGatePreview | null>(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [testForm, setTestForm] = useState(emptyTest);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("Ready");

  const selectedProject = useMemo(
    () =>
      workspace.projects.find((project) => project.id === selectedProjectId) ??
      workspace.projects[0],
    [workspace.projects, selectedProjectId]
  );

  const latestRuns = useMemo(
    () => (selectedProject ? latestRunsByTest(selectedProject) : new Map<string, RunResult>()),
    [selectedProject]
  );

  const report = useMemo(
    () => (selectedProject ? buildProjectReport(selectedProject) : null),
    [selectedProject]
  );

  useEffect(() => {
    void loadWorkspace();
    void loadLocalGate();
  }, []);

  useEffect(() => {
    if (!selectedProjectId && workspace.projects.length) {
      setSelectedProjectId(workspace.projects[0].id);
    }
  }, [selectedProjectId, workspace.projects]);

  async function loadWorkspace() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = (await response.json()) as Workspace;
    setWorkspace(data);
  }

  async function loadLocalGate() {
    const response = await fetch("/api/local-gate", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as LocalGatePreview;
    setLocalGate(data);
  }

  async function runLocalGateAction(action: LocalGateAction, payload: Record<string, unknown> = {}) {
    setIsBusy(true);
    setMessage("Working");

    try {
      const response = await fetch("/api/local-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(error.error ?? "Local release gate action failed.");
      }

      const data = (await response.json()) as LocalGatePreview;
      setLocalGate(data);
      setMessage(action === "run" ? "Local gate run complete" : action === "add-incident" ? "Incident regression added" : "Local gate updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function withRefresh(action: () => Promise<void>, success: string) {
    setIsBusy(true);
    setMessage("Working");

    try {
      await action();
      await loadWorkspace();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withRefresh(async () => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm)
      });

      if (!response.ok) {
        throw new Error("Project could not be created.");
      }

      const project = (await response.json()) as Project;
      setSelectedProjectId(project.id);
      setProjectForm(emptyProject);
    }, "Project created");
  }

  async function addTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    await withRefresh(async () => {
      const response = await fetch(`/api/projects/${selectedProject.id}/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testForm)
      });

      if (!response.ok) {
        throw new Error("Test case could not be added.");
      }

      setTestForm(emptyTest);
    }, "Test case added");
  }

  async function importStarterSuite() {
    if (!selectedProject) {
      return;
    }

    await withRefresh(async () => {
      const response = await fetch(`/api/projects/${selectedProject.id}/starter`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Starter suite could not be imported.");
      }
    }, "Starter suite imported");
  }

  async function runReplay(testCaseId?: string) {
    if (!selectedProject) {
      return;
    }

    await withRefresh(async () => {
      const response = await fetch(`/api/projects/${selectedProject.id}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseId })
      });

      if (!response.ok) {
        throw new Error("Replay could not run.");
      }
    }, testCaseId ? "Test replayed" : "Suite replayed");
  }

  return (
    <main className="page dashboard-grid">
      <aside className="workspace-panel">
        <div className="panel-heading">
          <p className="eyebrow">Workflows</p>
          <span className="status-pill">{message}</span>
        </div>
        <div className="project-list">
          {workspace.projects.map((project) => (
            <button
              className={`project-button ${project.id === selectedProject?.id ? "active" : ""}`}
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              type="button"
            >
              <strong>{project.name}</strong>
              <span>{project.testCases.length} tests</span>
            </button>
          ))}
        </div>

        <form className="stacked-form" onSubmit={createProject}>
          <p className="eyebrow">New project</p>
          <label>
            Project name
            <input
              value={projectForm.name}
              onChange={(event) =>
                setProjectForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Checkout agent release gate"
            />
          </label>
          <label>
            Target assistant
            <input
              value={projectForm.targetAssistant}
              onChange={(event) =>
                setProjectForm((current) => ({
                  ...current,
                  targetAssistant: event.target.value
                }))
              }
              placeholder="Agent name or workflow"
            />
          </label>
          <label>
            Description
            <textarea
              value={projectForm.description}
              onChange={(event) =>
                setProjectForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="What needs to be safe before release?"
            />
          </label>
          <button className="primary-action" disabled={isBusy} type="submit">
            <Plus size={17} />
            Create
          </button>
        </form>
      </aside>

      <section className="main-workspace">
        {selectedProject && report ? (
          <>
            <div className="workspace-header">
              <div>
                <p className="eyebrow">{selectedProject.targetAssistant}</p>
                <h1>{selectedProject.name}</h1>
                <p>{selectedProject.description}</p>
              </div>
              <div className="toolbar">
                <button
                  className="secondary-action"
                  disabled={isBusy}
                  onClick={importStarterSuite}
                  title="Import starter risk tests"
                  type="button"
                >
                  <Database size={17} />
                  Starter suite
                </button>
                <button
                  className="primary-action"
                  disabled={isBusy || !selectedProject.testCases.length}
                  onClick={() => runReplay()}
                  title="Run all test cases"
                  type="button"
                >
                  <Play size={17} />
                  Run replay
                </button>
              </div>
            </div>

            <div className="metric-grid">
              <Metric label="Total tests" value={report.totalTests.toString()} />
              <Metric label="Pass rate" value={`${report.passRate}%`} />
              <Metric label="Avg risk" value={report.averageRiskScore.toString()} />
              <Metric label="Readiness" value={report.readiness} />
            </div>

            {localGate ? (
              <LocalGateWorkspace
                isBusy={isBusy}
                onAction={runLocalGateAction}
                preview={localGate}
              />
            ) : null}

            <section className="split-workspace">
              <form className="test-form" onSubmit={addTest}>
                <div className="panel-heading">
                  <p className="eyebrow">Add test case</p>
                  <FilePlus2 size={19} />
                </div>
                <label>
                  Name
                  <input
                    value={testForm.name}
                    onChange={(event) =>
                      setTestForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Model leaks internal ticket notes"
                  />
                </label>
                <div className="form-row">
                  <label>
                    Risk category
                    <select
                      value={testForm.riskCategory}
                      onChange={(event) =>
                        setTestForm((current) => ({
                          ...current,
                          riskCategory: event.target.value as RiskCategory
                        }))
                      }
                    >
                      {riskCategories.map((category) => (
                        <option key={category} value={category}>
                          {riskCategoryLabels[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Severity
                    <select
                      value={testForm.severity}
                      onChange={(event) =>
                        setTestForm((current) => ({
                          ...current,
                          severity: event.target.value as Severity
                        }))
                      }
                    >
                      {severityLevels.map((severity) => (
                        <option key={severity} value={severity}>
                          {severity}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  User input
                  <textarea
                    value={testForm.userInput}
                    onChange={(event) =>
                      setTestForm((current) => ({
                        ...current,
                        userInput: event.target.value
                      }))
                    }
                    placeholder="What the user asks the assistant to do"
                  />
                </label>
                <label>
                  Untrusted context
                  <textarea
                    value={testForm.untrustedContext}
                    onChange={(event) =>
                      setTestForm((current) => ({
                        ...current,
                        untrustedContext: event.target.value
                      }))
                    }
                    placeholder="Retrieved text, tool output, transcript, email, or note"
                  />
                </label>
                <label>
                  Expected behavior
                  <textarea
                    value={testForm.expectedBehavior}
                    onChange={(event) =>
                      setTestForm((current) => ({
                        ...current,
                        expectedBehavior: event.target.value
                      }))
                    }
                    placeholder="The safe and reliable behavior you expect"
                  />
                </label>
                <button className="secondary-action" disabled={isBusy} type="submit">
                  <Plus size={17} />
                  Add test
                </button>
              </form>

              <div className="test-list">
                <div className="panel-heading">
                  <p className="eyebrow">Replay cases</p>
                  <ShieldAlert size={19} />
                </div>
                {selectedProject.testCases.map((test) => {
                  const run = latestRuns.get(test.id);
                  return (
                    <article className="test-card" key={test.id}>
                      <div className="test-card-header">
                        <div>
                          <h2>{test.name}</h2>
                          <div className="tag-row">
                            <span>{riskCategoryLabels[test.riskCategory]}</span>
                            <span>{test.severity}</span>
                            {run ? (
                              <span className={run.status === "pass" ? "pass" : "fail"}>
                                {run.status}
                              </span>
                            ) : (
                              <span>not run</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="icon-action"
                          disabled={isBusy}
                          onClick={() => runReplay(test.id)}
                          title="Replay this test"
                          type="button"
                        >
                          <RefreshCw size={17} />
                        </button>
                      </div>
                      <dl className="case-details">
                        <div>
                          <dt>User input</dt>
                          <dd>{test.userInput}</dd>
                        </div>
                        <div>
                          <dt>Untrusted context</dt>
                          <dd>{test.untrustedContext || "No context supplied."}</dd>
                        </div>
                        <div>
                          <dt>Expected</dt>
                          <dd>{test.expectedBehavior}</dd>
                        </div>
                      </dl>
                      {run ? (
                        <div className="run-result">
                          <div>
                            <span>Risk score</span>
                            <strong>{run.riskScore}</strong>
                          </div>
                          <p><strong>Mock response:</strong> {run.mockedResponse}</p>
                          <p><strong>Why:</strong> {run.explanation}</p>
                          <p><strong>Fix:</strong> {run.suggestedFix}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <div className="empty-state">
            <h1>Create an AI workflow project</h1>
            <p>Add a release gate for an assistant, agent, or LLM workflow.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function LocalGateWorkspace({
  isBusy,
  onAction,
  preview
}: {
  isBusy: boolean;
  onAction: (action: LocalGateAction, payload?: Record<string, unknown>) => Promise<void>;
  preview: LocalGatePreview;
}) {
  const [incidentForm, setIncidentForm] = useState<IncidentInput>(emptyIncident);
  const missingCoverage = preview.coverage.filter((item) => item.status === "missing" || item.status === "unknown");
  const criticalRisks = preview.riskSurface.filter((item) => item.severity === "critical").length;
  const variants = preview.tests.filter((test) => test.variantOf).length;
  const readinessClass = preview.report.readiness === "Do not ship yet"
    ? "readiness-badge fail"
    : preview.report.readiness === "Not run yet"
      ? "readiness-badge warn"
      : "readiness-badge pass";

  async function submitIncident(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAction("add-incident", { incident: incidentForm });
    setIncidentForm(emptyIncident);
  }

  return (
    <section className="local-gate-workspace">
      <div className="local-gate-header">
        <div>
          <p className="eyebrow">Local release gate</p>
          <h2>{preview.project}</h2>
          <p>{preview.profile.purpose}</p>
          <p className="gate-note">
            Showcase mode: this dashboard reads the repo where the app is running. For another AI project, install the CLI and run it from that project root.
          </p>
        </div>
        <span className={readinessClass}>
          {preview.report.readiness}
        </span>
      </div>

      <div className="gate-action-bar">
        <div className="artifact-status">
          <span className={preview.status.configExists ? "pass" : "warn"}>{preview.status.configExists ? "Config ready" : "Config missing"}</span>
          <span className={preview.status.suiteExists ? "pass" : "warn"}>{preview.status.suiteExists ? "Suite saved" : "Preview suite"}</span>
          <span className={preview.status.reportExists ? "pass" : "warn"}>{preview.status.reportExists ? "Report saved" : "Report not run"}</span>
          <span>{preview.status.incidentCount} incidents</span>
          {preview.status.suiteId ? <span title={preview.status.suiteVersionPath ?? preview.status.suitePath}>{preview.status.suiteId}</span> : null}
          {preview.status.runId ? <span title={preview.status.runVersionPath ?? preview.status.reportPath}>{preview.status.runId}</span> : null}
        </div>
        <div className="toolbar">
          <button className="secondary-action" disabled={isBusy} onClick={() => onAction("init")} type="button">
            <FilePlus2 size={17} />
            Initialize
          </button>
          <button className="secondary-action" disabled={isBusy} onClick={() => onAction("generate")} type="button">
            <GitBranch size={17} />
            Generate suite
          </button>
          <button className="primary-action" disabled={isBusy || !preview.status.canRun} onClick={() => onAction("run")} type="button">
            <Play size={17} />
            Run gate
          </button>
          <button className="icon-action" disabled={isBusy} onClick={() => onAction("refresh")} title="Refresh local gate state" type="button">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      <div className="metric-grid compact">
        <Metric label="Generated tests" value={preview.report.totalTests.toString()} />
        <Metric label="Pass rate" value={preview.report.passRate === null ? "-" : `${preview.report.passRate}%`} />
        <Metric label="Coverage" value={`${preview.report.riskCoverageScore}%`} />
        <Metric label="Confidence" value={preview.report.releaseConfidence === null ? "-" : preview.report.releaseConfidence.toString()} />
      </div>

      <div className="gate-panel-grid">
        <article className="gate-panel">
          <div className="panel-heading">
            <p className="eyebrow">Agent profile review</p>
            <ShieldCheck size={18} />
          </div>
          <div className="compact-list">
            {preview.review.fields.slice(0, 7).map((field) => (
              <div key={field.field}>
                <strong>{field.field}</strong>
                <span>{field.source}</span>
              </div>
            ))}
          </div>
          {preview.review.warnings.length ? (
            <p className="gate-note">{preview.review.warnings[0].message}</p>
          ) : null}
        </article>

        <article className="gate-panel">
          <div className="panel-heading">
            <p className="eyebrow">Context discovery</p>
            <Database size={18} />
          </div>
          <div className="compact-list">
            {preview.context.filesRead.slice(0, 5).map((file) => (
              <div key={file.path}>
                <strong>{file.path}</strong>
                <span>{file.sourceType}</span>
              </div>
            ))}
          </div>
          <p className="gate-note">
            {preview.report.auditSummary.filesRead} read, {preview.report.auditSummary.filesExcluded} excluded, {preview.report.auditSummary.filesMissing} missing.
          </p>
        </article>

        <article className="gate-panel">
          <div className="panel-heading">
            <p className="eyebrow">Risk surface</p>
            <AlertTriangle size={18} />
          </div>
          <div className="tag-row">
            <span>{preview.riskSurface.length} mapped</span>
            <span>{criticalRisks} critical</span>
            <span>{missingCoverage.length} gaps</span>
          </div>
          <ul className="gate-list">
            {preview.riskSurface.slice(0, 4).map((risk) => (
              <li key={risk.id}>{risk.name}: {risk.reason}</li>
            ))}
          </ul>
        </article>

        <article className="gate-panel">
          <div className="panel-heading">
            <p className="eyebrow">Generated suite</p>
            <GitBranch size={18} />
          </div>
          <div className="tag-row">
            <span>{preview.tests.length} tests</span>
            <span>{variants} variants</span>
            <span>{preview.status.usingPreviewSuite ? "not saved" : "saved"}</span>
          </div>
          <ul className="gate-list">
            {preview.tests.slice(0, 4).map((test) => (
              <li key={test.id}>{test.name}: {test.why}</li>
            ))}
          </ul>
        </article>

        <article className="gate-panel">
          <div className="panel-heading">
            <p className="eyebrow">Coverage map</p>
            <ShieldAlert size={18} />
          </div>
          <div className="coverage-map">
            {preview.coverage.slice(0, 6).map((coverage) => (
              <div key={`${coverage.dimension}-${coverage.name}`}>
                <span className={coverageStatusClass(coverage.status)}>{coverage.status}</span>
                <strong>{coverage.name}</strong>
                <small>{coverage.dimension}</small>
              </div>
            ))}
          </div>
          <p className="gate-note">
            {missingCoverage.length ? `${missingCoverage.length} gaps need review before release.` : "No missing local coverage in the generated suite."}
          </p>
        </article>
      </div>

      <section className="gate-panel wide">
        <div className="panel-heading">
          <p className="eyebrow">Replay run and release report</p>
          <Play size={18} />
        </div>
        {preview.results.length ? (
          <div className="result-strip">
            {preview.results.slice(0, 5).map((result) => (
            <article key={result.testId}>
              <strong className={result.status === "pass" ? "pass" : "fail"}>{result.status}</strong>
              <span>{result.category}</span>
              <p>{result.explanation}</p>
            </article>
            ))}
          </div>
        ) : (
          <p className="gate-note">
            No persisted replay results yet. Use <strong>Run gate</strong> to execute the suite against the configured local adapter and write {preview.status.reportPath}.
          </p>
        )}
        <ul className="recommendation-list compact-recommendations">
          {preview.report.recommendations.slice(0, 3).map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </section>

      <section className="gate-panel wide">
        <div className="panel-heading">
          <p className="eyebrow">Incident intake</p>
          <FilePlus2 size={18} />
        </div>
        <form className="incident-form" onSubmit={submitIncident}>
          <label>
            Incident title
            <input
              required
              value={incidentForm.title}
              onChange={(event) => setIncidentForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Agent leaked a private note"
            />
          </label>
          <label>
            User input
            <textarea
              required
              value={incidentForm.userInput}
              onChange={(event) => setIncidentForm((current) => ({ ...current, userInput: event.target.value }))}
              placeholder="What did the user ask?"
            />
          </label>
          <label>
            Retrieved or untrusted context
            <textarea
              required
              value={incidentForm.retrievedContext}
              onChange={(event) => setIncidentForm((current) => ({ ...current, retrievedContext: event.target.value }))}
              placeholder="What context contributed to the failure?"
            />
          </label>
          <label>
            Actual bad response
            <textarea
              required
              value={incidentForm.actualBadResponse}
              onChange={(event) => setIncidentForm((current) => ({ ...current, actualBadResponse: event.target.value }))}
              placeholder="What did the agent do wrong?"
            />
          </label>
          <label>
            Expected safe behavior
            <textarea
              required
              value={incidentForm.expectedSafeBehavior}
              onChange={(event) => setIncidentForm((current) => ({ ...current, expectedSafeBehavior: event.target.value }))}
              placeholder="What should the agent do instead?"
            />
          </label>
          <div className="form-row">
            <label>
              Severity
              <select
                value={incidentForm.severity}
                onChange={(event) => setIncidentForm((current) => ({ ...current, severity: event.target.value }))}
              >
                {severityLevels.map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </label>
            <button className="primary-action" disabled={isBusy} type="submit">
              <FilePlus2 size={17} />
              Add regression
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
