import type { GenerationTask } from "@/lib/branchborn/types";
import { claimTaskProcessing, updateTask } from "@/lib/branchborn/store";
import { completeGeneratedUrls } from "@/lib/branchborn/results";
import { isTokendanceConfigured, tokendanceApiBase, tokendanceApiKey } from "@/lib/branchborn/tokendance";

export function isErnieImageConfigured() {
  return isTokendanceConfigured();
}

export async function createErnieImage(owner: string, task: GenerationTask) {
  if (!(await claimTaskProcessing(task.id))) return task;
  try {
    const response = await fetch(`${tokendanceApiBase()}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokendanceApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ernie-image",
        prompt: task.prompt,
        n: 1,
        size: "1024x1024",
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || result.message || "ERNIE Image 服务暂时不可用");
    const urls = Array.isArray(result.data) ? result.data.map((item: { url?: string }) => item.url).filter(Boolean) : [];
    return completeGeneratedUrls(owner, task, urls);
  } catch (error) {
    await updateTask(task.id, { status: "failed", error_message: error instanceof Error ? error.message : "ERNIE Image 生成失败" });
    throw error;
  }
}
