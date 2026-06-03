"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, ChevronLeft, ImagePlus, Loader2, PanelRightClose, Trash2 } from "lucide-react";
import { Logo } from "@/components/branchborn/logo";
import { AccountMenu } from "@/components/branchborn/account-menu";
import { COMPOSER_MODE_STORAGE_KEY, PromptComposer, type ComposerMode, type ComposerValue } from "@/components/branchborn/prompt-composer";
import { jsonOrLogin } from "@/lib/branchborn/client-auth";
import type { Asset, CanvasNodeRecord, GenerationTask, Message, Project } from "@/lib/branchborn/types";

type ImageFlowNode = Node<{ asset: Asset; record: CanvasNodeRecord }, "image">;

function ImageNode({ data, selected }: NodeProps<ImageFlowNode>) {
  return (
    <div className={`overflow-hidden rounded-xl bg-white shadow-lg ring-2 ${selected ? "ring-stone-900" : "ring-white"}`}>
      {/* Private asset URLs are served by an authenticated API route, so Next image optimization is not appropriate here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.asset.url} alt="" draggable={false} className="h-full w-full object-cover" />
    </div>
  );
}

const nodeTypes = { image: ImageNode };

function toFlowNode(record: CanvasNodeRecord): ImageFlowNode {
  return {
    id: record.id,
    type: "image",
    position: record.position,
    data: { asset: record.asset!, record },
    style: record.size,
  };
}

function CanvasWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ImageFlowNode>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("agent");
  const [streamUserMessage, setStreamUserMessage] = useState("");
  const [streamAgentMessage, setStreamAgentMessage] = useState("");
  const [agentStatus, setAgentStatus] = useState("");
  const [agentError, setAgentError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const canvasFileRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const { setViewport } = useReactFlow();

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    if (response.status === 401) {
      await jsonOrLogin(response);
      return;
    }
    if (!response.ok) return;
    const next = (await jsonOrLogin(response)).project as Project;
    setProject(next);
    setMessages(next.messages ?? []);
    setTasks(next.generation_tasks ?? []);
    setNodes((next.canvas_nodes ?? []).filter((item) => item.asset).map(toFlowNode));
    if (!initialized.current) {
      initialized.current = true;
      setViewport(next.viewport ?? { x: 0, y: 0, zoom: 1 });
    }
  }, [projectId, setNodes, setViewport]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const saved = localStorage.getItem(COMPOSER_MODE_STORAGE_KEY);
    if (saved === "agent" || saved === "direct") setComposerMode(saved);
  }, []);
  useEffect(() => {
    if (!tasks.some((task) => task.status === "queued" || task.status === "processing")) return;
    const timer = setInterval(async () => {
      await Promise.all(tasks.filter((task) => ["queued", "processing"].includes(task.status)).map((task) => fetch(`/api/tasks/${task.id}`)));
      await load();
    }, 1400);
    return () => clearInterval(timer);
  }, [load, tasks]);

  async function upload(files: File[], mode = "reference") {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("mode", mode);
    const response = await fetch(`/api/projects/${projectId}/upload`, { method: "POST", body: form });
    const data = await jsonOrLogin(response);
    if (!response.ok) throw new Error(data.error);
    if (mode === "canvas") await load();
    return data.assets as Asset[];
  }

  async function generate(value: ComposerValue) {
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, referenceAssetIds: value.referenceAssets.map((asset) => asset.id) }),
      });
      const data = await jsonOrLogin(response);
      if (!response.ok) throw new Error(data.error);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendAgent(value: ComposerValue) {
    setBusy(true);
    setStreamUserMessage(value.prompt);
    setStreamAgentMessage("");
    setAgentStatus("Agent 正在思考...");
    setAgentError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, referenceAssetIds: value.referenceAssets.map((asset) => asset.id) }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Agent 服务暂时不可用");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        buffer += decoder.decode(chunk, { stream: !done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const line = block.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === "message_delta") {
            setAgentStatus("");
            setStreamAgentMessage((current) => current + event.delta);
          }
          if (event.type === "thinking") setAgentStatus("Agent 正在思考...");
          if (event.type === "tool_start") setAgentStatus("Agent 正在提交生图任务...");
          if (event.type === "tool_end") setAgentStatus(event.isError ? "生图任务提交失败" : "生图任务已加入队列");
          if (event.type === "error") throw new Error(event.error);
        }
        if (done) break;
      }
      await load();
      setStreamUserMessage("");
      setStreamAgentMessage("");
      setAgentStatus("");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Agent 服务暂时不可用");
      await load();
      setStreamUserMessage("");
    } finally {
      setBusy(false);
    }
  }

  function changeComposerMode(mode: ComposerMode) {
    setComposerMode(mode);
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, mode);
  }

  async function saveCanvas(nextNodes = nodes) {
    const records = nextNodes.map((node) => ({
      ...node.data.record,
      position: node.position,
      size: { width: Number(node.style?.width || 360), height: Number(node.style?.height || 360) },
      updated_at: new Date().toISOString(),
    }));
    await fetch(`/api/projects/${projectId}/nodes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: records }),
    });
  }

  async function saveViewport(viewport: Viewport) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewport }),
    });
  }

  function deleteSelected() {
    const next = nodes.filter((node) => !node.selected);
    setNodes(next);
    void saveCanvas(next);
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#fafafa] text-stone-900">
      <section className="relative min-w-0 flex-1">
        <header className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between border-b border-stone-100 bg-white/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-stone-400 hover:text-stone-900"><ArrowLeft className="size-4" /></Link>
            <Logo compact />
            <span className="text-sm font-medium">{project?.name || "Untitled"}</span>
          </div>
          <AccountMenu />
          {!panelOpen && <button onClick={() => setPanelOpen(true)} className="rounded-md p-2 hover:bg-stone-100"><ChevronLeft className="size-4" /></button>}
        </header>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          onNodeDragStop={() => void saveCanvas()}
          onMoveEnd={(_, viewport) => void saveViewport(viewport)}
          nodeTypes={nodeTypes}
          fitView={!project?.viewport}
          deleteKeyCode={null}
          minZoom={0.08}
          maxZoom={3}
        >
          <Background color="#e8e6e3" gap={26} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
        </ReactFlow>
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
          <input ref={canvasFileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files?.length) void upload(Array.from(event.target.files), "canvas"); }} />
          <button onClick={() => canvasFileRef.current?.click()} title="上传图片到画布" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"><ImagePlus className="size-4" /></button>
          <button onClick={deleteSelected} title="删除选中元素" className="rounded-lg p-2 text-stone-600 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>
        </div>
      </section>
      {panelOpen && (
        <aside className="flex w-[370px] shrink-0 flex-col border-l border-stone-200 bg-white">
          <header className="flex h-14 items-center justify-between border-b border-stone-100 px-4">
            <span className="text-sm font-semibold">设计 Agent</span>
            <button onClick={() => setPanelOpen(false)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"><PanelRightClose className="size-4" /></button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Logo compact />
                <p className="mt-3 text-sm font-medium">开始创作</p>
                <p className="mt-1 max-w-52 text-xs leading-5 text-stone-400">输入你的想法，Agent 会生成图片并自动放入左侧画布。</p>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl bg-stone-100 px-3 py-2.5 text-sm" : message.role === "system" ? "rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500" : "text-sm leading-6 text-stone-700"}>
                {message.content}
              </div>
            ))}
            {streamUserMessage && <div className="ml-8 rounded-2xl bg-stone-100 px-3 py-2.5 text-sm">{streamUserMessage}</div>}
            {streamAgentMessage && <div className="text-sm leading-6 text-stone-700">{streamAgentMessage}</div>}
            {agentStatus && <div className="flex items-center gap-2 text-xs text-stone-400"><Loader2 className="size-3.5 animate-spin" /> {agentStatus}</div>}
            {agentError && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{agentError}</div>}
            {tasks.some((task) => ["queued", "processing"].includes(task.status)) && (
              <div className="flex items-center gap-2 text-xs text-stone-400"><Loader2 className="size-3.5 animate-spin" /> Agent 正在生成图片...</div>
            )}
            {tasks.filter((task) => task.status === "failed").map((task) => (
              <div key={task.id} className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                <p>{task.error_message || "生成失败"}</p>
                <button onClick={() => void generate({ prompt: task.prompt, model: task.parameters.model, aspectRatio: task.parameters.aspectRatio, resolution: task.parameters.resolution, referenceAssets: [] })} className="mt-2 font-medium underline">重试</button>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 p-3">
            <PromptComposer
              compact
              mode={composerMode}
              onModeChange={changeComposerMode}
              busy={busy}
              onSubmit={composerMode === "agent" ? sendAgent : generate}
              onUpload={(files) => upload(files)}
              placeholder={composerMode === "agent" ? "请输入你的设计需求..." : "输入提示词直接生图..."}
            />
          </div>
        </aside>
      )}
    </main>
  );
}

export function CanvasPage({ projectId }: { projectId: string }) {
  return <ReactFlowProvider><CanvasWorkspace projectId={projectId} /></ReactFlowProvider>;
}
