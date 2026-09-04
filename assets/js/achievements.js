/* ============================================================
   Achievements page rendering + search + category/rarity filters.
   Supports assigning holders via achievements[].users and/or
   data/user-achievements.json.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

  function store(list) {
    CH.state.achievements = list;
    renderSelects();
    render();
  }

  function renderSelects() {
    var cats = [];
    var rar = [];
    CH.state.achievements.forEach(function (a) {
      if (a && a.category) cats.push(a.category);
      if (a && a.rarity) rar.push(a.rarity);
    });
    fillSelect("categoryFilter", unique(cats), "achievements.category");
    fillSelect("rarityFilter", unique(rar), "achievements.rarity");
  }

  function unique(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      if (!seen[v]) { seen[v] = 1; out.push(v); }
    });
    return out.sort();
  }

  function fillSelect(id, values, labelKey) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    var all = document.createElement("option");
    all.value = "";
    all.textContent = CH.t(labelKey) + "  " + CH.t("common.all");
    sel.appendChild(all);
    values.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  function filtered() {
    var q = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    var cat = document.getElementById("categoryFilter").value;
    var rar = document.getElementById("rarityFilter").value;

    return CH.state.achievements.filter(function (a) {
      if (!a) return false;
      if (a.published === false) return false;
      if (cat && a.category !== cat) return false;
      if (rar && a.rarity !== rar) return false;
      if (q) {
        var hay = ((a.name || "") + " " + (a.description || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function render() {
    var grid = document.getElementById("achGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var list = filtered();
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t("achievements.empty")));
      return;
    }

    list.forEach(function (a) {
      var card = CH.el("div", "card ach-card");
      var icon = new Image();
      icon.src = CH.asset(a.icon) || "";
      icon.alt = a.name || "Achievement";
      icon.className = "icon";
      icon.loading = "lazy";
      icon.addEventListener("error", function () {
        var ph = CH.el("span", "badge", a.name ? a.name.charAt(0).toUpperCase() : "?");
        icon.replaceWith(ph);
      });
      card.appendChild(icon);

      card.appendChild(CH.el("h3", null, a.name));
      card.appendChild(CH.el("p", null, a.description));

      var tags = CH.el("div", "tags");
      if (a.category) {
        var cb = CH.el("span", "badge", a.category);
        tags.appendChild(cb);
      }
      if (a.rarity) {
        var rb = CH.el("span", "badge badge-accent", a.rarity);
        tags.appendChild(rb);
      }
      card.appendChild(tags);

      grid.appendChild(card);
    });
  }

  function load() {
    var pAch = CH.fetchJSON("data/achievements.json");
    
    var pUsers = CH.fetchJSON("data/users.json");
    var pSite = CH.fetchJSON("data/site.json");

    Promise.all([pAch, pUsers, pSite]).then(function (r) {
      CH.state.site = r[3] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      CH.state.users = Array.isArray(r[2]) ? r[2] : [];
      var list = Array.isArray(r[0]) ? r[0] : [];
      if (!r[0]) {
        var grid = document.getElementById("achGrid");
        if (grid) grid.appendChild(CH.emptyState(CH.t("common.error")));
        return;
      }
      store(list);
      document.getElementById("year").textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      document.getElementById("searchInput").addEventListener("input", render);
      document.getElementById("categoryFilter").addEventListener("change", render);
      document.getElementById("rarityFilter").addEventListener("change", render);
      // re-render option labels (translated) and cards on language change
      document.addEventListener("ch:langchange", function () {
        if (CH.state.achievements.length) { renderSelects(); render(); }
      });
      CH.onReady(load);
    }
  });
})();





