import { NextResponse } from "next/server";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { completeDemoTask, getTask, updateTask } from "@/lib/branchborn/store";
import { pollKieTask } from "@/lib/branchborn/kie";
import { createErnieImage } from "@/lib/branchborn/ernie";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    let task = await getTask(user.id, (await params).id);
    if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    if (task.provider === "demo" && task.status !== "succeeded") {
      const age = Date.now() - new Date(task.created_at).getTime();
      task = age > 1200 ? await completeDemoTask(task) : await updateTask(task.id, { status: "processing" });
    }
    if (task.provider === "kie.ai" && task.status !== "succeeded" && task.status !== "failed") {
      task = await pollKieTask(user.id, task);
    }
    if (task.provider === "tokendance" && task.status !== "succeeded" && task.status !== "failed") {
      task = await createErnieImage(user.id, task);
    }
    return NextResponse.json({ task });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}
