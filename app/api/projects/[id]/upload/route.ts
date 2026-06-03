import path from "path";
import { NextResponse } from "next/server";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, MAX_FILE_SIZE } from "@/lib/branchborn/constants";
import { addAsset, getProject, saveNodes } from "@/lib/branchborn/store";
import type { Asset, CanvasNodeRecord } from "@/lib/branchborn/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const projectId = (await params).id;
    const project = await getProject(user.id, projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    const mode = form.get("mode") === "canvas" ? "canvas" : "reference";
    if (!files.length || files.length > MAX_FILES) throw new Error(`每次最多上传 ${MAX_FILES} 张图片`);
    const uploaded: Asset[] = [];
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error("仅支持 JPG、PNG 和 WebP 图片");
      if (file.size > MAX_FILE_SIZE) throw new Error("单张图片不能超过 10 MB");
      const id = crypto.randomUUID();
      const ext = path.extname(file.name).toLowerCase() || ".jpg";
      const asset: Asset = {
        id,
        project_id: projectId,
        asset_type: mode === "canvas" ? "uploaded_image" : "reference_image",
        storage_path: `projects/${projectId}/${id}/image${ext}`,
        mime_type: file.type,
        file_size: file.size,
        created_at: new Date().toISOString(),
      };
      uploaded.push(await addAsset(user.id, asset, new Uint8Array(await file.arrayBuffer())));
    }
    if (mode === "canvas") {
      const now = new Date().toISOString();
      const nodes = [...(project.canvas_nodes ?? [])];
      uploaded.forEach((asset, index) => {
        nodes.push({
          id: crypto.randomUUID(),
          project_id: projectId,
          node_type: "uploaded_image",
          position: { x: 120 + (nodes.length + index) * 28, y: 120 + (nodes.length + index) * 28 },
          size: { width: 360, height: 360 },
          asset_id: asset.id,
          metadata: {},
          created_at: now,
          updated_at: now,
        } satisfies CanvasNodeRecord);
      });
      await saveNodes(user.id, projectId, nodes);
    }
    return NextResponse.json({ assets: uploaded });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 400 });
  }
}
