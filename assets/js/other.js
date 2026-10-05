/* ============================================================
   Other / Projects directory rendering + search + tag filter.
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

  function fillTags() {
    var tags = unique([].concat.apply([], (CH.state.other || []).map(function (p) { return p.tags || []; })));
    var sel = document.getElementById("tagFilter");
    if (!sel) return;
    var all = document.createElement("option");
    all.value = "";
    all.textContent = CH.t("common.all");
    sel.appendChild(all);
    tags.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
  }

  function filtered() {
    var q = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    var tag = document.getElementById("tagFilter").value;
    return (CH.state.other || []).filter(function (p) {
      if (!p || !p.id) return false;
      if (p.published === false) return false;
      if (tag && (p.tags || []).indexOf(tag) === -1) return false;
      if (q) {
        var hay = ((p.title || "") + " " + (p.description || "") + " " + (p.tags || []).join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function render() {
    var grid = document.getElementById("projGrid");
    if (!grid) return;
    grid.innerHTML = "";

    var list = filtered();
    if (!list.length) {
      grid.appendChild(CH.emptyState(CH.t("other.empty")));
      return;
    }

    list.forEach(function (p) {
      var card = CH.el("a", "card proj-card");
      var pageUrl = p.page ? CH.safeUrl(CH.asset(p.page)) : "";
      card.href = pageUrl || "#";

      var thumbWrap = CH.el("div", "thumb-wrap");
      var thumb = new Image();
      thumb.loading = "lazy";
      thumb.className = "thumb";
      thumb.src = CH.asset(p.image) || "";
      thumb.alt = p.title || "Project";
      thumb.addEventListener("error", function () {
        var ph = CH.el("div", "thumb thumb-ph");
        ph.textContent = p.title ? p.title.charAt(0).toUpperCase() : "?";
        thumb.replaceWith(ph);
      });
      thumbWrap.appendChild(thumb);
      card.appendChild(thumbWrap);

      var body = CH.el("div", "proj-body");
      body.appendChild(CH.el("h3", null, p.title));
      body.appendChild(CH.el("p", null, p.description));

      var meta = CH.el("div", "meta");
      if (p.status) {
        var badge = CH.el("span", "badge badge-status");
        badge.appendChild(CH.el("i", "status-dot"));
        badge.appendChild(document.createTextNode(p.status));
        meta.appendChild(badge);
      }

      var tagBox = CH.el("div", "tags");
      (p.tags || []).forEach(function (t) {
        tagBox.appendChild(CH.el("span", "badge", t));
      });
      meta.appendChild(tagBox);
      body.appendChild(meta);
      card.appendChild(body);

      grid.appendChild(card);
    });
    CH.stagger(grid.children);
  }

  function load() {
    var pOther = CH.fetchJSON("data/other.json");
    var pSite = CH.fetchJSON("data/site.json");

    Promise.all([pOther, pSite]).then(function (r) {
      CH.state.site = r[1] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      document.getElementById("year").textContent = new Date().getFullYear();

      if (!Array.isArray(r[0])) {
        var grid = document.getElementById("projGrid");
        if (grid) grid.appendChild(CH.emptyState(CH.t("common.error")));
        return;
      }
      CH.state.other = r[0];
      var statsEl = document.getElementById("projStats");
      if (statsEl) statsEl.textContent = CH.state.other.filter(function (p) { return p && p.published !== false; }).length + " " + CH.t("home.snapshotProjects");
      fillTags();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      document.getElementById("searchInput").addEventListener("input", CH.debounce(render, 160));
      document.getElementById("tagFilter").addEventListener("change", render);
      document.addEventListener("ch:langchange", function () {
        if (CH.state.other.length) { fillTags(); render(); }
      });
      CH.onReady(load);
    }
  });
})();