/* ============================================================
   Achievements directory â€” search, category + rarity filters,
   sorting and holders (achievements[].users) with profile links.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function unique(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      if (v && !seen[v]) { seen[v] = 1; out.push(v); }
    });
    return out.sort();
  }

  // CH.t returns the key itself when a pack entry is missing (offline),
  // so dynamic labels get an explicit English fallback.
  function tLabel(key, fallback) {
    var value = CH.t(key);
    return value === key ? fallback : value;
  }

  function store(list) {
    CH.state.achievements = list;
    renderSelects();
    fillSort();
    render();
    var statsEl = document.getElementById("achStats");
    if (statsEl) statsEl.textContent = list.length + " " + CH.t("achievements.title");
  }

  function renderSelects() {
    var cats = [];
    var rar = [];
    CH.state.achievements.forEach(function (a) {
      if (a && a.category) cats.push(a.category);
      if (a && a.rarity) rar.push(a.rarity);
    });
    fillSelect("categoryFilter", unique(cats), tLabel("achievements.allCategories", "All categories"));
    fillSelect("rarityFilter", unique(rar), tLabel("achievements.allRarities", "All rarities"));
  }

  function fillSort() {
    var sel = document.getElementById("sortFilter");
    if (!sel) return;
    sel.innerHTML = "";
    var defs = [
      ["", "achievements.sortDefault"],
      ["rarity", "achievements.sortRarity"],
      ["holders", "achievements.sortHolders"],
      ["az", "achievements.sortAz"]
    ];
    defs.forEach(function (d) {
      var o = document.createElement("option");
      o.value = d[0];
      o.textContent = d[0] ? CH.t(d[1]) : CH.t("common.sort") + " \u00B7 " + CH.t(d[1]);
      sel.appendChild(o);
    });
  }

  function fillSelect(id, values, allLabel) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    var all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel || CH.t("common.all");
    sel.appendChild(all);
    values.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  var RARITY_RANK = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
  function rarityRank(a) {
    return RARITY_RANK[String((a && a.rarity) || "").toLowerCase().replace(/[^a-z]/g, "")] || 0;
  }

  function filtered() {
    var input = document.getElementById("searchInput");
    var catSel = document.getElementById("categoryFilter");
    var rarSel = document.getElementById("rarityFilter");
    var sortSel = document.getElementById("sortFilter");
    var q = (input ? input.value : "").toLowerCase().trim();
    var cat = catSel ? catSel.value : "";
    var rar = rarSel ? rarSel.value : "";
    var sort = sortSel ? sortSel.value : "";

    var list = (CH.state.achievements || []).filter(function (a) {
      if (!a || a.published === false) return false;
      if (cat && a.category !== cat) return false;
      if (rar && a.rarity !== rar) return false;
      if (q) {
        var hay = ((a.name || "") + " " + (a.description || "") + " " + (a.category || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (sort === "rarity") {
      list.sort(function (a, b) { return rarityRank(b) - rarityRank(a) || (a.order || 0) - (b.order || 0); });
    } else if (sort === "holders") {
      list.sort(function (a, b) { return (b.users || []).length - (a.users || []).length || (a.order || 0) - (b.order || 0); });
    } else if (sort === "az") {
      list.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
    } else {
      list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }
    return list;
  }

  function holderChips(a) {
    var ids = a.users || [];
    if (!ids.length) return null;
    var users = ids.map(function (id) {
      var found = null;
      (CH.state.users || []).forEach(function (u) { if (u && u.id === id) found = u; });
      return found || { id: id, name: id };
    });

    var row = CH.el("div", "ach-holders");
    users.slice(0, 5).forEach(function (u) {
      var chip = CH.el("a", "chip", CH.initials(u.name || u.id));
      chip.href = "../profile/?id=" + encodeURIComponent(u.id);
      chip.title = u.name || u.id;
      chip.setAttribute("aria-label", (u.name || u.id) + " \u2014 " + CH.t("users.viewProfile"));
      row.appendChild(chip);
    });
    if (users.length > 5) {
      var more = CH.el("span", "chip chip-more", "+" + (users.length - 5));
      more.title = users.slice(5).map(function (u) { return u.name || u.id; }).join(", ");
      row.appendChild(more);
    }
    return row;
  }

  function render() {
    var grid = document.getElementById("achGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var list = filtered();
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t(CH.state.achievements.length ? "common.noResults" : "achievements.empty")));
      return;
    }

    list.forEach(function (a) {
      var card = CH.el("article", "card ach-card");
      card.style.setProperty("--glow", CH.rarityColor(a.rarity));

      var frame = CH.el("div", "ach-frame");
      var icon = new Image();
      icon.src = CH.asset(a.icon) || "";
      icon.alt = "";
      icon.className = "icon";
      icon.loading = "lazy";
      icon.addEventListener("error", function () {
        icon.style.visibility = "hidden";
        if (!frame.querySelector(".badge")) {
          frame.appendChild(CH.el("span", "badge", a.name ? a.name.charAt(0).toUpperCase() : "?"));
        }
      });
      frame.appendChild(icon);
      card.appendChild(frame);

      card.appendChild(CH.el("h2", null, a.name || a.id));
      if (a.description) card.appendChild(CH.el("p", null, a.description));

      var tags = CH.el("div", "tags");
      if (a.category) tags.appendChild(CH.el("span", "badge", a.category));
      if (a.rarity) {
        var rarity = CH.el("span", "badge badge-rarity", a.rarity);
        rarity.style.setProperty("--glow", CH.rarityColor(a.rarity));
        tags.appendChild(rarity);
      }
      if (tags.children.length) card.appendChild(tags);

      var holders = holderChips(a);
      if (holders) card.appendChild(holders);

      grid.appendChild(card);
    });

    CH.stagger(grid.children, 20, 35);
  }

  function load() {
    Promise.all([
      CH.fetchJSON("data/achievements.json"),
      CH.fetchJSON("data/users.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[2] || {};
      CH.state.users = Array.isArray(r[1]) ? r[1] : [];
      CH.bindChrome();
      if (!Array.isArray(r[0])) {
        var grid = document.getElementById("achGrid");
        if (grid) CH.writeError(grid);
        return;
      }
      store(r[0]);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.CH || !CH.fetchJSON) return;
    var search = document.getElementById("searchInput");
    var cat = document.getElementById("categoryFilter");
    var rar = document.getElementById("rarityFilter");
    var sortSel = document.getElementById("sortFilter");
    if (search) search.addEventListener("input", CH.debounce(render, 160));
    if (cat) cat.addEventListener("change", render);
    if (rar) rar.addEventListener("change", render);
    if (sortSel) sortSel.addEventListener("change", render);
    document.addEventListener("ch:langchange", function () {
      if (CH.state.achievements.length) { renderSelects(); fillSort(); render(); }
    });
    CH.onReady(load);
  });
})();
