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
    if (!uid) { container.innerHTML = "<p class=\"profile-msg\">" + CH.t("profile.noUserSpecified") + "</p>"; return; }
    var user = null;
    (CH.state.users || []).forEach(function (u) { if (u.id === uid) user = u; });
    if (!user) { container.innerHTML = "<p class=\"profile-msg\">" + CH.t("profile.userNotFound") + "</p>"; return; }

    var ach = userAchievements(uid);

    var html = "";
    html += "<a href=\"../users/\" class=\"btn btn-ghost back-link\">&larr; " + CH.t("profile.backToUsers") + "</a>";
    html += "<div class=\"profile-head-simple\">";
    html += "<h1 class=\"profile-name\">" + CH.escapeHtml(user.name) + "</h1>";
    if (user.role) html += "<span class=\"role\">" + CH.escapeHtml(user.role) + "</span>";
    html += "</div>";

    html += "<section class=\"profile-ach-section\">";
    html += "<h2 class=\"profile-ach-title\">" + CH.t("profile.achievements") + "<span class=\"ach-count\">" + ach.length + "</span></h2>";
    if (!ach.length) {
      html += "<p class=\"profile-ach-empty\">" + CH.t("profile.noAchievements") + "</p>";
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

    var edit = document.createElement("button");
    edit.className = "btn btn-ghost profile-edit";
    edit.textContent = CH.t("profile.editProfile");
    edit.addEventListener("click", function () { CH.showToast("common.comingSoon", "common.comingSoonDesc"); });
    container.appendChild(edit);
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
