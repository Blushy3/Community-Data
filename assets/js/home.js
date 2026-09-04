/* ============================================================
   Home page rendering â€” site.json + featured panels + snapshot.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function buildSnapshot() {
    var users = (CH.state.users || []).filter(function (u) { return u && u.id; });
    var achievements = (CH.state.achievements || []).filter(function (a) { return a && a.id && a.published !== false; });
    var projects = (CH.state.other || []).filter(function (p) { return p && p.id && p.published !== false; });

    var cards = [
      { label: CH.t("home.snapshotMembers"), value: users.length },
      { label: CH.t("home.snapshotAchievements"), value: achievements.length },
      { label: CH.t("home.snapshotProjects"), value: projects.length }
    ];

    var grid = document.getElementById("snapshotGrid");
    var section = document.getElementById("snapshotSection");
    if (!grid || !section) return;
    grid.innerHTML = "";

    cards.forEach(function (c) {
      var card = CH.el("div", "card user-card");
      var num = CH.el("div", null, String(c.value));
      num.style.fontSize = "2rem";
      num.style.fontWeight = "700";
      num.style.color = "var(--accent)";
      card.appendChild(num);
      card.appendChild(CH.el("div", "role", c.label));
      grid.appendChild(card);
    });
    section.hidden = false;
  }

  function findById(list, id) {
    if (!id) return null;
    var out = null;
    (list || []).forEach(function (item) {
      if (item && item.id === id) out = item;
    });
    return out;
  }

  function linkPanel(title, name, desc, href, label) {
    var box = CH.el("div", "card featured-panel");
    box.appendChild(CH.el("h3", null, title));
    if (name) box.appendChild(CH.el("div", "role", name));
    if (desc) box.appendChild(CH.el("p", null, desc));
    var safe = href ? CH.safeUrl(href) : "";
    if (safe && label) {
      var a = CH.el("a", "cta", label);
      a.href = safe;
      if (/^https?:/.test(safe)) { a.target = "_blank"; a.rel = "noopener"; }
      box.appendChild(a);
    }
    return box;
  }

  function buildFeatured() {
    var grid = document.getElementById("featuredGrid");
    if (!grid) return;
    grid.innerHTML = "";
    var site = CH.state.site || {};

    var featUser = findById(CH.state.users, site.featuredUser);
    if (featUser && featUser.id) {
      grid.appendChild(linkPanel(
        CH.t("home.featuredUser"),
        featUser.name,
        featUser.bio,
        featUser.profile,
        CH.t("users.viewProfile")
      ));
    }

    var featAch = findById(CH.state.achievements, site.featuredAchievement);
    if (featAch && featAch.id) {
      grid.appendChild(linkPanel(
        CH.t("home.featuredAchievement"),
        featAch.name,
        featAch.description,
        "./achievements/",
        CH.t("nav.achievements")
      ));
    }

    var featProj = findById(CH.state.other, site.featuredProject);
    if (featProj && featProj.id) {
      grid.appendChild(linkPanel(
        CH.t("home.featuredProject"),
        featProj.title,
        featProj.description,
        featProj.url,
        CH.t("other.open")
      ));
    }
  }

  function applySite() {
    var site = CH.state.site;
    if (!site) return;
    setText("brandName", site.communityName);
    setText("communityName", site.communityName);
    setText("year", new Date().getFullYear());

    var discord = document.getElementById("discordBtn");
    if (discord && site.discordUrl && /^https?:/.test(site.discordUrl)) discord.href = site.discordUrl;
  }

  function loadAll() {
    var pSite = CH.fetchJSON("data/site.json");
    var pUsers = CH.fetchJSON("data/users.json");
    var pAch = CH.fetchJSON("data/achievements.json");
    
    var pOther = CH.fetchJSON("data/other.json");

    Promise.all([pSite, pUsers, pAch, pOther]).then(function (r) {
      CH.state.site = r[0] || {};
      CH.state.users = Array.isArray(r[1]) ? r[1] : [];
      CH.state.achievements = Array.isArray(r[2]) ? r[2] : [];
      CH.state.other = Array.isArray(r[3]) ? r[3] : [];

      applySite();
      buildSnapshot();
      buildFeatured();

      var noFeatured = !document.querySelector("#featuredGrid .card");
      if (noFeatured) {
        var grid = document.getElementById("featuredGrid");
        if (grid) grid.appendChild(CH.emptyState(CH.t("home.noFeatured")));
      }
    });

    document.addEventListener("ch:langchange", function () {
      if (CH.state.site) {
        buildSnapshot();
        buildFeatured();
        var grid = document.getElementById("featuredGrid");
        if (grid && !grid.children.length) {
          grid.appendChild(CH.emptyState(CH.t("home.noFeatured")));
        }
      }
    });
  }

  if (window.CH && CH.fetchJSON) {
    CH.onReady(loadAll);
  }
})();





