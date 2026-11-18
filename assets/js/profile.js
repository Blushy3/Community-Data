/* ============================================================
   Profile page — member file rendered from ?id=.
   Data: data/users.json + data/achievements.json + site.json.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function getParam(name) {
    var q = window.location.search.substring(1).split("&");
    for (var i = 0; i < q.length; i++) {
      var p = q[i].split("=");
      if (p[0] === name) return decodeURIComponent((p[1] || "").replace(/\+/g, " "));
    }
    return null;
  }

  function userAchievements(uid) {
    return (CH.state.achievements || []).filter(function (a) {
      return a && a.published !== false && (a.users || []).indexOf(uid) !== -1;
    });
  }

  function pad(n) {
    return ("0" + n).slice(-2);
  }

  function render() {
    var uid = getParam("id");
    var container = document.getElementById("profileContent");
    if (!container) return;

    if (!uid) {
      container.innerHTML = "<p class=\"profile-msg\">" + CH.escapeHtml(CH.t("profile.noUserSpecified")) + "</p>";
      return;
    }

    var user = null;
    var userIndex = -1;
    (CH.state.users || []).forEach(function (u, i) {
      if (u && u.id === uid) { user = u; userIndex = i; }
    });

    if (!user) {
      container.innerHTML = "<p class=\"profile-msg\">" + CH.escapeHtml(CH.t("profile.userNotFound")) + "</p>";
      return;
    }

    var ach = userAchievements(uid);
    var total = (CH.state.achievements || []).filter(function (a) {
      return a && a.published !== false;
    }).length;
    var pct = total ? Math.min(100, Math.round(ach.length / total * 100)) : 0;

    var html = "";
    html += "<a href=\"../users/\" class=\"back-link\">&larr; " + CH.escapeHtml(CH.t("profile.backToUsers")) + "</a>";

    html += "<header class=\"profile-head\">";
    html += "<div class=\"profile-ident\">";
    html += "<span class=\"profile-avatar\" aria-hidden=\"true\">" + CH.escapeHtml(CH.initials(user.name || user.id)) + "</span>";
    html += "<div>";
    html += "<p class=\"section-label\">Member file / " + pad(userIndex + 1) + "</p>";
    html += "<h1 class=\"profile-name\">" + CH.escapeHtml(user.name || user.id) + "</h1>";
    if (user.role) {
      html += "<span class=\"role" + (/admin/i.test(user.role) ? " role-admin" : "") + "\">" + CH.escapeHtml(user.role) + "</span>";
    }
    html += "</div></div>";

    html += "<div class=\"profile-progress\" role=\"group\" aria-label=\"" + CH.escapeHtml(CH.t("profile.achievements")) + "\">";
    html += "<div class=\"pp-track\"><i style=\"--w:" + pct + "%\"></i></div>";
    html += "<span class=\"pp-label\"><b>" + ach.length + "</b> / " + total + " " + CH.escapeHtml(CH.t("users.achievements")) + "</span>";
    html += "</div>";
    html += "</header>";

    if (user.bio) html += "<p class=\"profile-bio\">" + CH.escapeHtml(user.bio) + "</p>";

    // rarity breakdown of unlocked achievements
    var byRarity = {};
    ach.forEach(function (a) {
      var k = a.rarity ? String(a.rarity).toLowerCase().replace(/[^a-z]/g, "") : "other";
      if (!byRarity[k]) byRarity[k] = { label: a.rarity || "\u2014", count: 0, color: CH.rarityColor(a.rarity) };
      byRarity[k].count++;
    });
    var rKeys = Object.keys(byRarity);
    if (rKeys.length) {
      html += "<div class=\"profile-rarity-row\">";
      rKeys.forEach(function (k) {
        var item = byRarity[k];
        html += "<span class=\"badge badge-rarity\" style=\"--glow:" + CH.escapeHtml(item.color) + "\">" +
          CH.escapeHtml(item.label) + " \u00D7 " + item.count + "</span>";
      });
      html += "</div>";
    }

    html += "<section class=\"profile-ach-section\" aria-labelledby=\"profileAchTitle\">";
    html += "<h2 class=\"profile-ach-title\" id=\"profileAchTitle\">" + CH.escapeHtml(CH.t("profile.achievements")) +
      "<span class=\"ach-count\">" + ach.length + "</span></h2>";
    if (!ach.length) {
      html += "<p class=\"profile-ach-empty\">" + CH.escapeHtml(CH.t("profile.noAchievements")) + "</p>";
    } else {
      html += "<div class=\"profile-ach-grid\">";
      ach.forEach(function (a) {
        html += "<article class=\"profile-ach-item\" style=\"--glow:" + CH.escapeHtml(CH.rarityColor(a.rarity)) + "\">";
        html += "<div class=\"ach-frame\"><img class=\"icon\" src=\"" + CH.escapeHtml(CH.asset(a.icon)) + "\" alt=\"\" loading=\"lazy\" onerror=\"this.style.visibility='hidden'\"></div>";
        html += "<div class=\"ach-txt\"><h3 class=\"profile-ach-name\">" + CH.escapeHtml(a.name || a.id) + "</h3>";
        if (a.description) html += "<p class=\"profile-ach-desc\">" + CH.escapeHtml(a.description) + "</p>";
        if (a.rarity) {
          html += "<span class=\"badge badge-rarity\" style=\"--glow:" + CH.escapeHtml(CH.rarityColor(a.rarity)) + "\">" + CH.escapeHtml(a.rarity) + "</span>";
        }
        html += "</div></article>";
      });
      html += "</div>";
    }
    html += "</section>";

    container.innerHTML = html;
    CH.stagger(container.querySelectorAll(".profile-ach-item"), 60, 40);

    var siteName = (CH.state.site && CH.state.site.communityName) || "Community Data";
    document.title = (user.name || user.id) + " \u2014 " + siteName;
  }

  function load() {
    Promise.all([
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[2] || {};
      CH.bindChrome();
      if (!Array.isArray(r[0]) || !Array.isArray(r[1])) {
        var container = document.getElementById("profileContent");
        if (container) CH.writeError(container);
        return;
      }
      CH.state.achievements = r[1];
      CH.state.users = r[0];
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.CH || !CH.fetchJSON) return;
    CH.onReady(load);
    document.addEventListener("ch:langchange", function () {
      if (CH.state.users.length) render();
    });
  });
})();
