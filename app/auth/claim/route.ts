import { safeNextPath } from "@/lib/branchborn/auth";
import { claimGuestProjects } from "@/lib/branchborn/store";
import { getGuestSessionHashIfPresent, GUEST_SESSION_COOKIE_NAME } from "@/lib/branchborn/session";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const guestHash = await getGuestSessionHashIfPresent();
  if (guestHash) await claimGuestProjects(guestHash, userId);

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.delete(GUEST_SESSION_COOKIE_NAME);
  return response;
}
