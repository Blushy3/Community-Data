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
      card.href = "detail.html?id=" + p.id;

      var thumb = new Image();
      thumb.loading = "lazy";
      thumb.className = "thumb";
      thumb.src = CH.asset(p.image) || "";
      thumb.alt = p.title || "Project";
      thumb.addEventListener("error", function () {
        var ph = CH.el("div", "thumb", "");
        ph.style.display = "flex";
        ph.style.alignItems = "center";
        ph.style.justifyContent = "center";
        ph.style.fontSize = "2rem";
        ph.textContent = p.title ? p.title.charAt(0).toUpperCase() : "?";
        thumb.replaceWith(ph);
      });
      card.appendChild(thumb);

      card.appendChild(CH.el("h3", null, p.title));
      card.appendChild(CH.el("p", null, p.description));

      var meta = CH.el("div", "meta");
      var badge = CH.el("span", "badge badge-accent", p.status || "");
      meta.appendChild(badge);

      var tagBox = CH.el("div", "tags");
      (p.tags || []).forEach(function (t) {
        tagBox.appendChild(CH.el("span", "badge", t));
      });
      meta.appendChild(tagBox);
      card.appendChild(meta);

      grid.appendChild(card);
    });
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
      fillTags();
      render();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      document.getElementById("searchInput").addEventListener("input", render);
      document.getElementById("tagFilter").addEventListener("change", render);
      document.addEventListener("ch:langchange", function () {
        if (CH.state.other.length) { fillTags(); render(); }
      });
      CH.onReady(load);
    }
  });
})();