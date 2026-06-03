"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/branchborn/logo";
import { AccountMenu } from "@/components/branchborn/account-menu";
import { ProjectGrid } from "@/components/branchborn/project-grid";
import { COMPOSER_MODE_STORAGE_KEY, PromptComposer, type ComposerMode, type ComposerValue } from "@/components/branchborn/prompt-composer";
import { jsonOrLogin } from "@/lib/branchborn/client-auth";
import type { Asset, Project } from "@/lib/branchborn/types";

async function createProject() {
  const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  return (await jsonOrLogin(response)).project as Project;
}

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Project | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>("agent");
  useEffect(() => { fetch("/api/projects?limit=20").then(jsonOrLogin).then((data) => setProjects(data.projects)); }, []);
  useEffect(() => {
    const saved = localStorage.getItem(COMPOSER_MODE_STORAGE_KEY);
    if (saved === "agent" || saved === "direct") setComposerMode(saved);
  }, []);

  async function openBlank() {
    location.href = `/canvas?projectId=${(await createProject()).id}`;
  }

  async function submit(value: ComposerValue) {
    setBusy(true);
    try {
      const project = draft ?? await createProject();
      const assets: Asset[] = value.referenceAssets;
      const body = JSON.stringify({ ...value, referenceAssetIds: assets.map((asset) => asset.id) });
      if (composerMode === "agent") {
        const response = await fetch(`/api/projects/${project.id}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (response.status === 401) await jsonOrLogin(response);
        if (!response.ok || !response.body) throw new Error("Agent 服务暂时不可用");
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
            if (event.type === "error") throw new Error(event.error);
          }
          if (done) break;
        }
      } else {
        const response = await fetch(`/api/projects/${project.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        await jsonOrLogin(response);
      }
      location.href = `/canvas?projectId=${project.id}`;
    } finally {
      setBusy(false);
    }
  }

  function changeComposerMode(mode: ComposerMode) {
    setComposerMode(mode);
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, mode);
  }

  async function upload(files: File[]) {
    const project = draft ?? await createProject();
    if (!draft) setDraft(project);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const response = await fetch(`/api/projects/${project.id}/upload`, { method: "POST", body: form });
    const data = await jsonOrLogin(response);
    if (!response.ok) throw new Error(data.error);
    return data.assets as Asset[];
  }

  return (
    <main className="min-h-screen bg-[#fefefe] px-6 pb-14 text-stone-900">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-xs text-stone-500 hover:text-stone-900">项目库</Link>
          <AccountMenu />
        </div>
      </header>
      <section className="mx-auto flex min-h-[420px] max-w-xl flex-col justify-center">
        <div className="mb-5 text-center">
          <div className="mb-3 flex justify-center"><Logo /></div>
          <h1 className="text-2xl font-semibold tracking-tight">让设计更简单</h1>
          <p className="mt-2 text-sm text-stone-400">描述你的设计代理，和你搞定一切</p>
        </div>
        <PromptComposer
          onSubmit={submit}
          onUpload={upload}
          busy={busy}
          mode={composerMode}
          onModeChange={changeComposerMode}
          placeholder={composerMode === "agent" ? "描述你的设计需求..." : "描述你想创作的画面..."}
        />
        <p className="mt-3 text-center text-[11px] text-stone-300">本地未配置生图服务时会使用演示图片，便于完整体验流程</p>
      </section>
      <section className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">最近项目</h2>
          <Link href="/projects" className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-800">查看全部 <ArrowRight className="size-3" /></Link>
        </div>
        <ProjectGrid projects={projects} onCreate={openBlank} compact />
      </section>
    </main>
  );
}
