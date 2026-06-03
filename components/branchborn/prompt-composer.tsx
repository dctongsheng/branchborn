"use client";

import { useRef, useState } from "react";
import { ArrowUp, Bot, ChevronDown, ImagePlus, Loader2, Plus, WandSparkles, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODEL_OPTIONS } from "@/lib/branchborn/constants";
import type { Asset, ModelId } from "@/lib/branchborn/types";

export type ComposerMode = "agent" | "direct";
export const COMPOSER_MODE_STORAGE_KEY = "branchborn_canvas_composer_mode";

export interface ComposerValue {
  prompt: string;
  model: ModelId;
  aspectRatio: string;
  resolution: string;
  referenceAssets: Asset[];
}

export function PromptComposer({
  onSubmit,
  onUpload,
  busy,
  compact = false,
  mode,
  onModeChange,
  placeholder = "描述你想创作的画面...",
}: {
  onSubmit: (value: ComposerValue) => void;
  onUpload?: (files: File[]) => Promise<Asset[]>;
  busy?: boolean;
  compact?: boolean;
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
  placeholder?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("gpt-image-2");
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [resolution, setResolution] = useState("1K");
  const [referenceAssets, setReferenceAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const option = MODEL_OPTIONS.find((item) => item.id === model)!;

  function changeModel(next: ModelId) {
    const nextOption = MODEL_OPTIONS.find((item) => item.id === next)!;
    setModel(next);
    setAspectRatio(nextOption.ratios[0]);
    setResolution(nextOption.resolutions[0]);
    if (!nextOption.supportsReferences) setReferenceAssets([]);
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !onUpload) return;
    setUploading(true);
    try {
      const uploaded = await onUpload(Array.from(files));
      setReferenceAssets((current) => [...current, ...uploaded].slice(0, 8));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function submit() {
    if (!prompt.trim() || busy || uploading) return;
    onSubmit({ prompt: prompt.trim(), model, aspectRatio, resolution, referenceAssets });
    setPrompt("");
    setReferenceAssets([]);
  }

  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-3 shadow-sm ${compact ? "" : "shadow-[0_12px_40px_rgba(0,0,0,.05)]"}`}>
      {referenceAssets.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {referenceAssets.map((asset) => (
            <span key={asset.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt="" className="size-14 rounded-lg object-cover" />
              <button onClick={() => setReferenceAssets((items) => items.filter((item) => item.id !== asset.id))} className="absolute -right-1 -top-1 rounded-full bg-stone-800 p-0.5 text-white">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-1 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-300"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => upload(event.target.files)} />
        <button onClick={() => inputRef.current?.click()} disabled={!onUpload || uploading || !option.supportsReferences} title={option.supportsReferences ? "上传参考图" : "当前模型仅支持文生图"} className="flex size-7 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-40">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : compact ? <Plus className="size-4" /> : <ImagePlus className="size-4" />}
        </button>
        {mode && onModeChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md bg-stone-50 px-2 py-1 text-xs font-medium text-stone-600 outline-none hover:bg-stone-100">
                {mode === "agent" ? <Bot className="size-3.5" /> : <WandSparkles className="size-3.5" />}
                {mode === "agent" ? "Agent" : "直接生图"}
                <ChevronDown className="size-3 text-stone-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-36">
              <DropdownMenuRadioGroup value={mode} onValueChange={(value) => onModeChange(value as ComposerMode)}>
                <DropdownMenuRadioItem value="agent" className="gap-2 text-xs">
                  <Bot className="size-3.5" /> Agent
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="direct" className="gap-2 text-xs">
                  <WandSparkles className="size-3.5" /> 直接生图
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {mode !== "agent" && (
          <>
            <select value={model} onChange={(event) => changeModel(event.target.value as ModelId)} className="rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-600 outline-none">
              {MODEL_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select value={aspectRatio} onChange={(event) => { setAspectRatio(event.target.value); if (event.target.value === "auto") setResolution("1K"); }} className="rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-600 outline-none">
              {option.ratios.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={resolution} onChange={(event) => setResolution(event.target.value)} className="rounded-md bg-stone-50 px-2 py-1 text-xs text-stone-600 outline-none">
              {option.resolutions.filter((item) => !(model === "gpt-image-2" && aspectRatio === "auto" && item !== "1K") && !(model === "gpt-image-2" && aspectRatio === "1:1" && item === "4K")).map((item) => <option key={item}>{item}</option>)}
            </select>
          </>
        )}
        <button onClick={submit} disabled={!prompt.trim() || busy || uploading} className="ml-auto flex size-8 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-700 disabled:bg-stone-200">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </div>
  );
}
