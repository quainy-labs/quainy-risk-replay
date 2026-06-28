import { NextResponse } from "next/server";
import { runMockReplay } from "@/lib/mockRunner";
import { readWorkspace, writeWorkspace } from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { testCaseId?: string };
  const workspace = await readWorkspace();
  const project = workspace.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const tests = body.testCaseId
    ? project.testCases.filter((test) => test.id === body.testCaseId)
    : project.testCases;

  if (!tests.length) {
    return NextResponse.json({ error: "No matching tests to replay." }, { status: 400 });
  }

  const results = tests.map(runMockReplay);
  project.runs.push(...results);
  await writeWorkspace(workspace);

  return NextResponse.json({ results, project });
}
