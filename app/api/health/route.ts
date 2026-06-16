import { connection, NextResponse } from "next/server";
import { isDockerProduction, missingProductionEnv } from "@/lib/branchborn/production";

export async function GET() {
  await connection();
  const missing = missingProductionEnv();
  if (missing.length) {
    return NextResponse.json(
      {
        status: "error",
        environment: isDockerProduction() ? "docker-production" : "development",
        missing,
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    status: "ok",
    environment: isDockerProduction() ? "docker-production" : "development",
  });
}
