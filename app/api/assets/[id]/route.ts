import { NextResponse } from "next/server";
import { isBranchbornAuthError, requireBranchbornUser } from "@/lib/branchborn/auth";
import { getOwnedAsset } from "@/lib/branchborn/store";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireBranchbornUser();
    const result = await getOwnedAsset(user.id, (await params).id);
    if (!result) return NextResponse.json({ error: "资源不存在" }, { status: 404 });
    if ("redirect" in result && result.redirect) return NextResponse.redirect(result.redirect);
    if ("demo" in result) {
      const prompt = decodeURIComponent(result.asset.storage_path.slice(5));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7e9d7"/><stop offset=".48" stop-color="#d8e5e1"/><stop offset="1" stop-color="#c9b8e5"/></linearGradient></defs>
      <rect width="1000" height="1000" fill="url(#g)"/><circle cx="790" cy="210" r="190" fill="#fff" opacity=".34"/><circle cx="160" cy="810" r="280" fill="#fff" opacity=".22"/>
      <text x="70" y="110" font-family="Arial" font-size="28" fill="#1b1b1b" opacity=".56">BRANCHBORN CONCEPT</text>
      <text x="70" y="760" font-family="Arial" font-size="54" font-weight="700" fill="#1b1b1b">AI GENERATED</text>
      <foreignObject x="70" y="800" width="830" height="130"><div xmlns="http://www.w3.org/1999/xhtml" style="font:28px Arial;color:#242424;line-height:1.35">${escapeXml(prompt.slice(0, 100))}</div></foreignObject>
    </svg>`;
      return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=60" } });
    }
    return new NextResponse(result.bytes, { headers: { "Content-Type": result.asset.mime_type, "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    if (isBranchbornAuthError(error)) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    throw error;
  }
}
