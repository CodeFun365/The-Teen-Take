// The Teen Take — tiny static site builder. No dependencies.
// Reads content/ and static/, writes the finished site to dist/.
// Run: node build.js
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));
const upcoming = JSON.parse(fs.readFileSync(path.join(ROOT, "content/upcoming.json"), "utf8"));

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fmtDate = (iso) => { const [y,m,d] = iso.split("-").map(Number); return `${d} ${MONTHS[m-1]} ${y}`; };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

// ---------- tiny markdown ----------
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function markdown(md) {
  const blocks = md.replace(/\r/g,"").trim().split(/\n\s*\n/);
  let html = "", firstP = true;
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    if (b.startsWith("### ")) html += `<h3>${inline(b.slice(4))}</h3>\n`;
    else if (b.startsWith("## ")) html += `<h2>${inline(b.slice(3))}</h2>\n`;
    else if (b.startsWith("# ")) html += `<h2>${inline(b.slice(2))}</h2>\n`;
    else if (b.startsWith(">")) html += `<blockquote><p>${inline(b.split("\n").map(l=>l.replace(/^>\s?/,"")).join(" "))}</p></blockquote>\n`;
    else if (/^[-*] /.test(b)) html += "<ul>" + b.split("\n").map(l=>`<li>${inline(l.replace(/^[-*]\s+/,""))}</li>`).join("") + "</ul>\n";
    else if (/^\d+\. /.test(b)) html += "<ol>" + b.split("\n").map(l=>`<li>${inline(l.replace(/^\d+\.\s+/,""))}</li>`).join("") + "</ol>\n";
    else { html += `<p${firstP ? ' class="lead"' : ""}>${inline(b.replace(/\n/g," "))}</p>\n`; firstP = false; }
  }
  return html;
}

// ---------- load posts ----------
function parsePost(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r/g,"");
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${path.basename(file)}: missing the --- header block at the top`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":"); if (i < 0) continue;
    meta[line.slice(0,i).trim().toLowerCase()] = line.slice(i+1).trim();
  }
  for (const k of ["title","date","category"]) if (!meta[k]) throw new Error(`${path.basename(file)}: "${k}:" is missing`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${path.basename(file)}: date must look like 2026-09-28`);
  const base = path.basename(file, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const words = m[2].split(/\s+/).filter(Boolean).length;
  return {
    ...meta,
    slug: meta.slug ? slugify(meta.slug) : slugify(base),
    tags: (meta.tags||"").split(",").map(s=>s.trim()).filter(Boolean),
    takeaways: (meta.takeaways||"").split("|").map(s=>s.trim()).filter(Boolean),
    html: markdown(m[2]),
    words, minutes: Math.max(1, Math.round(words/200)),
  };
}
const postDir = path.join(ROOT, "content/posts");
const posts = fs.readdirSync(postDir).filter(f => f.endsWith(".md") && !f.startsWith("_"))
  .map(f => parsePost(path.join(postDir, f)))
  .sort((a,b) => b.date.localeCompare(a.date));
posts.forEach((p,i) => { p.number = posts.length - i; });

// ---------- layout ----------
const heart = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 26s-10-6.2-10-13.2A5.6 5.6 0 0 1 15 9.3a5.6 5.6 0 0 1 10 3.5C25 19.8 15 26 15 26z" fill="var(--cherry)"/><path d="M9.5 12.5c.4-1.4 1.5-2.3 2.8-2.4" stroke="var(--paper)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
const check = `<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="5" fill="var(--cherry-soft)" stroke="var(--cherry)" stroke-width="1.5"/><path d="M5 9.5l2.6 2.5L13 6.5" fill="none" stroke="var(--cherry)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function page({ title, desc, active, body, urlPath, scripts = "", noindex = false }) {
  const nav = [["/","Home","home"],["/library/","Library","library"],["/about/","About me","about"]]
    .map(([h,l,k]) => `<a href="${h}"${active===k?' aria-current="page"':""}>${l}</a>`).join("");
  const full = title ? `${esc(title)} · ${esc(site.name)}` : esc(site.name);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${full}</title>
<meta name="description" content="${esc(desc || site.tagline)}">
<meta property="og:title" content="${full}">
<meta property="og:description" content="${esc(desc || site.tagline)}">
<meta property="og:url" content="${esc(site.url + urlPath)}">
<meta property="og:type" content="website">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Caveat:wght@500;700&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="top"><div class="wrap bar">
  <a class="logo" href="/" aria-label="${esc(site.name)}, home">${heart}<span class="name">The Teen <i>Take</i></span></a>
  <nav aria-label="Main">${nav}</nav>
</div></header>
<main>
${body}
</main>
<footer><div class="wrap"><span class="hand">thanks for reading ♡</span><span>${esc(site.name)} · a new post every week · <a href="/feed.xml">RSS</a></span></div></footer>
${scripts}
</body>
</html>`;
}

const postCard = (p) => `<a class="pcard" href="/posts/${p.slug}/" data-cat="${esc(p.category)}" data-text="${esc((p.title+" "+(p.dek||"")+" "+p.tags.join(" ")).toLowerCase())}">
  <span class="pill">${esc(p.category)}</span>
  <h3>${esc(p.title)}</h3>
  ${p.dek ? `<p>${esc(p.dek)}</p>` : ""}
  <span class="meta-line">${fmtDate(p.date)} · ${p.minutes} min read</span>
</a>`;

const upList = (items) => items.length ? `<ol class="upnext">${items.map(u => {
  const [,m,d] = u.date.split("-").map(Number);
  return `<li><span class="date">${d}<small>${MONTHS[m-1]}</small></span><div><div class="t">${esc(u.title)}</div><div class="k">${esc(u.format||"")}</div></div></li>`;
}).join("")}</ol>` : `<p class="empty">New ideas coming soon.</p>`;

const latestDate = posts[0] ? posts[0].date : "0000";
const nextUp = upcoming.filter(u => u.date > latestDate).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);

// ---------- pages ----------
function home() {
  const p = posts[0];
  const feature = p ? `<div class="feature-wrap">
    <h2 class="section-h">Latest post</h2>
    <a class="feature" href="/posts/${p.slug}/" aria-label="Read: ${esc(p.title)}">
      <span class="tape r" aria-hidden="true"></span>
      <div class="txt">
        <span class="pill">${esc(p.category)} · Post no. ${p.number}</span>
        <h3>${esc(p.title)}</h3>
        ${p.dek ? `<p>${esc(p.dek)}</p>` : ""}
        <span class="go">Read the post →</span>
      </div>
      <div class="moodboard" aria-hidden="true">
        <span class="era">in this post</span>
        <div class="stickers">${p.tags.map(t=>`<span class="sticker">${esc(t)}</span>`).join("")}</div>
      </div>
    </a>
  </div>` : "";
  const more = posts.slice(1,4);
  const cur = site.currently.map(([k,v]) => `<li><span class="k">${esc(k)}</span><span>${esc(v)}</span></li>`).join("");
  return page({ active:"home", urlPath:"/", body:`<div class="wrap">
  <div class="hero">
    <div>
      <span class="hi">hi, welcome to my corner of the internet!</span>
      <h1>Why we buy what we <span class="scribble"><i>buy</i><svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M3 14 C 40 4, 80 18, 120 9 S 180 6, 197 11" fill="none" stroke="var(--cherry)" stroke-width="4" stroke-linecap="round"/></svg></span>.</h1>
      <p class="sub">${esc(site.tagline)}</p>
    </div>
    <aside class="me-card" aria-label="About the writer">
      <span class="tape" aria-hidden="true"></span>
      <div class="me-top">
        <div class="avatar" aria-hidden="true"><svg viewBox="0 0 34 34"><path d="M7 27 L22 6 l5 4 L12 31 l-6 1z" fill="var(--butter)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/><path d="M22 6l5 4" stroke="var(--ink)" stroke-width="1.6"/><path d="M6 32l1-5 5 4z" fill="var(--ink)"/></svg></div>
        <div><b>${esc(site.author)}</b><span>${esc(site.authorLine)}</span></div>
      </div>
      <ul class="currently">${cur}</ul>
    </aside>
  </div>
  ${feature}
  ${more.length ? `<div class="feature-wrap"><h2 class="section-h">More posts</h2><div class="grid">${more.map(postCard).join("")}</div></div>` : ""}
  <div class="cols">
    <div><h2 class="section-h">Coming up</h2>${upList(nextUp)}</div>
    <div class="side-stack">
      <aside class="note"><span class="tape" aria-hidden="true"></span><p>${esc(site.note)}</p><p class="sig">${esc(site.signoff)}</p></aside>
      <div class="lib-cta"><b>The Library</b><p>Every post I've written, all in one place. ${posts.length} so far!</p><a class="btn" href="/library/">Browse the library</a></div>
    </div>
  </div>
</div>`});
}

function library() {
  const cats = [...new Set(posts.map(p=>p.category))].sort();
  const chips = [`<button class="chip" type="button" data-cat="" aria-pressed="true">All (${posts.length})</button>`]
    .concat(cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="false">${esc(c)} (${posts.filter(p=>p.category===c).length})</button>`)).join("");
  return page({ title:"Library", desc:"Every post on The Teen Take.", active:"library", urlPath:"/library/", body:`<div class="wrap">
  <div class="lib-head">
    <span class="hand" style="font-size:28px">every single post, right here</span>
    <h1>The <i>Library</i></h1>
    <p>${posts.length} ${posts.length===1?"post":"posts"} so far, newest first. Filter by type or search for a brand.</p>
  </div>
  <div class="lib-tools">
    <div class="chips" role="group" aria-label="Filter by type">${chips}</div>
    <input class="search" id="q" type="search" placeholder="Search posts…" aria-label="Search posts">
  </div>
  <div class="grid" id="grid">${posts.map(postCard).join("")}</div>
  <p class="empty" id="none" hidden>No posts match that yet. Maybe it's a future topic!</p>
  <div class="soon"><h2 class="section-h">Coming up</h2>${upList(nextUp)}</div>
</div>`, scripts:`<script>
(function(){
  var cat="", q="", cards=[].slice.call(document.querySelectorAll("#grid .pcard"));
  function apply(){ var n=0; cards.forEach(function(c){ var ok=(!cat||c.dataset.cat===cat)&&(!q||c.dataset.text.indexOf(q)>-1); c.hidden=!ok; if(ok)n++; }); document.getElementById("none").hidden=n>0; }
  document.querySelectorAll(".chip").forEach(function(b){ b.addEventListener("click",function(){ cat=b.dataset.cat; document.querySelectorAll(".chip").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false");}); apply(); }); });
  document.getElementById("q").addEventListener("input",function(e){ q=e.target.value.trim().toLowerCase(); apply(); });
})();
</script>`});
}

const IMPS = [
  ["loved","Loved it","This was fun to read.",`<path d="M15 26s-10-6.2-10-13.2A5.6 5.6 0 0 1 15 9.3a5.6 5.6 0 0 1 10 3.5C25 19.8 15 26 15 26z" fill="var(--cherry)"/>`],
  ["learned","Learned something","I didn't know that!",`<path d="M15 3a8 8 0 0 0-4.6 14.6V21h9.2v-3.4A8 8 0 0 0 15 3z" fill="var(--butter)" stroke="var(--ink)" stroke-width="1.6"/><path d="M11.5 24h7M12.5 27h5" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round"/>`],
  ["think","Made me think","I see it a bit differently.",`<path d="M5 6h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H13l-6 5v-5H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="13.5" r="1.5" fill="var(--ink)"/><circle cx="15" cy="13.5" r="1.5" fill="var(--ink)"/><circle cx="20" cy="13.5" r="1.5" fill="var(--ink)"/>`],
  ["more","Write more like this","I want a part two!",`<path d="M15 3l3.4 7.2 7.6.9-5.6 5.3 1.5 7.6L15 20.3 8.1 24l1.5-7.6L4 11.1l7.6-.9z" fill="var(--cherry-soft)" stroke="var(--cherry)" stroke-width="1.6" stroke-linejoin="round"/>`],
];

function postPage(p, i) {
  const newer = posts[i-1], older = posts[i+1];
  const url = `${site.url}/posts/${p.slug}/`;
  return page({ title:p.title, desc:p.dek, active:"library", urlPath:`/posts/${p.slug}/`, body:`<div class="wrap post">
  <div class="post-head">
    <a class="back" href="/library/">← All posts</a>
    <span class="pill">${esc(p.category)} · Post no. ${p.number}</span>
    <h1>${esc(p.title)}</h1>
    ${p.dek ? `<p class="dek">${esc(p.dek)}</p>` : ""}
    <div class="meta"><span>By ${esc(site.author)}</span><span>${fmtDate(p.date)}</span><span>${p.minutes} min read</span></div>
    ${p.note ? `<span class="first-note">${esc(p.note)}</span>` : ""}
  </div>
  <div class="body-grid">
    <div class="article"><span class="tape" aria-hidden="true"></span>
${p.html}</div>
    <aside class="side" aria-label="Post at a glance">
      ${p.tags.length ? `<div class="card"><span class="tape r" aria-hidden="true"></span><h3>In this post</h3><div class="stickers">${p.tags.map(t=>`<span class="sticker">${esc(t)}</span>`).join("")}</div></div>` : ""}
      ${p.takeaways.length ? `<div class="card"><h3>Key points</h3><ul class="checks">${p.takeaways.map(t=>`<li>${check}${esc(t)}</li>`).join("")}</ul></div>` : ""}
      <div class="card"><h3>Share for feedback</h3><div class="share-row"><input id="share-url" value="${esc(url)}" readonly aria-label="Link to this post"><button class="btn" id="copy" type="button">Copy link</button></div></div>
    </aside>
  </div>
</div>
<div class="wrap react" id="feedback">
  <section class="react-box" aria-labelledby="react-h" data-slug="${esc(p.slug)}">
    <div class="react-head">
      <span class="hand" style="font-size:26px">psst, I'd love to know what you think!</span>
      <h2 id="react-h" class="section-h">Leave your impression</h2>
      <p>Tap a card to react. Tap it again to undo.</p>
    </div>
    <div class="imps">${IMPS.map(([k,t,s,svg]) => `<button class="imp" type="button" data-kind="${k}" aria-pressed="false"><svg viewBox="0 0 30 30" aria-hidden="true">${svg}</svg><b>${t}</b><span>${s}</span><span class="count" data-count="${k}">&nbsp;</span></button>`).join("")}</div>
    <div>
      <h3 class="section-h" style="font-size:32px">Comments</h3>
      <div class="comments-list" id="comments" style="margin-top:14px"><p class="kind">Loading comments…</p></div>
    </div>
    <form class="form" id="cform" novalidate>
      <div class="form-row">
        <div class="field"><label for="c-name">Your first name <small>(optional)</small></label><input id="c-name" name="name" maxlength="30" autocomplete="given-name" placeholder="e.g. Maya"></div>
        <div class="field"><label for="c-imp">My impression <small>(optional)</small></label>
          <select id="c-imp" name="impression"><option value="">Choose one</option>${IMPS.map(([k,t])=>`<option value="${k}">${t}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label for="c-body">Your comment</label><textarea id="c-body" name="body" maxlength="1000" required placeholder="What did you like? What would you add? Any ideas for my next post?"></textarea></div>
      <div class="hp" aria-hidden="true"><label for="c-web">Website</label><input id="c-web" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="admin-row"><button class="btn" type="submit" id="c-send">Post comment</button><p class="kind">Comments appear after they're approved. Please keep it kind!</p></div>
      <p class="status" id="c-status" role="status" aria-live="polite"></p>
    </form>
  </section>
  <div class="admin-row" style="justify-content:space-between;margin-top:26px">
    ${older ? `<a class="btn ghost" href="/posts/${older.slug}/">← ${esc(older.title)}</a>` : "<span></span>"}
    ${newer ? `<a class="btn ghost" href="/posts/${newer.slug}/">${esc(newer.title)} →</a>` : ""}
  </div>
</div>`, scripts:`<script src="/post.js" defer></script>`});
}

function about() {
  return page({ title:"About me", active:"about", urlPath:"/about/", body:`<div class="wrap about">
  <div class="col">
    <span class="hand" style="font-size:28px">nice to meet you!</span>
    <h1>Hi, I'm the <i>Teen Take</i> writer.</h1>
    <p>I'm in Grade 8 and one day I want to write for a living: ads, brand stories, websites, the words that make people stop scrolling.</p>
    <p>This blog is my practice space. Every week I post one piece. Some are opinions, some are research, and some are experiments where I try writing like a real copywriter.</p>
  </div>
  <div class="col">
    <h2 class="section-h" style="font-size:34px">What you'll find here</h2>
    <div class="cats">
      <div class="cat"><b>Brand Watch</b><span>Why a brand is suddenly everywhere, or suddenly gone.</span></div>
      <div class="cat"><b>Opinion</b><span>Things I agree with, and things I don't.</span></div>
      <div class="cat"><b>Reviews</b><span>Books, ads and products, honestly rated.</span></div>
      <div class="cat"><b>Copy Lab</b><span>Headlines, slogans and product descriptions I write myself.</span></div>
      <div class="cat"><b>Research</b><span>Surveys of my classmates, trend data and interviews.</span></div>
      <div class="cat"><b>Personal</b><span>What I'm learning as a writer.</span></div>
    </div>
  </div>
</div>`});
}

function admin() {
  return page({ title:"Moderation", active:"", urlPath:"/admin/", noindex:true, body:`<div class="wrap admin">
  <h1 class="section-h">Comment moderation</h1>
  <p class="kind">For the blog's owner only. New comments stay hidden until you approve them.</p>
  <form class="admin-row" id="login"><div class="field" style="flex:1 1 260px"><label for="tok">Admin password</label><input id="tok" type="password" autocomplete="current-password"></div><button class="btn" type="submit">Open</button></form>
  <div class="chips" role="group" aria-label="Show"><button class="chip" type="button" data-s="pending" aria-pressed="true">Waiting</button><button class="chip" type="button" data-s="approved" aria-pressed="false">Approved</button></div>
  <p class="status" id="a-status" role="status" aria-live="polite"></p>
  <div class="comments-list" id="list"></div>
</div>`, scripts:`<script src="/admin.js" defer></script>`});
}

// ---------- feed + sitemap ----------
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(site.name)}</title><link>${esc(site.url)}/</link><description>${esc(site.tagline)}</description>
${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${esc(site.url)}/posts/${p.slug}/</link><guid>${esc(site.url)}/posts/${p.slug}/</guid><pubDate>${new Date(p.date+"T12:00:00Z").toUTCString()}</pubDate><description>${esc(p.dek||"")}</description></item>`).join("\n")}
</channel></rss>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/","/library/","/about/"].concat(posts.map(p=>`/posts/${p.slug}/`)).map(u=>`<url><loc>${esc(site.url+u)}</loc></url>`).join("\n")}
</urlset>`;

// ---------- write ----------
fs.rmSync(OUT, { recursive:true, force:true });
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive:true }); fs.writeFileSync(f, content); };
for (const f of fs.readdirSync(path.join(ROOT,"static"))) fs.copyFileSync(path.join(ROOT,"static",f), path.join((fs.mkdirSync(OUT,{recursive:true}),OUT), f));
write("index.html", home());
write("library/index.html", library());
write("about/index.html", about());
write("admin/index.html", admin());
posts.forEach((p,i) => write(`posts/${p.slug}/index.html`, postPage(p,i)));
write("404.html", page({ title:"Page not found", urlPath:"/404", body:`<div class="wrap lib-head"><span class="hand" style="font-size:28px">oops!</span><h1>This page <i>wandered off</i>.</h1><p><a href="/library/">Go to the library</a> to find every post.</p></div>` }));
write("feed.xml", feed);
write("sitemap.xml", sitemap);
write("robots.txt", `User-agent: *\nDisallow: /admin/\nSitemap: ${site.url}/sitemap.xml\n`);
write("_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/admin/*\n  X-Robots-Tag: noindex\n`);
console.log(`Built ${posts.length} post(s): ${posts.map(p=>p.slug).join(", ")}`);
