import { createClient } from "@/lib/supabase/server";

export interface BranchbornUser {
  id: string;
  email?: string;
}

export class BranchbornAuthError extends Error {
  constructor() {
    super("请先登录");
  }
}

export async function getBranchbornUser(): Promise<BranchbornUser | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    return claims?.sub ? { id: claims.sub, email: claims.email as string | undefined } : null;
  } catch {
    return null;
  }
}

export async function requireBranchbornUser() {
  const user = await getBranchbornUser();
  if (!user) throw new BranchbornAuthError();
  return user;
}

export function isBranchbornAuthError(error: unknown) {
  return error instanceof BranchbornAuthError;
}

export function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function appOrigin(requestUrl: string) {
  const configuredUrl = process.env.APP_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall back to the incoming request URL if APP_URL is malformed.
    }
  }

  return new URL(requestUrl).origin;
}
