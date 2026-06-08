import { appOrigin, safeNextPath } from "@/lib/branchborn/auth";
import { claimGuestProjects } from "@/lib/branchborn/store";
import { getGuestSessionHashIfPresent, GUEST_SESSION_COOKIE_NAME } from "@/lib/branchborn/session";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const origin = appOrigin(request.url);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const guestHash = await getGuestSessionHashIfPresent();
  if (guestHash) await claimGuestProjects(guestHash, userId);

  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.delete(GUEST_SESSION_COOKIE_NAME);
  return response;
}
