// Moderation page: approve or delete comments. The password is kept only for this browser tab.
(function () {
  var tok = "", show = "pending";
  try { tok = sessionStorage.getItem("ttt-admin") || ""; } catch (e) {}
  var list = document.getElementById("list"), status = document.getElementById("a-status");
  function say(t, cls) { status.className = "status " + (cls || ""); status.textContent = t; }
  function api(method, body) {
    return fetch("/api/admin" + (method === "GET" ? "?status=" + show : ""), {
      method: method, headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { if (r.status === 401) throw new Error("auth"); if (!r.ok) throw new Error("fail"); return r.json(); });
  }
  function load() {
    if (!tok) { say("Enter the admin password to see comments."); return; }
    say("Loading…");
    api("GET").then(function (d) {
      list.textContent = "";
      var items = d.comments || [];
      say(items.length ? items.length + (show === "pending" ? " waiting for approval." : " approved.") : (show === "pending" ? "Nothing waiting. All caught up!" : "No approved comments yet."), "ok");
      items.forEach(function (c) {
        var el = document.createElement("div"); el.className = "cmt";
        var who = document.createElement("div"); who.className = "who";
        var b = document.createElement("b"); b.textContent = c.name || "A reader"; who.appendChild(b);
        var s = document.createElement("span"); s.className = "tag"; s.textContent = "on: " + c.post; who.appendChild(s);
        if (c.impression) { var t = document.createElement("span"); t.className = "tag " + c.impression; t.textContent = c.impression; who.appendChild(t); }
        var tm = document.createElement("time"); tm.textContent = new Date(c.created_at).toLocaleString(); who.appendChild(tm);
        var p = document.createElement("p"); p.textContent = c.body;
        var act = document.createElement("div"); act.className = "actions";
        if (show === "pending") { var ok = document.createElement("button"); ok.className = "btn"; ok.type = "button"; ok.textContent = "Approve"; ok.onclick = function () { act2(c.id, "approve", el); }; act.appendChild(ok); }
        var del = document.createElement("button"); del.className = "btn ghost"; del.type = "button"; del.textContent = "Delete";
        del.onclick = function () {
          if (del.dataset.armed) { act2(c.id, "delete", el); return; }
          del.dataset.armed = "1"; del.className = "btn danger"; del.textContent = "Click again to delete";
        };
        act.appendChild(del);
        el.appendChild(who); el.appendChild(p); el.appendChild(act); list.appendChild(el);
      });
    }).catch(function (e) {
      if (e.message === "auth") { tok = ""; try { sessionStorage.removeItem("ttt-admin"); } catch (x) {} say("That password didn't work. Try again.", "bad"); }
      else say("Couldn't load comments. Check that the database is connected.", "bad");
    });
  }
  function act2(id, action, el) {
    api("POST", { id: id, action: action }).then(function () { el.remove(); say(action === "approve" ? "Approved. It's now live on the post." : "Deleted.", "ok"); })
      .catch(function () { say("That didn't work. Try again.", "bad"); });
  }
  document.getElementById("login").addEventListener("submit", function (e) {
    e.preventDefault(); tok = document.getElementById("tok").value.trim();
    try { sessionStorage.setItem("ttt-admin", tok); } catch (x) {}
    load();
  });
  document.querySelectorAll("[data-s]").forEach(function (b) {
    b.addEventListener("click", function () { show = b.dataset.s; document.querySelectorAll("[data-s]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); load(); });
  });
  load();
})();
