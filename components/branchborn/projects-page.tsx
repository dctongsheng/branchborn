"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/branchborn/logo";
import { AccountMenu } from "@/components/branchborn/account-menu";
import { ProjectGrid } from "@/components/branchborn/project-grid";
import { jsonOrLogin } from "@/lib/branchborn/client-auth";
import type { Project } from "@/lib/branchborn/types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  async function load() { setProjects((await jsonOrLogin(await fetch("/api/projects?limit=40"))).projects); }
  useEffect(() => { void load(); }, []);
  async function create() {
    const project = (await jsonOrLogin(await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))).project;
    location.href = `/canvas?projectId=${project.id}`;
  }
  async function remove(id: string) {
    if (!confirm("删除该项目？此操作无法撤销。")) return;
    await jsonOrLogin(await fetch(`/api/projects/${id}`, { method: "DELETE" }));
    await load();
  }
  async function rename(id: string, currentName: string) {
    const name = prompt("项目名称", currentName)?.trim();
    if (!name || name === currentName) return;
    await jsonOrLogin(await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }));
    await load();
  }
  return (
    <main className="min-h-screen px-8 pb-12">
      <header className="flex h-16 items-center gap-5">
        <Link href="/" className="text-stone-400 hover:text-stone-900"><ArrowLeft className="size-4" /></Link>
        <Logo />
        <div className="ml-auto"><AccountMenu /></div>
      </header>
      <section className="mx-auto max-w-7xl">
        <h1 className="mb-7 text-xl font-semibold">项目</h1>
        <ProjectGrid projects={projects} onCreate={create} onDelete={remove} onRename={rename} />
      </section>
    </main>
  );
}
