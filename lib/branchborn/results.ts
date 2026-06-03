import path from "path";
import type { Asset, CanvasNodeRecord, GenerationTask } from "@/lib/branchborn/types";
import { addAsset, addMessage, claimTaskCompletion, getProject, saveNodes, setProjectCover, updateTask } from "@/lib/branchborn/store";

export async function completeGeneratedUrls(owner: string, task: GenerationTask, urls: string[]) {
  if (!urls.length) throw new Error("生图服务没有返回结果图片");
  if (!(await claimTaskCompletion(task.id))) return task;
  try {
    const project = await getProject(owner, task.project_id);
    if (!project) throw new Error("项目不存在");
    const now = new Date().toISOString();
    const nextNodes = [...(project.canvas_nodes ?? [])];
    let firstAsset: Asset | undefined;
    for (const [index, url] of urls.entries()) {
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) throw new Error("下载生成图片失败");
      const mime = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const id = crypto.randomUUID();
      const extension = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : path.extname(new URL(url).pathname) || ".jpg";
      const asset: Asset = {
        id,
        project_id: task.project_id,
        asset_type: "generated_image",
        storage_path: `projects/${task.project_id}/${id}/generated${extension}`,
        mime_type: mime,
        file_size: Number(imageResponse.headers.get("content-length") || 0),
        created_at: now,
      };
      const saved = await addAsset(owner, asset, new Uint8Array(await imageResponse.arrayBuffer()));
      firstAsset ??= saved;
      nextNodes.push({
        id: crypto.randomUUID(),
        project_id: task.project_id,
        node_type: "generated_image",
        position: { x: 100 + (nextNodes.length + index) * 34, y: 100 + (nextNodes.length + index) * 34 },
        size: { width: 420, height: 420 },
        asset_id: saved.id,
        metadata: { prompt: task.prompt },
        created_at: now,
        updated_at: now,
      } satisfies CanvasNodeRecord);
    }
    await saveNodes(owner, task.project_id, nextNodes);
    if (firstAsset) await setProjectCover(task.project_id, firstAsset.id);
    await addMessage(owner, task.project_id, "agent", "图片已经生成，并添加到了画布。", { taskId: task.id });
    return updateTask(task.id, { status: "succeeded" });
  } catch (error) {
    await updateTask(task.id, { status: "failed", error_message: error instanceof Error ? error.message : "结果转存失败" });
    throw error;
  }
}
