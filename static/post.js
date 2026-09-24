// Reactions, comments and share link on a post page.
(function () {
  var box = document.querySelector("[data-slug]");
  if (!box) return;
  var slug = box.getAttribute("data-slug");
  var LABELS = { loved: "Loved it", learned: "Learned something", think: "Made me think", more: "Write more like this" };

  // Copy link
  var copy = document.getElementById("copy"), url = document.getElementById("share-url");
  if (copy) copy.addEventListener("click", function () {
    var done = function () { copy.textContent = "Copied!"; setTimeout(function () { copy.textContent = "Copy link"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(url.value).then(done, function () { url.select(); });
    else { url.select(); }
  });

  // Reactions
  var buttons = [].slice.call(document.querySelectorAll(".imp"));
  function paint(data) {
    buttons.forEach(function (b) {
      var k = b.getAttribute("data-kind");
      var n = (data.counts && data.counts[k]) || 0;
      b.querySelector("[data-count]").textContent = n === 1 ? "1 reader" : n + " readers";
      b.setAttribute("aria-pressed", data.mine && data.mine.indexOf(k) > -1 ? "true" : "false");
    });
  }
  fetch("/api/reactions?post=" + encodeURIComponent(slug)).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) paint(d); }).catch(function () {});
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      b.disabled = true;
      fetch("/api/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post: slug, kind: b.getAttribute("data-kind") }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d) paint(d); })
        .catch(function () {})
        .then(function () { b.disabled = false; });
    });
  });

  // Comments
  var list = document.getElementById("comments");
  function fmt(ts) { try { return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function render(items) {
    list.textContent = "";
    if (!items.length) { var p = document.createElement("p"); p.className = "kind"; p.textContent = "No comments yet. Be the first!"; list.appendChild(p); return; }
    items.forEach(function (c) {
      var el = document.createElement("div"); el.className = "cmt";
      var who = document.createElement("div"); who.className = "who";
      var b = document.createElement("b"); b.textContent = c.name || "A reader"; who.appendChild(b);
      if (c.impression && LABELS[c.impression]) { var t = document.createElement("span"); t.className = "tag " + c.impression; t.textContent = LABELS[c.impression]; who.appendChild(t); }
      var tm = document.createElement("time"); tm.textContent = fmt(c.created_at); who.appendChild(tm);
      var body = document.createElement("p"); body.textContent = c.body;
      el.appendChild(who); el.appendChild(body); list.appendChild(el);
    });
  }
  fetch("/api/comments?post=" + encodeURIComponent(slug)).then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { render(d.comments || []); })
    .catch(function () { list.textContent = ""; var p = document.createElement("p"); p.className = "kind"; p.textContent = "Comments couldn't load right now."; list.appendChild(p); });

  var form = document.getElementById("cform"), status = document.getElementById("c-status"), send = document.getElementById("c-send");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = form.body.value.trim();
    status.className = "status";
    if (body.length < 2) { status.className = "status bad"; status.textContent = "Please write a comment first."; form.body.focus(); return; }
    send.disabled = true; status.textContent = "Sending…";
    fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post: slug, name: form.name.value.trim(), impression: form.impression.value, body: body, website: form.website.value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) { status.className = "status ok"; status.textContent = "Thank you! Your comment will show up once it's approved."; form.body.value = ""; form.impression.value = ""; }
        else { status.className = "status bad"; status.textContent = res.d.error || "Your comment wasn't sent. Please try again."; }
      })
      .catch(function () { status.className = "status bad"; status.textContent = "Your comment wasn't sent. Check your connection and try again."; })
      .then(function () { send.disabled = false; });
  });
})();
