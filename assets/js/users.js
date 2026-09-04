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
  function filtered() {
    var q = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    return (CH.state.users || []).filter(function (u) {
      if (!u || !u.id) return false;
      if (q) {
        var hay = ((u.name || "") + " " + (u.bio || "") + " " + (u.role || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
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
      card.appendChild(CH.el("h3", null, u.name));
      if (u.role) card.appendChild(CH.el("div", "role", u.role));
      if (u.bio) card.appendChild(CH.el("p", "bio", u.bio));
      var m = CH.el("div", "meta");
      m.appendChild(CH.el("span", null, userAchievements(u.id).length + " " + CH.t("users.achievements")));
      card.appendChild(m);
      card.addEventListener("click", function () { window.location.href = "../profile/?id=" + u.id; });
      card.style.cursor = "pointer";
      grid.appendChild(card);
    });
  }
  function load() {
    Promise.all([
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[3] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      CH.state.achievements = Array.isArray(r[1]) ? r[1] : [];
      CH.state.users = Array.isArray(r[0]) ? r[0] : [];
      document.getElementById("year").textContent = new Date().getFullYear();
      if (!Array.isArray(r[0])) { var grid = document.getElementById("userGrid"); if (grid) grid.appendChild(CH.emptyState(CH.t("common.error"))); return; }
      render();
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      document.getElementById("searchInput").addEventListener("input", render);
      document.addEventListener("ch:langchange", function () { if (CH.state.users.length) render(); });
      CH.onReady(load);
    }
  });
})();






