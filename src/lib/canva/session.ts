import type { NextRequest, NextResponse } from "next/server";
import { refreshTokens, type CanvaTokens } from "./client";
import type { CanvaConfig } from "./config";
import { seal, unseal } from "./seal";

/**
 * Canva tokens live only in an encrypted, http-only cookie scoped to
 * /api/canva — never in the database, the page or JavaScript.
 */
export const OAUTH_COOKIE = "canva_oauth";
export const SESSION_COOKIE = "canva_session";
const PATH = "/api/canva";
const MAX_COOKIE = 3800;

export interface OAuthState { state: string; verifier: string; redirectUri: string; project: string | null; at: number }
interface Stored { a?: string; r: string; e: number; s: string; n: string }

const secure = (req: NextRequest) => req.nextUrl.protocol === "https:";

export function setOAuth(res: NextResponse, req: NextRequest, cfg: CanvaConfig, value: OAuthState) {
  res.cookies.set(OAUTH_COOKIE, seal(value, cfg.tokenKey), { httpOnly: true, secure: secure(req), sameSite: "lax", path: PATH, maxAge: 600 });
}

export function readOAuth(req: NextRequest, cfg: CanvaConfig): OAuthState | null {
  const v = unseal<OAuthState>(req.cookies.get(OAUTH_COOKIE)?.value, cfg.tokenKey);
  return v && Date.now() - v.at < 600_000 ? v : null;
}

export function setSession(res: NextResponse, req: NextRequest, cfg: CanvaConfig, t: CanvaTokens, name: string) {
  let value = seal({ a: t.access, r: t.refresh, e: t.expires, s: t.scope, n: name.slice(0, 120) } satisfies Stored, cfg.tokenKey);
  // Long access tokens don't fit a cookie: keep the refresh token and fetch a new access token when needed.
  if (value.length > MAX_COOKIE) value = seal({ r: t.refresh, e: 0, s: t.scope, n: name.slice(0, 120) } satisfies Stored, cfg.tokenKey);
  res.cookies.set(SESSION_COOKIE, value, { httpOnly: true, secure: secure(req), sameSite: "lax", path: PATH, maxAge: 60 * 60 * 24 * 60 });
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { httpOnly: true, path: PATH, maxAge: 0 });
}

export function readSession(req: NextRequest, cfg: CanvaConfig): (CanvaTokens & { name: string }) | null {
  const v = unseal<Stored>(req.cookies.get(SESSION_COOKIE)?.value, cfg.tokenKey);
  return v?.r ? { access: v.a ?? "", refresh: v.r, expires: v.e, scope: v.s, name: v.n } : null;
}

/** A usable access token, refreshing it when it has expired. `fresh` is set when the cookie must be rewritten. */
export async function accessToken(req: NextRequest, cfg: CanvaConfig, f: typeof fetch = fetch): Promise<{ access: string; fresh: CanvaTokens | null; name: string } | null> {
  const s = readSession(req, cfg);
  if (!s) return null;
  if (s.access && s.expires > Date.now()) return { access: s.access, fresh: null, name: s.name };
  const fresh = await refreshTokens(cfg, s.refresh, f);
  return { access: fresh.access, fresh, name: s.name };
}

/** Requests that change something must come from this app's own pages. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin;
}
