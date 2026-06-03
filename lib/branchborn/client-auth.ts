"use client";

export function redirectToLogin() {
  location.href = `/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}

export async function jsonOrLogin(response: Response) {
  if (response.status === 401) {
    redirectToLogin();
    throw new Error("请先登录");
  }
  return response.json();
}
