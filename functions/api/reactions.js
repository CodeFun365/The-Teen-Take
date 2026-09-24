import { json, SLUG, KINDS, voterId, noDb } from "../../lib/util.js";

async function summary(env, post, voter) {
  const { results } = await env.DB.prepare("SELECT kind, COUNT(*) AS n FROM reactions WHERE post = ? GROUP BY kind").bind(post).all();
  const mine = await env.DB.prepare("SELECT kind FROM reactions WHERE post = ? AND voter = ?").bind(post, voter).all();
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const r of results) counts[r.kind] = r.n;
  return { counts, mine: mine.results.map((r) => r.kind) };
}

// GET /api/reactions?post=slug -> {counts, mine}
export async function onRequestGet({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  const post = new URL(request.url).searchParams.get("post") || "";
  if (!SLUG.test(post)) return json({ error: "Unknown post." }, 400);
  return json(await summary(env, post, await voterId(request, env)));
}

// POST /api/reactions {post, kind} -> toggles this visitor's reaction
export async function onRequestPost({ request, env }) {
  const missing = noDb(env); if (missing) return missing;
  let d;
  try { d = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const post = String(d.post || ""), kind = String(d.kind || "");
  if (!SLUG.test(post) || !KINDS.includes(kind)) return json({ error: "Bad request." }, 400);
  const voter = await voterId(request, env);
  const existing = await env.DB.prepare("SELECT 1 FROM reactions WHERE post = ? AND kind = ? AND voter = ?").bind(post, kind, voter).first();
  if (existing) await env.DB.prepare("DELETE FROM reactions WHERE post = ? AND kind = ? AND voter = ?").bind(post, kind, voter).run();
  else await env.DB.prepare("INSERT OR IGNORE INTO reactions (post, kind, voter, created_at) VALUES (?, ?, ?, ?)").bind(post, kind, voter, Date.now()).run();
  return json(await summary(env, post, voter));
}
