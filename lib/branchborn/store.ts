import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Asset, CanvasNodeRecord, GenerationTask, Message, Project, Store } from "@/lib/branchborn/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "branchborn.json");
const EMPTY_STORE: Store = { projects: [], messages: [], canvas_nodes: [], generation_tasks: [], assets: [] };

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your-"),
  );
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function claimGuestProjects(guestSessionHash: string, userId: string) {
  if (isSupabaseConfigured()) {
    const { error } = await serviceClient()
      .from("projects")
      .update({ user_id: userId, guest_session_hash: null, updated_at: new Date().toISOString() })
      .eq("guest_session_hash", guestSessionHash);
    if (error) throw error;
    return;
  }
  const store = await readStore();
  store.projects
    .filter((item) => item.guest_session_hash === guestSessionHash)
    .forEach((item) => {
      item.user_id = userId;
      item.guest_session_hash = null;
      item.updated_at = new Date().toISOString();
    });
  await writeStore(store);
}

async function readStore(): Promise<Store> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as Store;
  } catch {
    await writeStore(EMPTY_STORE);
    return structuredClone(EMPTY_STORE);
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function withRelations(project: Project, store: Store): Project {
  const assets = store.assets.filter((item) => item.project_id === project.id).map(withAssetUrl);
  return {
    ...project,
    cover: assets.find((item) => item.id === project.cover_asset_id),
    assets,
    messages: store.messages.filter((item) => item.project_id === project.id),
    canvas_nodes: store.canvas_nodes
      .filter((item) => item.project_id === project.id)
      .map((node) => ({ ...node, asset: assets.find((asset) => asset.id === node.asset_id) })),
    generation_tasks: store.generation_tasks.filter((item) => item.project_id === project.id),
  };
}

export function withAssetUrl(asset: Asset): Asset {
  return { ...asset, url: `/api/assets/${asset.id}` };
}

export async function listProjects(owner: string, offset = 0, limit = 20) {
  if (isSupabaseConfigured()) {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*, cover:assets!projects_cover_asset_id_fkey(*)")
      .eq("user_id", owner)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []).map((project) => ({ ...project, cover: project.cover ? withAssetUrl(project.cover) : undefined }));
  }
  const store = await readStore();
  return store.projects
    .filter((item) => item.user_id === owner)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(offset, offset + limit)
    .map((project) => withRelations(project, store));
}

export async function getProject(owner: string, id: string) {
  if (isSupabaseConfigured()) {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*, messages(*), assets!assets_project_id_fkey(*), canvas_nodes(*, asset:assets(*)), generation_tasks(*)")
      .eq("id", id)
      .eq("user_id", owner)
      .single();
    if (error) return null;
    return {
      ...data,
      assets: data.assets.map(withAssetUrl),
      canvas_nodes: data.canvas_nodes.map((node: CanvasNodeRecord) => ({
        ...node,
        asset: node.asset ? withAssetUrl(node.asset) : undefined,
      })),
    } as Project;
  }
  const store = await readStore();
  const project = store.projects.find((item) => item.id === id && item.user_id === owner);
  return project ? withRelations(project, store) : null;
}

export async function createProject(owner: string, name = "Untitled") {
  const project: Project = {
    id: crypto.randomUUID(),
    user_id: owner,
    guest_session_hash: null,
    name,
    viewport: { x: 0, y: 0, zoom: 1 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (isSupabaseConfigured()) {
    const { data, error } = await serviceClient().from("projects").insert(project).select().single();
    if (error) throw error;
    return data as Project;
  }
  const store = await readStore();
  store.projects.push(project);
  await writeStore(store);
  return project;
}

export async function updateProject(owner: string, id: string, patch: Partial<Pick<Project, "name" | "viewport">>) {
  const updated_at = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { data, error } = await serviceClient()
      .from("projects")
      .update({ ...patch, updated_at })
      .eq("id", id)
      .eq("user_id", owner)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  }
  const store = await readStore();
  const project = store.projects.find((item) => item.id === id && item.user_id === owner);
  if (!project) return null;
  Object.assign(project, patch, { updated_at });
  await writeStore(store);
  return project;
}

export async function setProjectCover(id: string, cover_asset_id: string) {
  const updated_at = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { error } = await serviceClient().from("projects").update({ cover_asset_id, updated_at }).eq("id", id);
    if (error) throw error;
    return;
  }
  const store = await readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return;
  Object.assign(project, { cover_asset_id, updated_at });
  await writeStore(store);
}

export async function deleteProject(owner: string, id: string) {
  if (isSupabaseConfigured()) {
    const { error } = await serviceClient().from("projects").delete().eq("id", id).eq("user_id", owner);
    if (error) throw error;
    return;
  }
  const store = await readStore();
  if (!store.projects.some((item) => item.id === id && item.user_id === owner)) return;
  store.projects = store.projects.filter((item) => item.id !== id);
  store.messages = store.messages.filter((item) => item.project_id !== id);
  store.canvas_nodes = store.canvas_nodes.filter((item) => item.project_id !== id);
  store.generation_tasks = store.generation_tasks.filter((item) => item.project_id !== id);
  store.assets = store.assets.filter((item) => item.project_id !== id);
  await writeStore(store);
}

export async function saveNodes(owner: string, projectId: string, nodes: CanvasNodeRecord[]) {
  const project = await getProject(owner, projectId);
  if (!project) throw new Error("项目不存在");
  const updated_at = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = serviceClient();
    await supabase.from("canvas_nodes").delete().eq("project_id", projectId);
    if (nodes.length) {
      const cleanNodes = nodes.map((node) => {
        const copy = { ...node };
        delete copy.asset;
        return copy;
      });
      const { error } = await supabase.from("canvas_nodes").insert(cleanNodes);
      if (error) throw error;
    }
    await supabase.from("projects").update({ updated_at }).eq("id", projectId);
    return;
  }
  const store = await readStore();
  store.canvas_nodes = store.canvas_nodes.filter((node) => node.project_id !== projectId).concat(nodes);
  const storedProject = store.projects.find((item) => item.id === projectId)!;
  storedProject.updated_at = updated_at;
  await writeStore(store);
}

export async function addMessage(owner: string, projectId: string, role: Message["role"], content: string, metadata = {}) {
  if (!(await getProject(owner, projectId))) throw new Error("项目不存在");
  const message: Message = {
    id: crypto.randomUUID(),
    project_id: projectId,
    role,
    content,
    metadata,
    created_at: new Date().toISOString(),
  };
  if (isSupabaseConfigured()) {
    const { error } = await serviceClient().from("messages").insert(message);
    if (error) throw error;
  } else {
    const store = await readStore();
    store.messages.push(message);
    await writeStore(store);
  }
  return message;
}

export async function addTask(task: GenerationTask) {
  if (isSupabaseConfigured()) {
    const { error } = await serviceClient().from("generation_tasks").insert(task);
    if (error) throw error;
  } else {
    const store = await readStore();
    store.generation_tasks.push(task);
    await writeStore(store);
  }
  return task;
}

export async function getTask(owner: string, id: string) {
  const projectIds = (await listProjects(owner, 0, 1000)).map((item) => item.id);
  if (isSupabaseConfigured()) {
    const { data } = await serviceClient().from("generation_tasks").select("*").eq("id", id).in("project_id", projectIds).single();
    return data as GenerationTask | null;
  }
  return (await readStore()).generation_tasks.find((item) => item.id === id && projectIds.includes(item.project_id)) ?? null;
}

export async function updateTask(id: string, patch: Partial<GenerationTask>) {
  const updated_at = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { data, error } = await serviceClient().from("generation_tasks").update({ ...patch, updated_at }).eq("id", id).select().single();
    if (error) throw error;
    return data as GenerationTask;
  }
  const store = await readStore();
  const task = store.generation_tasks.find((item) => item.id === id);
  if (!task) throw new Error("任务不存在");
  Object.assign(task, patch, { updated_at });
  await writeStore(store);
  return task;
}

export async function claimTaskCompletion(id: string) {
  if (isSupabaseConfigured()) {
    const { data, error } = await serviceClient()
      .from("generation_tasks")
      .update({ status: "succeeded", updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["queued", "processing"])
      .select("id");
    if (error) throw error;
    return Boolean(data?.length);
  }
  return true;
}

export async function claimTaskProcessing(id: string) {
  if (isSupabaseConfigured()) {
    const { data, error } = await serviceClient()
      .from("generation_tasks")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued")
      .select("id");
    if (error) throw error;
    return Boolean(data?.length);
  }
  const store = await readStore();
  const task = store.generation_tasks.find((item) => item.id === id && item.status === "queued");
  if (!task) return false;
  task.status = "processing";
  task.updated_at = new Date().toISOString();
  await writeStore(store);
  return true;
}

export async function countActiveTasks(owner: string) {
  if (isSupabaseConfigured()) {
    const { count, error } = await serviceClient()
      .from("generation_tasks")
      .select("project:projects!inner(user_id)", { count: "exact", head: true })
      .eq("project.user_id", owner)
      .in("status", ["queued", "processing"]);
    if (error) throw error;
    return count ?? 0;
  }
  const projects = await listProjects(owner, 0, 1000);
  return projects.flatMap((item) => item.generation_tasks ?? []).filter((item) => ["queued", "processing"].includes(item.status)).length;
}

export async function findTaskByProviderId(providerTaskId: string) {
  if (isSupabaseConfigured()) {
    const { data } = await serviceClient()
      .from("generation_tasks")
      .select("*, project:projects!inner(user_id)")
      .eq("provider_task_id", providerTaskId)
      .single();
    return data ? { task: data as GenerationTask, owner: data.project.user_id as string } : null;
  }
  const store = await readStore();
  const task = store.generation_tasks.find((item) => item.provider_task_id === providerTaskId);
  if (!task) return null;
  return { task, owner: store.projects.find((item) => item.id === task.project_id)!.user_id! };
}

export async function addAsset(owner: string, asset: Asset, bytes?: Uint8Array) {
  if (!(await getProject(owner, asset.project_id))) throw new Error("项目不存在");
  if (isSupabaseConfigured()) {
    if (!bytes) throw new Error("缺少图片内容");
    const supabase = serviceClient();
    const { error: uploadError } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || "ai-images").upload(asset.storage_path, bytes, {
      contentType: asset.mime_type,
    });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("assets").insert(asset);
    if (error) throw error;
    return withAssetUrl(asset);
  }
  if (bytes) {
    await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, "uploads", asset.id), bytes);
  }
  const store = await readStore();
  store.assets.push(asset);
  await writeStore(store);
  return withAssetUrl(asset);
}

export async function getAsset(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = serviceClient();
    const { data: asset } = await supabase.from("assets").select("*").eq("id", id).single();
    if (!asset) return null;
    const { data } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET || "ai-images").createSignedUrl(asset.storage_path, 600);
    return { asset: asset as Asset, redirect: data?.signedUrl };
  }
  const asset = (await readStore()).assets.find((item) => item.id === id);
  if (!asset) return null;
  if (asset.storage_path.startsWith("demo:")) return { asset, demo: true };
  try {
    return { asset, bytes: await fs.readFile(path.join(DATA_DIR, "uploads", asset.id)) };
  } catch {
    return null;
  }
}

export async function getOwnedAsset(owner: string, id: string) {
  const result = await getAsset(id);
  if (!result || !(await getProject(owner, result.asset.project_id))) return null;
  return result;
}

export async function completeDemoTask(task: GenerationTask) {
  const store = await readStore();
  const current = store.generation_tasks.find((item) => item.id === task.id);
  if (!current || current.status === "succeeded") return current ?? task;
  const asset: Asset = {
    id: crypto.randomUUID(),
    project_id: task.project_id,
    asset_type: "generated_image",
    storage_path: `demo:${encodeURIComponent(task.prompt)}`,
    mime_type: "image/svg+xml",
    file_size: 0,
    created_at: new Date().toISOString(),
  };
  const now = new Date().toISOString();
  const index = store.canvas_nodes.filter((node) => node.project_id === task.project_id).length;
  store.assets.push(asset);
  store.canvas_nodes.push({
    id: crypto.randomUUID(),
    project_id: task.project_id,
    node_type: "generated_image",
    position: { x: 80 + index * 36, y: 80 + index * 36 },
    size: { width: 420, height: 420 },
    asset_id: asset.id,
    metadata: { prompt: task.prompt },
    created_at: now,
    updated_at: now,
  });
  current.status = "succeeded";
  current.updated_at = now;
  store.messages.push({
    id: crypto.randomUUID(),
    project_id: task.project_id,
    role: "agent",
    content: "图片已经生成，并添加到了画布。",
    metadata: { taskId: task.id, assetId: asset.id },
    created_at: now,
  });
  const project = store.projects.find((item) => item.id === task.project_id)!;
  project.cover_asset_id = asset.id;
  project.updated_at = now;
  await writeStore(store);
  return current;
}
