/* Users directory + profile modal */
(function () {
  "use strict";
  var CH = window.CH;
  function userAchievements(uid) {
    var out = [];
    (CH.state.achievements || []).forEach(function (a) {
      if (!a || a.published === false) return;
      var h = (a.users || []).indexOf(uid) !== -1;
      if (h) out.push(a);
    });
    return out;
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
      o.textContent = CH.t("common.sort") + " · " + CH.t(d[1]);
      sel.appendChild(o);
    });
  }

  function filtered() {
    var q = (document.getElementById("searchInput").value || "").toLowerCase().trim();
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
    if (!list.length) { grid.appendChild(CH.emptyState(CH.t("users.empty"))); return; }
    list.forEach(function (u) {
      var card = CH.el("div", "card user-card");
      card.setAttribute("data-user-id", u.id);
      card.tabIndex = 0;

      var avatar = CH.el("div", "avatar", CH.initials(u.name));
      avatar.style.background = CH.avatarGradient(u.name);
      avatar.setAttribute("aria-hidden", "true");
      card.appendChild(avatar);

      card.appendChild(CH.el("h3", null, u.name));
      if (u.role) card.appendChild(CH.el("span", "role" + (/admin/i.test(u.role) ? " role-admin" : ""), u.role));
      if (u.bio) card.appendChild(CH.el("p", "bio", u.bio));

      var m = CH.el("div", "meta");
      m.appendChild(CH.el("span", null, userAchievements(u.id).length + " " + CH.t("users.achievements")));
      card.appendChild(m);

      card.appendChild(CH.el("span", "card-arrow", "\u2192"));

      function open() { window.location.href = "../profile/?id=" + encodeURIComponent(u.id); }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      grid.appendChild(card);
    });
    CH.stagger(grid.children);
  }
  function load() {
    Promise.all([
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[2] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      CH.state.achievements = Array.isArray(r[1]) ? r[1] : [];
      CH.state.users = Array.isArray(r[0]) ? r[0] : [];
      document.getElementById("year").textContent = new Date().getFullYear();
      if (!Array.isArray(r[0])) { var grid = document.getElementById("userGrid"); if (grid) grid.appendChild(CH.emptyState(CH.t("common.error"))); return; }
      var statsEl = document.getElementById("userStats");
      if (statsEl) statsEl.textContent = CH.state.users.length + " " + CH.t("home.snapshotMembers");
      fillSort();
      render();
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      document.getElementById("searchInput").addEventListener("input", CH.debounce(render, 160));
      var sortSel = document.getElementById("sortFilter");
      if (sortSel) sortSel.addEventListener("change", render);
      document.addEventListener("ch:langchange", function () {
        if (CH.state.users.length) { fillSort(); render(); }
      });
      CH.onReady(load);
    }
  });
})();






