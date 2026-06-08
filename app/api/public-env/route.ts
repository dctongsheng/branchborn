import { connection, NextResponse } from "next/server";
import { hasEnvVars } from "@/lib/utils";

export async function GET() {
  await connection();

  if (!hasEnvVars) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
