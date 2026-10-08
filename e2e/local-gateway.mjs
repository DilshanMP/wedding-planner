// Local stand-in for the Supabase API gateway, for e2e/cloud.mjs:
// /rest/v1 -> PostgREST and a minimal /auth/v1 (user lookup from the JWT).
// Usage: POSTGREST_PORT=54330 GATEWAY_PORT=54331 node e2e/local-gateway.mjs
import http from "node:http";
const PGRST = { host: "127.0.0.1", port: Number(process.env.POSTGREST_PORT ?? 54330) };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS", "access-control-expose-headers": "*" };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.url.startsWith("/rest/v1")) {
    const up = http.request({ ...PGRST, path: req.url.replace(/^\/rest\/v1/, "") || "/", method: req.method, headers: { ...req.headers, host: `127.0.0.1:${PGRST.port}` } }, (r) => {
      res.writeHead(r.statusCode, { ...r.headers, ...cors });
      r.pipe(res);
    });
    up.on("error", () => { res.writeHead(502, cors); res.end(); });
    return req.pipe(up);
  }
  if (req.url.startsWith("/auth/v1/user")) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    try {
      const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      if (!claims.sub) throw new Error();
      res.writeHead(200, { "content-type": "application/json", ...cors });
      return res.end(JSON.stringify({ id: claims.sub, email: claims.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }));
    } catch { res.writeHead(401, { "content-type": "application/json", ...cors }); return res.end('{"message":"invalid"}'); }
  }
  if (req.url.startsWith("/auth/v1/logout")) { res.writeHead(204, cors); return res.end(); }
  res.writeHead(404, { "content-type": "application/json", ...cors });
  res.end('{"message":"not available in local gateway"}');
}).listen(Number(process.env.GATEWAY_PORT ?? 54331), "127.0.0.1", () => console.log(`gateway on ${process.env.GATEWAY_PORT ?? 54331}`));
