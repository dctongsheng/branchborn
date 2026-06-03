import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/branchborn/store";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";

export async function GET(request: Request) {
  try {
    const user = await requireBranchbornUser();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") || 0);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 40);
    return NextResponse.json({ projects: await listProjects(user.id, offset, limit) });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireBranchbornUser();
    const body = await request.json().catch(() => ({}));
    const project = await createProject(user.id, body.name?.trim() || "Untitled");
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}
