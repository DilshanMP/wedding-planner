/**
 * Canva Connect settings, read on the server only. The integration stays off
 * (and the app says so) until all three variables are set.
 *
 * CANVA_CLIENT_ID / CANVA_CLIENT_SECRET come from the integration in Canva's
 * Developer Portal. CANVA_TOKEN_KEY is any long random string used to encrypt
 * the tokens kept in the http-only cookie.
 */
export interface CanvaConfig {
  clientId: string;
  clientSecret: string;
  tokenKey: string;
  /** Must match a redirect URL registered in the Developer Portal exactly. */
  redirectUri: string | null;
}

export const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
export const CANVA_API = "https://api.canva.com/rest/v1";
/** Upload the card as an image, make a design from it, and read the user's name. */
export const CANVA_SCOPES = ["asset:read", "asset:write", "design:content:write", "design:meta:read", "profile:read"];

export function canvaConfig(env: Record<string, string | undefined> = process.env): CanvaConfig | null {
  const clientId = env.CANVA_CLIENT_ID?.trim();
  const clientSecret = env.CANVA_CLIENT_SECRET?.trim();
  const tokenKey = env.CANVA_TOKEN_KEY?.trim();
  if (!clientId || !clientSecret || !tokenKey || tokenKey.length < 32) return null;
  return { clientId, clientSecret, tokenKey, redirectUri: env.CANVA_REDIRECT_URI?.trim() || null };
}

export const redirectFor = (cfg: CanvaConfig, origin: string) => cfg.redirectUri ?? `${origin}/api/canva/callback`;
