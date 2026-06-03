import type { ModelId } from "@/lib/branchborn/types";

export const MAX_FILES = 8;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MODEL_OPTIONS: {
  id: ModelId;
  label: string;
  ratios: string[];
  resolutions: string[];
  supportsReferences: boolean;
}[] = [
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    ratios: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"],
    resolutions: ["1K", "2K", "4K"],
    supportsReferences: true,
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    ratios: ["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "16:9", "9:16", "21:9"],
    resolutions: ["1K", "2K", "4K"],
    supportsReferences: true,
  },
  {
    id: "ernie-image",
    label: "ERNIE Image",
    ratios: ["1:1"],
    resolutions: ["1K"],
    supportsReferences: false,
  },
];

export function validateGenerationOptions(model: ModelId, aspectRatio: string, resolution: string) {
  const option = MODEL_OPTIONS.find((item) => item.id === model);
  if (!option || !option.ratios.includes(aspectRatio) || !option.resolutions.includes(resolution)) {
    throw new Error("当前模型不支持所选参数");
  }
  if (model === "gpt-image-2" && aspectRatio === "auto" && resolution !== "1K") {
    throw new Error("GPT Image 2 使用自动比例时仅支持 1K 分辨率");
  }
  if (model === "gpt-image-2" && aspectRatio === "1:1" && resolution === "4K") {
    throw new Error("GPT Image 2 使用 1:1 比例时不支持 4K 分辨率");
  }
}
