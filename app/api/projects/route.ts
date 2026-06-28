import { NextResponse } from "next/server";
import { readWorkspace, writeWorkspace } from "@/lib/storage";
import type { NewProjectInput, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspace = await readWorkspace();
  return NextResponse.json(workspace);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<NewProjectInput>;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const workspace = await readWorkspace();
  const project: Project = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    description: body.description?.trim() || "AI workflow safety replay project.",
    targetAssistant: body.targetAssistant?.trim() || "Untitled assistant",
    createdAt: new Date().toISOString(),
    testCases: [],
    runs: []
  };

  workspace.projects.unshift(project);
  await writeWorkspace(workspace);

  return NextResponse.json(project, { status: 201 });
}
