/* ============================================================
   Other / Projects directory â€” search + tag filter.
   Project pages keep their own URLs under /projects/.
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
    var tags = unique([].concat.apply([], (CH.state.other || []).map(function (p) {
      return p && p.tags ? p.tags : [];
    })));
    var sel = document.getElementById("tagFilter");
    if (!sel) return;
    sel.innerHTML = "";
    var all = document.createElement("option");
    all.value = "";
    var allLabel = CH.t("other.allTags");
    all.textContent = allLabel === "other.allTags" ? "All tags" : allLabel;
    sel.appendChild(all);
    tags.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
  }

  function filtered() {
    var input = document.getElementById("searchInput");
    var tagSel = document.getElementById("tagFilter");
    var q = (input ? input.value : "").toLowerCase().trim();
    var tag = tagSel ? tagSel.value : "";

    return (CH.state.other || []).filter(function (p) {
      if (!p || !p.id) return false;
      if (p.published === false) return false;
      if (tag && (p.tags || []).indexOf(tag) === -1) return false;
      if (q) {
        var hay = ((p.title || "") + " " + (p.description || "") + " " + (p.tags || []).join(" ") + " " + (p.status || "")).toLowerCase();
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
      grid.appendChild(CH.emptyState(CH.t(CH.state.other.length ? "common.noResults" : "other.empty")));
      return;
    }

    list.forEach(function (p) {
      var row = CH.el("a", "project-row");
      var pageUrl = p.page ? CH.safeUrl(p.page) : "";
      row.href = pageUrl ? CH.asset(pageUrl) : "#";
      row.setAttribute("aria-label", (p.title || p.id) + " \u2014 " + CH.t("other.open"));

      var thumbWrap = CH.el("div", "thumb-wrap");
      if (p.image) {
        var thumb = new Image();
        thumb.loading = "lazy";
        thumb.className = "thumb";
        thumb.src = CH.asset(p.image);
        thumb.alt = "";
        thumb.addEventListener("error", function () {
          var ph = CH.el("div", "thumb thumb-ph", (p.title || "?").charAt(0).toUpperCase());
          thumb.replaceWith(ph);
        });
        thumbWrap.appendChild(thumb);
      } else {
        thumbWrap.appendChild(CH.el("div", "thumb thumb-ph", (p.title || "?").charAt(0).toUpperCase()));
      }
      row.appendChild(thumbWrap);

      var body = CH.el("div", "proj-body");
      var titleRow = CH.el("div", "proj-title-row");
      titleRow.appendChild(CH.el("h2", null, p.title || p.id));
      if (p.status) titleRow.appendChild(CH.el("span", "status", p.status));
      body.appendChild(titleRow);

      if (p.description) body.appendChild(CH.el("p", null, p.description));

      if ((p.tags || []).length) {
        var tagBox = CH.el("div", "tags");
        p.tags.forEach(function (t) { tagBox.appendChild(CH.el("span", "badge", t)); });
        body.appendChild(tagBox);
      }

      var meta = CH.el("div", "meta");
      meta.appendChild(CH.el("span", null, CH.t("other.open") + " \u2192"));
      body.appendChild(meta);

      row.appendChild(body);
      grid.appendChild(row);
    });

    CH.stagger(grid.children, 20, 50);
  }

  function load() {
    Promise.all([
      CH.fetchJSON("data/other.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[1] || {};
      CH.bindChrome();
      if (!Array.isArray(r[0])) {
        var grid = document.getElementById("projGrid");
        if (grid) CH.writeError(grid);
        return;
      }
      CH.state.other = r[0];
      var statsEl = document.getElementById("projStats");
      if (statsEl) {
        var n = CH.state.other.filter(function (p) { return p && p.published !== false; }).length;
        statsEl.textContent = n + " " + CH.t("home.snapshotProjects");
      }
      fillTags();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.CH || !CH.fetchJSON) return;
    var search = document.getElementById("searchInput");
    var tagSel = document.getElementById("tagFilter");
    if (search) search.addEventListener("input", CH.debounce(render, 160));
    if (tagSel) tagSel.addEventListener("change", render);
    document.addEventListener("ch:langchange", function () {
      if (CH.state.other.length) { fillTags(); render(); }
    });
    CH.onReady(load);
  });
})();
