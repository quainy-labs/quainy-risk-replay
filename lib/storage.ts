import { promises as fs } from "fs";
import path from "path";
import type { Workspace } from "./types";

const dataDirectory = path.join(process.cwd(), "data");
const workspacePath = path.join(dataDirectory, "projects.json");

async function ensureWorkspaceFile() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(workspacePath);
  } catch {
    await fs.writeFile(workspacePath, JSON.stringify({ projects: [] }, null, 2));
  }
}

export async function readWorkspace(): Promise<Workspace> {
  await ensureWorkspaceFile();
  const raw = await fs.readFile(workspacePath, "utf8");
  return JSON.parse(raw) as Workspace;
}

export async function writeWorkspace(workspace: Workspace) {
  await ensureWorkspaceFile();
  await fs.writeFile(workspacePath, JSON.stringify(workspace, null, 2));
}
