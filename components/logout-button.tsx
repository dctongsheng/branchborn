"use client";

import { createClient, usePublicSupabaseConfig } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const { configured: hasSupabaseConfig } = usePublicSupabaseConfig();

  const logout = async () => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return <Button onClick={logout} disabled={!hasSupabaseConfig}>Logout</Button>;
}
