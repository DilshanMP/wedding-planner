import { describe, expect, it, vi } from "vitest";
import { CanvaError, createDesign, exchangeCode, refreshTokens, uploadAsset } from "../client";
import { canvaConfig, redirectFor } from "../config";
import { pkce, seal, unseal } from "../seal";
import { createHash } from "node:crypto";

const cfg = { clientId: "OC-abc", clientSecret: "shh", tokenKey: "k".repeat(40), redirectUri: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("canva config", () => {
  it("stays off until every variable is set", () => {
    expect(canvaConfig({})).toBeNull();
    expect(canvaConfig({ CANVA_CLIENT_ID: "a", CANVA_CLIENT_SECRET: "b", CANVA_TOKEN_KEY: "short" })).toBeNull();
    const c = canvaConfig({ CANVA_CLIENT_ID: "a", CANVA_CLIENT_SECRET: "b", CANVA_TOKEN_KEY: "x".repeat(32) });
    expect(c?.clientId).toBe("a");
    expect(redirectFor(c!, "https://site.test")).toBe("https://site.test/api/canva/callback");
    expect(redirectFor({ ...c!, redirectUri: "https://other.test/cb" }, "https://site.test")).toBe("https://other.test/cb");
  });
});

describe("cookie sealing", () => {
  it("round-trips and rejects tampering or the wrong key", () => {
    const s = seal({ r: "refresh", n: "Amaya" }, cfg.tokenKey);
    expect(s).not.toContain("refresh");
    expect(unseal(s, cfg.tokenKey)).toEqual({ r: "refresh", n: "Amaya" });
    expect(unseal(s, "y".repeat(40))).toBeNull();
    const flipped = s.slice(0, -2) + (s.at(-2) === "A" ? "B" : "A") + s.at(-1);
    expect(unseal(flipped, cfg.tokenKey)).toBeNull();
    expect(unseal(undefined, cfg.tokenKey)).toBeNull();
  });

  it("makes an S256 PKCE challenge", () => {
    const { verifier, challenge } = pkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
});

describe("canva api calls", () => {
  it("exchanges the code with basic auth and PKCE", async () => {
    const f = vi.fn(async () => json({ access_token: "AT", refresh_token: "RT", expires_in: 14400, scope: "asset:write" }));
    const t = await exchangeCode(cfg, "CODE", "VERIFIER", "https://site.test/api/canva/callback", f as unknown as typeof fetch, 1_000);
    expect(t).toEqual({ access: "AT", refresh: "RT", expires: 1_000 + (14400 - 60) * 1000, scope: "asset:write" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.canva.com/rest/v1/oauth/token");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("OC-abc:shh").toString("base64")}`);
    const body = new URLSearchParams(String(init.body));
    expect(Object.fromEntries(body)).toEqual({ grant_type: "authorization_code", code: "CODE", code_verifier: "VERIFIER", redirect_uri: "https://site.test/api/canva/callback" });
  });

  it("refreshes with the refresh token and reports Canva's errors", async () => {
    const ok = vi.fn(async () => json({ access_token: "AT2", refresh_token: "RT2", expires_in: 100 }));
    expect((await refreshTokens(cfg, "RT", ok as unknown as typeof fetch, 0)).refresh).toBe("RT2");
    expect(new URLSearchParams(String((ok.mock.calls[0] as unknown as [string, RequestInit])[1].body)).get("grant_type")).toBe("refresh_token");
    const bad = vi.fn(async () => json({ error: "invalid_grant", error_description: "Token was used" }, 400));
    await expect(refreshTokens(cfg, "RT", bad as unknown as typeof fetch)).rejects.toMatchObject({ status: 400, code: "invalid_grant" });
  });

  it("uploads the card, waits for the job, and creates a design from it", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      if (url.endsWith("/asset-uploads")) return json({ job: { id: "job1", status: "in_progress" } });
      if (url.endsWith("/asset-uploads/job1")) return calls.filter((c) => c[0].endsWith("job1")).length < 2 ? json({ job: { id: "job1", status: "in_progress" } }) : json({ job: { id: "job1", status: "success", asset: { id: "Ma1" } } });
      if (url.endsWith("/designs")) return json({ design: { id: "D1", urls: { edit_url: "https://www.canva.com/design/D1/edit", view_url: "https://www.canva.com/design/D1/view" } } });
      return json({}, 404);
    });
    const id = await uploadAsset("AT", new Uint8Array([137, 80, 78, 71]), "Amaya & Kavindu", f as unknown as typeof fetch, async () => {});
    expect(id).toBe("Ma1");
    const meta = JSON.parse((calls[0][1]!.headers as Record<string, string>)["Asset-Upload-Metadata"]) as { name_base64: string };
    expect(Buffer.from(meta.name_base64, "base64").toString()).toBe("Amaya & Kavindu");
    expect((calls[0][1]!.headers as Record<string, string>)["Content-Type"]).toBe("application/octet-stream");

    const d = await createDesign("AT", id, "Our invitation", { width: 1500, height: 2100 }, f as unknown as typeof fetch);
    expect(d.editUrl).toBe("https://www.canva.com/design/D1/edit");
    expect(JSON.parse(String(calls.at(-1)![1]!.body))).toEqual({ design_type: { type: "custom", width: 1500, height: 2100 }, asset_id: "Ma1", title: "Our invitation" });
  });

  it("stops when Canva fails the upload", async () => {
    const f = vi.fn(async (url: string) => (url.endsWith("/asset-uploads") ? json({ job: { id: "j", status: "failed", error: { code: "file_too_big", message: "Too big" } } }) : json({}, 404)));
    await expect(uploadAsset("AT", new Uint8Array([1]), "x", f as unknown as typeof fetch, async () => {})).rejects.toBeInstanceOf(CanvaError);
  });
});
