import { NextResponse } from "next/server";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { createGenerationTask } from "@/lib/branchborn/generation";
import type { ModelId } from "@/lib/branchborn/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const projectId = (await params).id;
    const body = await request.json();
    const task = await createGenerationTask({
      owner: user.id,
      projectId,
      prompt: String(body.prompt || ""),
      model: (body.model || "gpt-image-2") as ModelId,
      aspectRatio: body.aspectRatio || "auto",
      resolution: body.resolution || "1K",
      referenceAssetIds: Array.isArray(body.referenceAssetIds) ? body.referenceAssetIds : [],
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建任务失败" }, { status: 400 });
  }
}
