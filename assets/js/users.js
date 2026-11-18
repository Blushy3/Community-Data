/* ============================================================
   Users directory â€” search + sort, profile navigation.
   Data: data/users.json + data/achievements.json.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function userAchievements(uid) {
    return (CH.state.achievements || []).filter(function (a) {
      return a && a.published !== false && (a.users || []).indexOf(uid) !== -1;
    });
  }

  // "1 achievement" / "4 achievements" without touching the JSON.
  function achievementLabel(n) {
    if (n === 1) {
      var one = CH.t("users.achievement");
      return "1 " + (one === "users.achievement" ? "achievement" : one);
    }
    return n + " " + CH.t("users.achievements");
  }

  function fillSort() {
    var sel = document.getElementById("sortFilter");
    if (!sel) return;
    sel.innerHTML = "";
    var defs = [
      ["", "users.sortDefault"],
      ["name", "users.sortName"],
      ["achievements", "users.sortAchievements"],
      ["role", "users.sortRole"]
    ];
    defs.forEach(function (d) {
      var o = document.createElement("option");
      o.value = d[0];
      o.textContent = d[0] ? CH.t(d[1]) : CH.t("common.sort") + " \u00B7 " + CH.t(d[1]);
      sel.appendChild(o);
    });
  }

  function filtered() {
    var input = document.getElementById("searchInput");
    var q = (input ? input.value : "").toLowerCase().trim();
    var sortSel = document.getElementById("sortFilter");
    var sort = sortSel ? sortSel.value : "";

    var list = (CH.state.users || []).filter(function (u) {
      if (!u || !u.id) return false;
      if (q) {
        var hay = ((u.name || "") + " " + (u.bio || "") + " " + (u.role || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (sort === "name") {
      list.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
    } else if (sort === "achievements") {
      list.sort(function (a, b) { return userAchievements(b.id).length - userAchievements(a.id).length; });
    } else if (sort === "role") {
      list.sort(function (a, b) {
        var ra = /admin/i.test(a.role || "") ? 1 : 0;
        var rb = /admin/i.test(b.role || "") ? 1 : 0;
        return rb - ra;
      });
    }
    return list;
  }

  function render() {
    var grid = document.getElementById("userGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var list = filtered();
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t(CH.state.users.length ? "common.noResults" : "users.empty")));
      return;
    }

    list.forEach(function (u) {
      var card = CH.el("div", "card user-card");
      card.setAttribute("data-user-id", u.id);
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", (u.name || u.id) + " \u2014 " + CH.t("users.viewProfile"));

      var avatar = CH.el("span", "avatar", CH.initials(u.name || u.id));
      avatar.style.background = CH.avatarGradient(u.name || u.id);
      avatar.setAttribute("aria-hidden", "true");
      card.appendChild(avatar);

      var body = CH.el("div", "user-body");
      var top = CH.el("div", "user-top");
      top.appendChild(CH.el("h2", null, u.name || u.id));
      if (u.role) {
        top.appendChild(CH.el("span", "role" + (/admin/i.test(u.role) ? " role-admin" : ""), u.role));
      }
      body.appendChild(top);
      if (u.bio) body.appendChild(CH.el("p", "bio", u.bio));

      var meta = CH.el("div", "meta");
      meta.appendChild(CH.el("span", null, achievementLabel(userAchievements(u.id).length)));
      body.appendChild(meta);
      card.appendChild(body);

      var arrow = CH.el("span", "card-arrow", "\u2192");
      arrow.setAttribute("aria-hidden", "true");
      card.appendChild(arrow);

      function open() {
        window.location.href = "../profile/?id=" + encodeURIComponent(u.id);
      }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });

      grid.appendChild(card);
    });

    CH.stagger(grid.children, 20, 35);
  }

  function load() {
    Promise.all([
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[2] || {};
      CH.state.achievements = Array.isArray(r[1]) ? r[1] : [];
      CH.state.users = Array.isArray(r[0]) ? r[0] : [];
      CH.bindChrome();
      if (!Array.isArray(r[0])) {
        var grid = document.getElementById("userGrid");
        if (grid) CH.writeError(grid);
        return;
      }
      var statsEl = document.getElementById("userStats");
      if (statsEl) statsEl.textContent = CH.state.users.length + " " + CH.t("home.snapshotMembers");
      fillSort();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.CH || !CH.fetchJSON) return;
    var search = document.getElementById("searchInput");
    if (search) search.addEventListener("input", CH.debounce(render, 160));
    var sortSel = document.getElementById("sortFilter");
    if (sortSel) sortSel.addEventListener("change", render);
    document.addEventListener("ch:langchange", function () {
      if (CH.state.users.length) { fillSort(); render(); }
    });
    CH.onReady(load);
  });
})();
