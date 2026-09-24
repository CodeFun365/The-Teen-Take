import { json, noDb } from "../../lib/util.js";

async function authorized(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const given = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([given, env.ADMIN_TOKEN].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// GET /api/admin?status=pending|approved
export async function onRequestGet({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  if (!(await authorized(request, env))) return json({ error: "Wrong password." }, 401);
  const status = new URL(request.url).searchParams.get("status") === "approved" ? "approved" : "pending";
  const { results } = await env.DB.prepare(
    "SELECT id, post, name, body, impression, created_at FROM comments WHERE status = ? ORDER BY created_at DESC LIMIT 200"
  ).bind(status).all();
  return json({ comments: results });
}

// POST /api/admin {id, action: "approve" | "delete"}
export async function onRequestPost({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  if (!(await authorized(request, env))) return json({ error: "Wrong password." }, 401);
  let d;
  try { d = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = Number(d.id);
  if (!Number.isInteger(id)) return json({ error: "Bad request." }, 400);
  if (d.action === "approve") await env.DB.prepare("UPDATE comments SET status = 'approved' WHERE id = ?").bind(id).run();
  else if (d.action === "delete") await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  else return json({ error: "Bad request." }, 400);
  return json({ ok: true });
}
