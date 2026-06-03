import { validateGenerationOptions } from "@/lib/branchborn/constants";
import { isErnieImageConfigured } from "@/lib/branchborn/ernie";
import { createKieTask, isImageApiConfigured, providerModel } from "@/lib/branchborn/kie";
import { addMessage, addTask, countActiveTasks, getProject, updateProject } from "@/lib/branchborn/store";
import type { GenerationTask, ModelId } from "@/lib/branchborn/types";

export interface CreateGenerationTaskInput {
  owner: string;
  projectId: string;
  prompt: string;
  model?: ModelId;
  aspectRatio?: string;
  resolution?: string;
  referenceAssetIds?: string[];
  messageId?: string;
  persistUserMessage?: boolean;
}

export async function createGenerationTask({
  owner,
  projectId,
  prompt: rawPrompt,
  model = "gpt-image-2",
  aspectRatio = "auto",
  resolution = "1K",
  referenceAssetIds: rawReferenceAssetIds = [],
  messageId,
  persistUserMessage = true,
}: CreateGenerationTaskInput) {
  const project = await getProject(owner, projectId);
  if (!project) throw new Error("项目不存在");
  if ((await countActiveTasks(owner)) >= 2) throw new Error("最多同时进行 2 个生图任务，请稍后再试");
  const prompt = rawPrompt.trim();
  if (!prompt) throw new Error("请输入生图需求");
  validateGenerationOptions(model, aspectRatio, resolution);
  const referenceAssetIds = rawReferenceAssetIds.slice(0, 8);
  if (model === "ernie-image" && referenceAssetIds.length) throw new Error("ERNIE Image 首版仅支持文生图，请移除参考图片");
  const allAssets = project.assets ?? [];
  if (referenceAssetIds.some((id) => !allAssets.some((asset) => asset.id === id))) throw new Error("参考图片不存在");
  const sourceMessage = persistUserMessage
    ? await addMessage(owner, projectId, "user", prompt, { model, aspectRatio, resolution, referenceAssetIds })
    : undefined;
  if (project.name === "Untitled") await updateProject(owner, projectId, { name: prompt.slice(0, 28) });
  const hasReferences = referenceAssetIds.length > 0;
  const task: GenerationTask = {
    id: crypto.randomUUID(),
    project_id: projectId,
    message_id: messageId || sourceMessage?.id,
    provider: model === "ernie-image"
      ? (isErnieImageConfigured() ? "tokendance" : "demo")
      : (isImageApiConfigured() ? "kie.ai" : "demo"),
    model: providerModel(model, hasReferences),
    task_type: hasReferences ? "image_to_image" : "text_to_image",
    status: "queued",
    prompt,
    parameters: { model, aspectRatio, resolution, referenceAssetIds },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await addTask(task);
  if (model !== "ernie-image" && isImageApiConfigured()) {
    const referenceAssets = allAssets.filter((asset) => referenceAssetIds.includes(asset.id));
    await createKieTask(task, referenceAssets);
  }
  return task;
}
