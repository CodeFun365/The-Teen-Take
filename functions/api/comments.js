import { json, SLUG, KINDS, voterId, noDb } from "../../lib/util.js";

// GET /api/comments?post=slug  -> approved comments for a post
export async function onRequestGet({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  const post = new URL(request.url).searchParams.get("post") || "";
  if (!SLUG.test(post)) return json({ error: "Unknown post." }, 400);
  const { results } = await env.DB.prepare(
    "SELECT name, body, impression, created_at FROM comments WHERE post = ? AND status = 'approved' ORDER BY created_at ASC LIMIT 500"
  ).bind(post).all();
  return json({ comments: results });
}

// POST /api/comments  {post, name, body, impression, website}
// New comments are saved as 'pending' and only appear after approval.
export async function onRequestPost({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  let d;
  try { d = await request.json(); } catch { return json({ error: "Something went wrong. Please try again." }, 400); }
  if (d.website) return json({ ok: true }); // honeypot: bots fill hidden fields
  const post = String(d.post || "");
  const body = String(d.body || "").trim();
  const name = String(d.name || "").trim().replace(/\s+/g, " ").slice(0, 30);
  const impression = KINDS.includes(d.impression) ? d.impression : null;
  if (!SLUG.test(post)) return json({ error: "Unknown post." }, 400);
  if (body.length < 2) return json({ error: "Please write a comment first." }, 400);
  if (body.length > 1000) return json({ error: "Please keep comments under 1,000 characters." }, 400);
  if (/https?:\/\/|www\./i.test(body)) return json({ error: "Links aren't allowed in comments." }, 400);

  const voter = await voterId(request, env);
  const now = Date.now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM comments WHERE voter = ? AND created_at > ?")
    .bind(voter, now - 10 * 60 * 1000).first();
  if (recent && recent.n >= 3) return json({ error: "You've sent a few comments already. Please wait a bit and try again." }, 429);

  await env.DB.prepare("INSERT INTO comments (post, name, body, impression, status, voter, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)")
    .bind(post, name || null, body, impression, voter, now).run();
  return json({ ok: true }, 201);
}
