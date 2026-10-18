import { NextResponse, type NextRequest } from "next/server";
import { revoke } from "@/lib/canva/client";
import { canvaConfig } from "@/lib/canva/config";
import { SESSION_COOKIE, clearCookie, readSession, sameOrigin } from "@/lib/canva/session";

/** Forget the Canva connection: revoke the tokens at Canva and delete the cookie. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const cfg = canvaConfig();
  const s = cfg ? readSession(req, cfg) : null;
  if (cfg && s) await revoke(cfg, s.refresh).catch(() => {});
  const res = NextResponse.json({ ok: true });
  clearCookie(res, SESSION_COOKIE);
  return res;
}
