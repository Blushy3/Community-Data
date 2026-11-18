/* ============================================================
   Home page rendering.
   Everything on the page is generated from the existing JSON:
     data/site.json        → name, tagline, Discord, featured ids
     data/users.json       → overview count + members preview
     data/achievements.json→ overview count + achievements preview
     data/other.json       → overview count + projects preview
   Featured items (site.featuredUser / featuredAchievement /
   featuredProject) are pinned first when configured.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;
  var MEMBERS_PREVIEW = 6;
  var ACHIEVEMENTS_PREVIEW = 6;

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node && value != null) node.textContent = value;
  }

  function pad(n) {
    return ("0" + n).slice(-2);
  }

  function published(list) {
    return (list || []).filter(function (item) {
      return item && item.id && item.published !== false;
    });
  }

  function byOrder(a, b) {
    return (a.order || 0) - (b.order || 0);
  }

  function pinnedFirst(list, id, limit) {
    var out = list.slice();
    if (id) {
      out.sort(function (a, b) {
        var am = a.id === id ? 1 : 0;
        var bm = b.id === id ? 1 : 0;
        return bm - am;
      });
    }
    return limit ? out.slice(0, limit) : out;
  }

  function achievementsOf(userId) {
    return published(CH.state.achievements).filter(function (a) {
      return (a.users || []).indexOf(userId) !== -1;
    }).length;
  }

  // "1 achievement" / "4 achievements" without changing the JSON.
  function memberMetaLabel(n) {
    if (n === 1) {
      var one = CH.t("users.achievement");
      return "1 " + (one === "users.achievement" ? "achievement" : one);
    }
    return n + " " + CH.t("users.achievements");
  }

  /* ---------- A. overview stats ---------- */
  function buildStats() {
    var grid = document.getElementById("snapshotGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var defs = [
      { value: (CH.state.users || []).filter(function (u) { return u && u.id; }).length, label: "home.snapshotMembers" },
      { value: published(CH.state.achievements).length, label: "home.snapshotAchievements" },
      { value: published(CH.state.other).length, label: "home.snapshotProjects" }
    ];

    defs.forEach(function (def, i) {
      var stat = CH.el("div", "stat");
      stat.appendChild(CH.el("span", "stat-index", pad(i + 1)));
      var num = CH.el("span", "stat-value", "0");
      num.setAttribute("data-target", String(def.value));
      stat.appendChild(num);
      stat.appendChild(CH.el("span", "stat-label", CH.t(def.label)));
      grid.appendChild(stat);
      CH.countUp(num, def.value);
      num.setAttribute("aria-label", def.value + " " + CH.t(def.label));
    });

    CH.stagger(grid.children, 0, 70);
  }

  /* ---------- B. members preview ---------- */
  function memberRow(user, featured) {
    var link = CH.el("a", "member");
    link.href = CH.asset("pages/profile/") + "?id=" + encodeURIComponent(user.id);

    var avatar = CH.el("span", "avatar", CH.initials(user.name || user.id));
    avatar.style.background = CH.avatarGradient(user.name || user.id);
    avatar.setAttribute("aria-hidden", "true");
    link.appendChild(avatar);

    var body = CH.el("div", "member-body");
    var top = CH.el("div", "member-top");
    top.appendChild(CH.el("span", "member-name", user.name || user.id));
    if (user.role) {
      top.appendChild(CH.el("span", "role" + (/admin/i.test(user.role) ? " role-admin" : ""), user.role));
    }
    if (featured) top.appendChild(CH.el("span", "badge", CH.t("home.featured")));
    body.appendChild(top);

    if (user.bio) body.appendChild(CH.el("div", "member-bio", user.bio));

    var count = achievementsOf(user.id);
    body.appendChild(CH.el("div", "member-meta", memberMetaLabel(count)));
    link.appendChild(body);

    var arrow = CH.el("span", "row-arrow", "\u2192");
    arrow.setAttribute("aria-hidden", "true");
    link.appendChild(arrow);
    return link;
  }

  function buildMembers() {
    var grid = document.getElementById("memberPreview");
    if (!grid) return;
    grid.innerHTML = "";

    var site = CH.state.site || {};
    var users = (CH.state.users || []).filter(function (u) { return u && u.id; });
    if (!users.length) {
      grid.appendChild(CH.emptyState(CH.t("users.empty")));
      return;
    }

    var list = pinnedFirst(users, site.featuredUser, MEMBERS_PREVIEW);
    list.forEach(function (user) {
      grid.appendChild(memberRow(user, site.featuredUser === user.id));
    });
    CH.stagger(grid.children, 40, 55);
  }

  /* ---------- C. achievements preview ---------- */
  function achievementRow(item) {
    var link = CH.el("a", "ach-row");
    link.href = CH.asset("pages/achievements/");

    var icon = new Image();
    icon.className = "ach-row-icon";
    icon.loading = "lazy";
    icon.alt = "";
    icon.src = CH.asset(item.icon) || "";
    icon.addEventListener("error", function () { icon.style.visibility = "hidden"; });
    link.appendChild(icon);

    var body = CH.el("div", "ach-row-body");
    var top = CH.el("div", "ach-row-top");
    top.appendChild(CH.el("span", "ach-row-name", item.name || item.id));
    if (item.rarity) {
      var rarity = CH.el("span", "rarity", item.rarity);
      rarity.style.setProperty("--glow", CH.rarityColor(item.rarity));
      top.appendChild(rarity);
    }
    body.appendChild(top);
    if (item.description) body.appendChild(CH.el("div", "ach-row-desc", item.description));
    link.appendChild(body);

    if (item.category) link.appendChild(CH.el("span", "ach-row-cat", item.category));
    return link;
  }

  function buildAchievements() {
    var grid = document.getElementById("achPreview");
    if (!grid) return;
    grid.innerHTML = "";

    var site = CH.state.site || {};
    var list = published(CH.state.achievements).sort(byOrder);
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t("achievements.empty")));
      return;
    }

    pinnedFirst(list, site.featuredAchievement, ACHIEVEMENTS_PREVIEW).forEach(function (item) {
      grid.appendChild(achievementRow(item));
    });
    CH.stagger(grid.children, 40, 50);
  }

  /* ---------- D. projects preview ---------- */
  function projectCard(project) {
    var link = CH.el("a", "proj-card");
    var pageUrl = project.page ? CH.safeUrl(project.page) : "";
    link.href = pageUrl ? CH.asset(pageUrl) : CH.asset("pages/other/");

    var media = CH.el("div", "proj-media");
    if (project.image) {
      var img = new Image();
      img.loading = "lazy";
      img.alt = project.title || "";
      img.src = CH.asset(project.image);
      img.addEventListener("error", function () { media.style.display = "none"; });
      media.appendChild(img);
    }
    link.appendChild(media);

    var body = CH.el("div", "proj-body");
    var row = CH.el("div", "proj-title-row");
    row.appendChild(CH.el("h3", null, project.title || project.id));
    if (project.status) row.appendChild(CH.el("span", "status", project.status));
    body.appendChild(row);
    if (project.description) body.appendChild(CH.el("p", null, project.description));

    if ((project.tags || []).length) {
      var tags = CH.el("div", "tags");
      project.tags.forEach(function (tag) { tags.appendChild(CH.el("span", "badge", tag)); });
      body.appendChild(tags);
    }
    link.appendChild(body);
    return link;
  }

  function buildProjects() {
    var grid = document.getElementById("projPreview");
    if (!grid) return;
    grid.innerHTML = "";

    var site = CH.state.site || {};
    var list = published(CH.state.other).sort(byOrder);
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t("other.empty")));
      return;
    }

    pinnedFirst(list, site.featuredProject).forEach(function (project) {
      grid.appendChild(projectCard(project));
    });
    CH.stagger(grid.children, 40, 70);
  }

  /* ---------- site chrome ---------- */
  function applySite() {
    var site = CH.state.site || {};
    if (site.communityName) {
      setText("brandName", site.communityName);
      setText("communityName", site.communityName);
      setText("footerBrand", site.communityName);
      document.title = site.communityName;
    }
    // The hero tagline comes from site.json so copy edits stay in one place.
    var tagline = document.querySelector(".hero-tagline");
    if (tagline && site.tagline) {
      tagline.textContent = site.tagline;
      tagline.removeAttribute("data-i18n");
    }
    setText("year", String(new Date().getFullYear()));
    CH.bindChrome();
  }

  function renderAll() {
    applySite();
    buildStats();
    buildMembers();
    buildAchievements();
    buildProjects();
  }

  function loadAll() {
    Promise.all([
      CH.fetchJSON("data/site.json"),
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/other.json")
    ]).then(function (r) {
      CH.state.site = r[0] || {};
      CH.state.users = Array.isArray(r[1]) ? r[1] : [];
      CH.state.achievements = Array.isArray(r[2]) ? r[2] : [];
      CH.state.other = Array.isArray(r[3]) ? r[3] : [];
      renderAll();
    });

    // The site is English-only, but keep the hook so any future language
    // switch re-renders translated labels without a reload.
    document.addEventListener("ch:langchange", function () {
      if (CH.state.site) renderAll();
    });
  }

  if (window.CH && CH.fetchJSON) {
    CH.onReady(loadAll);
  }
})();
