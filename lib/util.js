// Shared helpers for the API functions.
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const SLUG = /^[a-z0-9-]{1,120}$/;
export const KINDS = ["loved", "learned", "think", "more"];

// A one-way fingerprint of the visitor (IP + secret salt), so we can stop double-votes
// and spam without storing anyone's IP address.
export async function voterId(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const data = new TextEncoder().encode(ip + "|" + (env.SALT || "teen-take"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function noDb(env) {
  return !env.DB ? json({ error: "The comments database isn't connected yet." }, 503) : null;
}
