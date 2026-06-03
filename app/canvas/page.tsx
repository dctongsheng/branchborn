import { CanvasPage } from "@/components/branchborn/canvas-page";
import { Suspense } from "react";

async function CanvasRoute({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  return projectId ? <CanvasPage projectId={projectId} /> : <main className="p-8">缺少 projectId</main>;
}

export default function Page({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  return <Suspense fallback={<main className="p-8 text-sm text-stone-400">加载画布...</main>}><CanvasRoute searchParams={searchParams} /></Suspense>;
}
