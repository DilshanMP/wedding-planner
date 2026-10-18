# Canva Connect setup (EverAfter Studio)

"Send to Canva" puts an invitation card into the user's own Canva account as a
new 5 × 7 in design (1500 × 2100 px) they can keep editing. It uses Canva's
official **Connect API** with OAuth 2.0 + PKCE. Until it is configured, the
Canva page says the connection is *pending* and offers PNG/SVG downloads to
upload into Canva by hand — nothing pretends to work.

## 1. Create the integration

1. Go to <https://www.canva.com/developers/integrations/connect-api> and create
   an integration.
2. **Scopes** — enable exactly these:
   `asset:read`, `asset:write`, `design:content:write`, `design:meta:read`,
   `profile:read`.
3. **Authentication → Redirect URLs** — add
   `https://<your-domain>/api/canva/callback`
   (and `http://127.0.0.1:3000/api/canva/callback` for local testing).
4. Copy the **Client ID** and generate a **Client secret**.
5. Private integrations work for your own team straight away; a public one
   needs Canva's review before other people can connect.

## 2. Set the server variables

On Vercel (Project → Settings → Environment Variables) or in `.env.local`:

| Variable | Value |
| --- | --- |
| `CANVA_CLIENT_ID` | Client ID from step 1 |
| `CANVA_CLIENT_SECRET` | Client secret from step 1 — server only, never `NEXT_PUBLIC_` |
| `CANVA_TOKEN_KEY` | Any random string of 32+ characters (`openssl rand -base64 48`) |
| `CANVA_REDIRECT_URI` | Optional — only if it isn't `<site>/api/canva/callback` |

Redeploy after adding them.

## How it works

| Route | What it does |
| --- | --- |
| `GET /api/canva/authorize` | Makes a PKCE verifier + state, stores them in an encrypted 10-minute cookie, redirects to `https://www.canva.com/api/oauth/authorize`. |
| `GET /api/canva/callback` | Checks the state, exchanges the code at `POST https://api.canva.com/rest/v1/oauth/token` (HTTP Basic client auth), stores the tokens. |
| `GET /api/canva/status` | `{ configured, connected, name }` for the page. |
| `POST /api/canva/send` | Body: the card PNG. Uploads it (`POST /v1/asset-uploads`, polls `GET /v1/asset-uploads/{jobId}`), then `POST /v1/designs` with a custom 1500 × 2100 design and the `asset_id`. Returns the `edit_url`. |
| `POST /api/canva/disconnect` | Revokes the token (`POST /v1/oauth/revoke`) and deletes the cookie. |

Security:

- Tokens never reach the browser's JavaScript or the database. They are
  encrypted with AES-256-GCM (key from `CANVA_TOKEN_KEY`) in an `HttpOnly`,
  `SameSite=Lax`, `Secure` (on https) cookie limited to `/api/canva`.
- Canva refresh tokens are single-use; every refresh rewrites the cookie.
- `send` and `disconnect` reject cross-site requests (Origin check) and `send`
  is rate limited.

Tests: `src/lib/canva/__tests__/canva.test.ts` runs the whole flow against a
mocked `fetch`. A live run needs real credentials from step 1.
