import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export const GUEST_SESSION_COOKIE_NAME = "branchborn_guest_session";

export async function getGuestSessionHashIfPresent() {
  const raw = (await cookies()).get(GUEST_SESSION_COOKIE_NAME)?.value;
  return raw ? createHash("sha256").update(raw).digest("hex") : null;
}

export async function clearGuestSession() {
  (await cookies()).delete(GUEST_SESSION_COOKIE_NAME);
}

export async function getGuestSession() {
  const store = await cookies();
  let raw = store.get(GUEST_SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    raw = randomBytes(32).toString("base64url");
    store.set(GUEST_SESSION_COOKIE_NAME, raw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_URL?.startsWith("https://") ?? false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return createHash("sha256").update(raw).digest("hex");
}
