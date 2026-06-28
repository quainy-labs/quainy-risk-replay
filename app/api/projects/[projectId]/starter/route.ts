import { NextResponse } from "next/server";
import { buildStarterTests } from "@/lib/starterSuites";
import { readWorkspace, writeWorkspace } from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const workspace = await readWorkspace();
  const project = workspace.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const existingNames = new Set(project.testCases.map((test) => test.name));
  const newTests = buildStarterTests().filter((test) => !existingNames.has(test.name));
  project.testCases.push(...newTests);

  await writeWorkspace(workspace);

  return NextResponse.json({ added: newTests.length, project });
}
