import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { findTaskByProviderId } from "@/lib/branchborn/store";
import { pollKieTask } from "@/lib/branchborn/kie";

function validSignature(taskId: string, timestamp: string, signature: string) {
  const key = process.env.IMAGE_API_WEBHOOK_HMAC_KEY;
  if (!key || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", key).update(`${taskId}.${timestamp}`).digest("base64");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: Request) {
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const signature = request.headers.get("x-webhook-signature") || "";
  const body = await request.json().catch(() => ({}));
  const taskId = body.taskId || body.data?.taskId;
  if (!taskId || !validSignature(taskId, timestamp, signature)) {
    return NextResponse.json({ error: "签名校验失败" }, { status: 401 });
  }
  const match = await findTaskByProviderId(taskId);
  if (!match) return NextResponse.json({ ok: true });
  await pollKieTask(match.owner, match.task);
  return NextResponse.json({ ok: true });
}
