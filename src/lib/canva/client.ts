import { CANVA_API, type CanvaConfig } from "./config";

/**
 * Calls to the Canva Connect REST API (server side). `fetch` is injectable so
 * the flow can be tested without the network.
 */

export interface CanvaTokens {
  access: string;
  refresh: string;
  /** Epoch ms when the access token expires. */
  expires: number;
  scope: string;
}

export class CanvaError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

type Fetch = typeof fetch;

const basic = (cfg: CanvaConfig) => `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`;

async function fail(res: Response, what: string): Promise<never> {
  let code: string | undefined;
  let detail = "";
  try {
    const body = (await res.json()) as { code?: string; error?: string; message?: string; error_description?: string };
    code = body.code ?? body.error;
    detail = body.message ?? body.error_description ?? "";
  } catch {
    // Not JSON.
  }
  throw new CanvaError(`Canva couldn't ${what}${detail ? `: ${detail}` : ""} (${res.status}).`, res.status, code);
}

async function token(cfg: CanvaConfig, form: Record<string, string>, f: Fetch, now: number): Promise<CanvaTokens> {
  const res = await f(`${CANVA_API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: basic(cfg), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  if (!res.ok) await fail(res, "sign you in");
  const body = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number; scope?: string };
  return { access: body.access_token, refresh: body.refresh_token, expires: now + Math.max(60, body.expires_in - 60) * 1000, scope: body.scope ?? "" };
}

export function exchangeCode(cfg: CanvaConfig, code: string, verifier: string, redirectUri: string, f: Fetch = fetch, now = Date.now()) {
  return token(cfg, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri }, f, now);
}

/** Canva refresh tokens are single use: always keep the new one. */
export function refreshTokens(cfg: CanvaConfig, refresh: string, f: Fetch = fetch, now = Date.now()) {
  return token(cfg, { grant_type: "refresh_token", refresh_token: refresh }, f, now);
}

export async function revoke(cfg: CanvaConfig, refresh: string, f: Fetch = fetch): Promise<void> {
  await f(`${CANVA_API}/oauth/revoke`, {
    method: "POST",
    headers: { Authorization: basic(cfg), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refresh }).toString(),
  });
}

export async function displayName(access: string, f: Fetch = fetch): Promise<string> {
  const res = await f(`${CANVA_API}/users/me/profile`, { headers: { Authorization: `Bearer ${access}` } });
  if (!res.ok) await fail(res, "read your profile");
  const body = (await res.json()) as { profile?: { display_name?: string } };
  return body.profile?.display_name ?? "";
}

/** Upload an image and wait for Canva to finish processing it. Returns the asset id. */
export async function uploadAsset(access: string, image: Uint8Array, name: string, f: Fetch = fetch, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<string> {
  const res = await f(`${CANVA_API}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(name.slice(0, 50)).toString("base64") }),
    },
    body: image as BodyInit,
  });
  if (!res.ok) await fail(res, "upload the card");
  let job = ((await res.json()) as { job: UploadJob }).job;
  for (let i = 0; i < 30 && job.status === "in_progress"; i++) {
    await wait(i < 5 ? 600 : 1500);
    const poll = await f(`${CANVA_API}/asset-uploads/${encodeURIComponent(job.id)}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!poll.ok) await fail(poll, "check the upload");
    job = ((await poll.json()) as { job: UploadJob }).job;
  }
  if (job.status === "success" && job.asset?.id) return job.asset.id;
  if (job.status === "failed") throw new CanvaError(`Canva couldn't process the card${job.error?.message ? `: ${job.error.message}` : ""}.`, 422, job.error?.code);
  throw new CanvaError("Canva is taking too long to process the card. Try again in a minute.", 504);
}

interface UploadJob {
  id: string;
  status: "in_progress" | "success" | "failed";
  asset?: { id: string };
  error?: { code: string; message: string };
}

/** A new design the size of the card, with the uploaded card on it. */
export async function createDesign(access: string, assetId: string, title: string, size: { width: number; height: number }, f: Fetch = fetch): Promise<{ id: string; editUrl: string; viewUrl: string }> {
  const res = await f(`${CANVA_API}/designs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify({ design_type: { type: "custom", width: size.width, height: size.height }, asset_id: assetId, title: title.slice(0, 255) }),
  });
  if (!res.ok) await fail(res, "create the design");
  const body = (await res.json()) as { design: { id: string; urls: { edit_url: string; view_url: string } } };
  return { id: body.design.id, editUrl: body.design.urls.edit_url, viewUrl: body.design.urls.view_url };
}
