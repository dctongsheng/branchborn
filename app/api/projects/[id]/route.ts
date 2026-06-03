import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/branchborn/store";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const project = await getProject(user.id, (await params).id);
    return project ? NextResponse.json({ project }) : NextResponse.json({ error: "项目不存在" }, { status: 404 });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const body = await request.json();
    const patch = {
      ...(typeof body.name === "string" ? { name: body.name.trim() || "Untitled" } : {}),
      ...(body.viewport ? { viewport: body.viewport } : {}),
    };
    const project = await updateProject(user.id, (await params).id, patch);
    return project ? NextResponse.json({ project }) : NextResponse.json({ error: "项目不存在" }, { status: 404 });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    await deleteProject(user.id, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}
