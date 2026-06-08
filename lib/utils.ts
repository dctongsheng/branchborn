import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function hasUsableValue(value: string | undefined) {
  return Boolean(value && value.trim() && !value.includes("your-"));
}

function hasUsableHttpUrl(value: string | undefined) {
  const raw = value?.trim();
  if (!raw || raw.includes("your-")) return false;

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const hasEnvVars =
  hasUsableHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  hasUsableValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
