/* ============================================================
   Profile page — hero card + achievements, data from URL param.
   ============================================================ */
(function () {
  "use strict";
  var CH = window.CH;

  function getParam(name) {
    var q = window.location.search.substring(1).split("&");
    for (var i = 0; i < q.length; i++) {
      var p = q[i].split("=");
      if (p[0] === name) return decodeURIComponent(p[1]);
    }
    return null;
  }

  function userAchievements(uid) {
    var out = [];
    (CH.state.achievements || []).forEach(function (a) {
      if (!a || a.published === false) return;
      var h = (a.users || []).indexOf(uid) !== -1;
      if (h) out.push(a);
    });
    return out;
  }
  function render() {
    var uid = getParam("id");
    var container = document.getElementById("profileContent");
    if (!container) return;
    if (!uid) { container.innerHTML = "<p class=\"profile-msg\">" + CH.escapeHtml(CH.t("profile.noUserSpecified")) + "</p>"; return; }
    var user = null;
    (CH.state.users || []).forEach(function (u) { if (u.id === uid) user = u; });
    if (!user) { container.innerHTML = "<p class=\"profile-msg\">" + CH.escapeHtml(CH.t("profile.userNotFound")) + "</p>"; return; }

    var ach = userAchievements(uid);
    var total = (CH.state.achievements || []).filter(function (a) { return a && a.published !== false; }).length;
    var pct = total ? Math.min(100, Math.round(ach.length / total * 100)) : 0;

    var html = "";
    html += "<a href=\"../users/\" class=\"btn btn-ghost back-link\">&larr; " + CH.escapeHtml(CH.t("profile.backToUsers")) + "</a>";
    html += "<div class=\"profile-head-simple\">";
    html += "<h1 class=\"profile-name\">" + CH.escapeHtml(user.name) + "</h1>";
    if (user.role) html += "<span class=\"role\">" + CH.escapeHtml(user.role) + "</span>";
    html += "</div>";
    if (user.bio) html += "<p class=\"profile-bio\">" + CH.escapeHtml(user.bio) + "</p>";

    // progress: X of all published achievements
    html += "<div class=\"profile-progress\" role=\"group\" aria-label=\"" + CH.escapeHtml(CH.t("profile.achievements")) + "\">";
    html += "<div class=\"pp-track\"><i style=\"--w:" + pct + "%\"></i></div>";
    html += "<span class=\"pp-label\"><b>" + ach.length + "</b> / " + total + "</span>";
    html += "</div>";

    // rarity breakdown of unlocked achievements
    var byRarity = {};
    ach.forEach(function (a) {
      var k = a.rarity ? String(a.rarity).toLowerCase().replace(/[^a-z]/g, "") : "other";
      if (!byRarity[k]) byRarity[k] = { label: a.rarity || "?", count: 0, color: CH.rarityColor(a.rarity) };
      byRarity[k].count++;
    });
    var rKeys = Object.keys(byRarity);
    if (rKeys.length) {
      html += "<div class=\"profile-rarity-row\">";
      rKeys.forEach(function (k) {
        var item = byRarity[k];
        html += "<span class=\"badge badge-rarity\" style=\"--glow:" + item.color + "\">" + CH.escapeHtml(item.label) + " × " + item.count + "</span>";
      });
      html += "</div>";
    }

    html += "<section class=\"profile-ach-section\">";
    html += "<h2 class=\"profile-ach-title\">" + CH.escapeHtml(CH.t("profile.achievements")) + "<span class=\"ach-count\">" + ach.length + "</span></h2>";
    if (!ach.length) {
      html += "<p class=\"profile-ach-empty\">" + CH.escapeHtml(CH.t("profile.noAchievements")) + "</p>";
    } else {
      html += "<div class=\"profile-ach-grid\">";
      ach.forEach(function (a) {
        html += "<div class=\"profile-ach-item\" style=\"--glow:" + CH.rarityColor(a.rarity) + "\">";
        html += "<div class=\"ach-frame\"><img class=\"icon\" src=\"" + CH.escapeHtml(CH.asset(a.icon)) + "\" alt=\"" + CH.escapeHtml(a.name) + "\" loading=\"lazy\" onerror=\"this.style.display='none'\"></div>";
        html += "<div class=\"ach-txt\"><div class=\"profile-ach-name\">" + CH.escapeHtml(a.name) + "</div>";
        html += "<div class=\"profile-ach-desc\">" + CH.escapeHtml(a.description) + "</div>";
        if (a.rarity) html += "<span class=\"badge badge-rarity\">" + CH.escapeHtml(a.rarity) + "</span>";
        html += "</div></div>";
      });
      html += "</div>";
    }
    html += "</section>";

    container.innerHTML = html;
    CH.stagger(container.querySelectorAll(".profile-ach-item"), 150, 60);
  }

  function load() {
    Promise.all([
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[2] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      document.getElementById("year").textContent = new Date().getFullYear();
      if (!Array.isArray(r[0]) || !Array.isArray(r[1])) {
        var container = document.getElementById("profileContent");
        if (container) container.appendChild(CH.emptyState(CH.t("common.error")));
        return;
      }
      CH.state.achievements = r[1];
      CH.state.users = r[0];
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      CH.onReady(load);
      document.addEventListener("ch:langchange", function () { if (CH.state.users.length) render(); });
    }
  });

})();
