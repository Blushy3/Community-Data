/* ============================================================
   Home page rendering — site.json + stats + featured + marquee.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  var ICONS = {
    members: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
  };

  function statCard(iconSvg, value, label) {
    var card = CH.el("div", "card stat-card");
    var icon = CH.el("div", "stat-icon");
    icon.innerHTML = iconSvg;
    card.appendChild(icon);
    var num = CH.el("div", "stat-value", "0");
    num.setAttribute("data-target", String(value));
    card.appendChild(num);
    card.appendChild(CH.el("div", "stat-label", label));
    return card;
  }

  function buildSnapshot() {
    var users = (CH.state.users || []).filter(function (u) { return u && u.id; });
    var achievements = (CH.state.achievements || []).filter(function (a) { return a && a.id && a.published !== false; });
    var projects = (CH.state.other || []).filter(function (p) { return p && p.id && p.published !== false; });

    var grid = document.getElementById("snapshotGrid");
    var section = document.getElementById("snapshotSection");
    if (!grid || !section) return;
    grid.innerHTML = "";
    grid.appendChild(statCard(ICONS.members, users.length, CH.t("home.snapshotMembers")));
    grid.appendChild(statCard(ICONS.star, achievements.length, CH.t("home.snapshotAchievements")));
    grid.appendChild(statCard(ICONS.box, projects.length, CH.t("home.snapshotProjects")));

    Array.prototype.forEach.call(grid.querySelectorAll(".stat-value"), function (el) {
      CH.countUp(el, parseInt(el.getAttribute("data-target"), 10) || 0);
    });
    CH.stagger(grid.children, 120, 110);

    section.hidden = false;
  }

  function buildMarquee() {
    var track = document.getElementById("achMarquee");
    if (!track) return;
    track.innerHTML = "";
    var list = (CH.state.achievements || []).filter(function (a) { return a && a.published !== false && a.icon; });
    if (!list.length) return;
    for (var pass = 0; pass < 2; pass++) {
      list.forEach(function (a) {
        var img = new Image();
        img.src = CH.asset(a.icon);
        img.alt = "";
        img.loading = "lazy";
        img.title = a.name || "";
        track.appendChild(img);
      });
    }
  }
  function findById(list, id) {
    if (!id) return null;
    var out = null;
    (list || []).forEach(function (item) {
      if (item && item.id === id) out = item;
    });
    return out;
  }

  function linkPanel(kicker, name, desc, href, label) {
    var box = CH.el("div", "card featured-panel");
    box.appendChild(CH.el("div", "fp-kicker", kicker));
    if (name) box.appendChild(CH.el("h3", "fp-name", name));
    if (desc) box.appendChild(CH.el("p", "fp-desc", desc));
    var safe = href ? CH.safeUrl(href) : "";
    if (safe && label) {
      var a = CH.el("a", "cta", label);
      a.href = safe;
      a.appendChild(CH.el("span", "cta-arrow", "\u2192"));
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
        "./pages/achievements/",
        CH.t("nav.achievements")
      ));
    }

    var featProj = findById(CH.state.other, site.featuredProject);
    if (featProj && featProj.id) {
      grid.appendChild(linkPanel(
        CH.t("home.featuredProject"),
        featProj.title,
        featProj.description,
        featProj.page,
        CH.t("other.open")
      ));
    }

    if (grid.children.length) CH.stagger(grid.children, 120, 100);
  }

  function applySite() {
    var site = CH.state.site;
    if (!site) return;
    setText("brandName", site.communityName);
    setText("communityName", site.communityName);
    setText("footerBrand", site.communityName);
    if (site.communityName) document.title = site.communityName;
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
      buildMarquee();

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
        buildMarquee();
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
