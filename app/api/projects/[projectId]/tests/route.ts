import { NextResponse } from "next/server";
import { readWorkspace, writeWorkspace } from "@/lib/storage";
import { riskCategories, severityLevels, type NewTestCaseInput, type TestCase } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const body = (await request.json()) as Partial<NewTestCaseInput>;
  const workspace = await readWorkspace();
  const project = workspace.projects.find((item) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (
    !body.name?.trim() ||
    !body.userInput?.trim() ||
    !body.expectedBehavior?.trim() ||
    !body.riskCategory ||
    !riskCategories.includes(body.riskCategory) ||
    !body.severity ||
    !severityLevels.includes(body.severity)
  ) {
    return NextResponse.json({ error: "A complete test case is required." }, { status: 400 });
  }

  const testCase: TestCase = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    userInput: body.userInput.trim(),
    untrustedContext: body.untrustedContext?.trim() || "",
    expectedBehavior: body.expectedBehavior.trim(),
    riskCategory: body.riskCategory,
    severity: body.severity,
    createdAt: new Date().toISOString()
  };

  project.testCases.unshift(testCase);
  await writeWorkspace(workspace);

  return NextResponse.json(testCase, { status: 201 });
}
