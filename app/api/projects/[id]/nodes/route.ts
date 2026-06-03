import { NextResponse } from "next/server";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { saveNodes } from "@/lib/branchborn/store";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const { nodes } = await request.json();
    await saveNodes(user.id, (await params).id, nodes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
