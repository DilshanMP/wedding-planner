import { NextResponse, type NextRequest } from "next/server";
import { displayName, exchangeCode } from "@/lib/canva/client";
import { canvaConfig } from "@/lib/canva/config";
import { OAUTH_COOKIE, clearCookie, readOAuth, setSession } from "@/lib/canva/session";

/** Step 2: Canva sends the user back with a code; swap it for tokens on the server. */
export async function GET(req: NextRequest) {
  const cfg = canvaConfig();
  const back = new URL("/invitations/canva", req.nextUrl.origin);
  const done = (status: string) => {
    back.searchParams.set("canva", status);
    const res = NextResponse.redirect(back);
    clearCookie(res, OAUTH_COOKIE);
    return res;
  };
  if (!cfg) return done("not_configured");
  const q = req.nextUrl.searchParams;
  const saved = readOAuth(req, cfg);
  if (saved?.project) back.searchParams.set("project", saved.project);
  if (q.get("error")) return done(q.get("error") === "access_denied" ? "denied" : "error");
  const code = q.get("code");
  if (!saved || !code || q.get("state") !== saved.state) return done("expired");
  try {
    const tokens = await exchangeCode(cfg, code, saved.verifier, saved.redirectUri);
    const name = await displayName(tokens.access).catch(() => "");
    const res = done("connected");
    setSession(res, req, cfg, tokens, name);
    return res;
  } catch {
    return done("error");
  }
}
