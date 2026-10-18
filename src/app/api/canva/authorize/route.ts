import { NextResponse, type NextRequest } from "next/server";
import { CANVA_AUTHORIZE_URL, CANVA_SCOPES, canvaConfig, redirectFor } from "@/lib/canva/config";
import { pkce, randomState } from "@/lib/canva/seal";
import { setOAuth } from "@/lib/canva/session";

/** Step 1 of Canva sign-in (OAuth 2.0 with PKCE): send the user to Canva. */
export function GET(req: NextRequest) {
  const cfg = canvaConfig();
  const back = new URL("/invitations/canva", req.nextUrl.origin);
  if (!cfg) {
    back.searchParams.set("canva", "not_configured");
    return NextResponse.redirect(back);
  }
  const project = req.nextUrl.searchParams.get("project");
  const { verifier, challenge } = pkce();
  const state = randomState();
  const redirectUri = redirectFor(cfg, req.nextUrl.origin);
  const url = new URL(CANVA_AUTHORIZE_URL);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", CANVA_SCOPES.join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  setOAuth(res, req, cfg, { state, verifier, redirectUri, project: project && /^[\w-]{1,64}$/.test(project) ? project : null, at: Date.now() });
  return res;
}
