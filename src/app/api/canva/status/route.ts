import { NextResponse, type NextRequest } from "next/server";
import { canvaConfig } from "@/lib/canva/config";
import { SESSION_COOKIE, readSession } from "@/lib/canva/session";

/** Whether Canva is set up on this server and whether this browser is connected. */
export function GET(req: NextRequest) {
  // Reading the cookie first keeps this per-request (never prerendered).
  const hasCookie = req.cookies.has(SESSION_COOKIE);
  const cfg = canvaConfig();
  const s = cfg && hasCookie ? readSession(req, cfg) : null;
  return NextResponse.json({ configured: Boolean(cfg), connected: Boolean(s), name: s?.name ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
