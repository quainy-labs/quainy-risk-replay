"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database,
  FilePlus2,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert
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

export function Dashboard() {
  const [workspace, setWorkspace] = useState<Workspace>({ projects: [] });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
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
