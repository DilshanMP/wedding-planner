import { NextResponse, type NextRequest } from "next/server";
import { CanvaError, createDesign, uploadAsset } from "@/lib/canva/client";
import { canvaConfig } from "@/lib/canva/config";
import { SESSION_COOKIE, accessToken, clearCookie, sameOrigin, setSession } from "@/lib/canva/session";

/**
 * Put the card into the user's Canva: upload the PNG as an asset, then make
 * a 5 × 7 in design (1500 × 2100 px) with it. Returns the design's edit link.
 */
const MAX_BYTES = 15 * 1024 * 1024;
const hits = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const cfg = canvaConfig();
  if (!cfg) return NextResponse.json({ error: "Canva isn't set up on this server yet." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (req.headers.get("content-type") !== "image/png") return NextResponse.json({ error: "Send the card as a PNG." }, { status: 415 });

  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const recent = (hits.get(key) ?? []).filter((t) => Date.now() - t < 600_000);
  if (recent.length >= 10) return NextResponse.json({ error: "That's a lot of designs at once — try again in a few minutes." }, { status: 429 });
  hits.set(key, [...recent, Date.now()]);

  const image = new Uint8Array(await req.arrayBuffer());
  if (!image.length || image.length > MAX_BYTES) return NextResponse.json({ error: "The card image is too large." }, { status: 413 });
  const title = (req.nextUrl.searchParams.get("title") || "Wedding invitation").slice(0, 120);

  try {
    const auth = await accessToken(req, cfg);
    if (!auth) return NextResponse.json({ error: "Connect your Canva account first." }, { status: 401 });
    const assetId = await uploadAsset(auth.access, image, title);
    const design = await createDesign(auth.access, assetId, title, { width: 1500, height: 2100 });
    const res = NextResponse.json({ editUrl: design.editUrl, viewUrl: design.viewUrl });
    if (auth.fresh) setSession(res, req, cfg, auth.fresh, auth.name);
    return res;
  } catch (e) {
    if (e instanceof CanvaError && (e.status === 401 || (e.status === 400 && /invalid_grant/.test(e.code ?? "")))) {
      const res = NextResponse.json({ error: "Your Canva connection has expired. Connect again." }, { status: 401 });
      clearCookie(res, SESSION_COOKIE);
      return res;
    }
    const message = e instanceof CanvaError ? e.message : "Couldn't reach Canva. Try again.";
    return NextResponse.json({ error: message }, { status: e instanceof CanvaError && e.status === 403 ? 403 : 502 });
  }
}
