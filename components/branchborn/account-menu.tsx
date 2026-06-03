"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    location.href = "/auth/login";
  }

  return (
    <div className="flex items-center gap-3 text-xs text-stone-400">
      {email && <span className="max-w-44 truncate">{email}</span>}
      <button onClick={logout} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-stone-100 hover:text-stone-800">
        <LogOut className="size-3.5" /> 退出
      </button>
    </div>
  );
}
