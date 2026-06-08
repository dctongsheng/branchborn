"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

type PublicSupabaseConfig = {
  supabaseUrl: string;
  publishableKey: string;
};

declare global {
  interface Window {
    __BRANCHBORN_SUPABASE_CONFIG__?: PublicSupabaseConfig;
  }
}

export const SUPABASE_CONFIG_ERROR = "请先在 `.env.docker` 或 `.env.local` 中配置有效的 Supabase URL 和 Publishable Key。";

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

function isUsableConfig(config: Partial<PublicSupabaseConfig> | undefined): config is PublicSupabaseConfig {
  return hasUsableHttpUrl(config?.supabaseUrl) && hasUsableValue(config?.publishableKey);
}

function buildTimeConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

function publicConfig() {
  if (typeof window !== "undefined" && isUsableConfig(window.__BRANCHBORN_SUPABASE_CONFIG__)) {
    return window.__BRANCHBORN_SUPABASE_CONFIG__;
  }

  const config = buildTimeConfig();
  if (isUsableConfig(config)) {
    return config;
  }

  return null;
}

export function usePublicSupabaseConfig() {
  const [configured, setConfigured] = useState(() => Boolean(publicConfig()));
  const [checked, setChecked] = useState(() => Boolean(publicConfig()));

  useEffect(() => {
    if (publicConfig()) return;

    let active = true;
    void fetch("/api/public-env")
      .then((response) => response.json())
      .then((config) => {
        if (!active) return;
        if (isUsableConfig(config)) {
          window.__BRANCHBORN_SUPABASE_CONFIG__ = config;
          setConfigured(true);
        } else {
          setConfigured(false);
        }
      })
      .catch(() => {
        if (active) setConfigured(false);
      })
      .finally(() => {
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return { configured, checked };
}

export function createClient() {
  const config = publicConfig();
  if (!config) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return createBrowserClient(
    config.supabaseUrl,
    config.publishableKey,
  );
}
