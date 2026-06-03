"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/lib/branchborn/types";

function relativeDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ProjectGrid({
  projects,
  onCreate,
  onDelete,
  onRename,
  compact = false,
}: {
  projects: Project[];
  onCreate: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, currentName: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-x-3 gap-y-7 ${compact ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
      <button onClick={onCreate} className="group text-left">
        <span className="flex aspect-[1.42] w-full items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 transition group-hover:border-stone-400 group-hover:bg-white">
          <Plus className="size-5 text-stone-400" />
        </span>
        <span className="mt-2 block text-sm text-stone-700">新建项目</span>
      </button>
      {projects.map((project) => (
        <div className="group relative" key={project.id}>
          <Link href={`/canvas?projectId=${project.id}`} className="block">
            <span className="flex aspect-[1.42] overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-100 transition group-hover:ring-stone-300">
              {project.cover?.url ? (
                // Private asset URLs intentionally bypass the public Next image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.cover.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full bg-gradient-to-br from-stone-50 to-stone-100" />
              )}
            </span>
            <span className="mt-2 block truncate pr-7 text-sm text-stone-800">{project.name}</span>
            <span className="mt-0.5 block text-[11px] text-stone-400">更新于 {relativeDate(project.updated_at)}</span>
          </Link>
          {onDelete && (
            <button
              aria-label="删除项目"
              onClick={() => onDelete(project.id)}
              className="absolute bottom-3 right-0 hidden rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          {onRename && (
            <button
              aria-label="重命名项目"
              onClick={() => onRename(project.id, project.name)}
              className="absolute bottom-3 right-6 hidden rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-800 group-hover:block"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
