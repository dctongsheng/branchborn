import type { Asset, GenerationTask, ModelId } from "@/lib/branchborn/types";
import { getAsset, updateTask } from "@/lib/branchborn/store";
import { completeGeneratedUrls } from "@/lib/branchborn/results";

const API_BASE = process.env.IMAGE_API_BASE_URL || "https://api.kie.ai";

function kieHeaders() {
  return { Authorization: `Bearer ${process.env.IMAGE_API_KEY}`, "Content-Type": "application/json" };
}

export function isImageApiConfigured() {
  return Boolean(process.env.IMAGE_API_KEY && !process.env.IMAGE_API_KEY.includes("your-"));
}

export function providerModel(model: ModelId, hasReferences: boolean) {
  if (model === "nano-banana-2") return "nano-banana-2";
  if (model === "ernie-image") return "ernie-image";
  return hasReferences ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image";
}

export async function createKieTask(task: GenerationTask, references: Asset[]) {
  const signedUrls = await Promise.all(
    references.map(async (asset) => {
      const result = await getAsset(asset.id);
      if (!result || !("redirect" in result) || !result.redirect) throw new Error("无法为参考图创建访问地址");
      return result.redirect;
    }),
  );
  const input: Record<string, unknown> = {
    prompt: task.prompt,
    aspect_ratio: task.parameters.aspectRatio,
    resolution: task.parameters.resolution,
  };
  if (signedUrls.length) {
    input[task.parameters.model === "nano-banana-2" ? "image_input" : "input_urls"] = signedUrls;
  }
  if (task.parameters.model === "nano-banana-2") input.output_format = "png";
  const response = await fetch(`${API_BASE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: kieHeaders(),
    body: JSON.stringify({
      model: task.model,
      callBackUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/webhooks/kie-ai` : undefined,
      input,
    }),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200 || !result.data?.taskId) {
    throw new Error(result.msg || "生图服务暂时不可用");
  }
  return updateTask(task.id, { provider_task_id: result.data.taskId, status: "processing" });
}

export async function pollKieTask(owner: string, task: GenerationTask) {
  if (!task.provider_task_id) return task;
  const response = await fetch(`${API_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(task.provider_task_id)}`, {
    headers: kieHeaders(),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200) throw new Error(result.msg || "查询任务状态失败");
  const state = result.data?.state;
  if (["waiting", "queuing"].includes(state)) return updateTask(task.id, { status: "queued" });
  if (state === "generating") return updateTask(task.id, { status: "processing" });
  if (state === "fail") return updateTask(task.id, { status: "failed", error_message: result.data?.failMsg || "生成失败" });
  if (state !== "success" || task.status === "succeeded") return task;
  const parsed = typeof result.data.resultJson === "string" ? JSON.parse(result.data.resultJson) : result.data.resultJson;
  const urls = parsed?.resultUrls ?? [];
  return completeGeneratedUrls(owner, task, urls);
}
