/* ============================================================
   Project detail page (pages/other/detail.html) + glue.
   Renders a project from other.json by ?id= URL param, and
   keeps the header brand + footer year in sync with the site.
   ============================================================ */
(function () {
  "use strict";
  var CH = window.CH;

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function getParam(name) {
    var q = window.location.search.substring(1).split("&");
    for (var i = 0; i < q.length; i++) {
      var p = q[i].split("=");
      if (p[0] === name) return decodeURIComponent((p[1] || "").replace(/\+/g, " "));
    }
    return null;
  }

  function renderDetail() {
    var container = document.getElementById("detailContent");
    if (!container) return;
    var id = getParam("id");
    var project = null;
    if (id) {
      (CH.state.other || []).forEach(function (p) { if (p && p.id === id) project = p; });
    }
    container.innerHTML = "";

    if (!project || project.published === false) {
      container.appendChild(CH.el("p", "profile-msg", CH.t(id ? "other.notFound" : "common.noResults")));
      return;
    }

    var html = "";
    html += "<a href=\"../other/\" class=\"btn btn-ghost back-link\">&larr; " + CH.escapeHtml(CH.t("other.back")) + "</a>";
    html += "<div class=\"detail-head\">";
    if (project.title) html += "<h1 class=\"detail-title\">" + CH.escapeHtml(project.title) + "</h1>";
    if (project.status) html += "<span class=\"badge badge-status\"><i class=\"status-dot\"></i>" + CH.escapeHtml(project.status) + "</span>";
    html += "</div>";
    if (project.description) html += "<p class=\"detail-desc\">" + CH.escapeHtml(project.description) + "</p>";
    if (project.image) {
      html += "<div class=\"detail-figure\"><img src=\"" + CH.escapeHtml(CH.asset(project.image)) + "\" alt=\"" + CH.escapeHtml(project.title || "") + "\" loading=\"lazy\"></div>";
    }
    if (project.tags && project.tags.length) {
      html += "<div class=\"tags detail-tags\">";
      project.tags.forEach(function (t) { html += "<span class=\"badge\">" + CH.escapeHtml(t) + "</span>"; });
      html += "</div>";
    }
    var pageUrl = project.page ? CH.safeUrl(CH.asset(project.page)) : "";
    if (pageUrl) {
      html += "<a class=\"btn btn-accent\" href=\"" + CH.escapeHtml(pageUrl) + "\">" + CH.escapeHtml(CH.t("other.open")) + " <span class=\"cta-arrow\">\u2192</span></a>";
    }
    container.innerHTML = html;

    if (project.title) {
      document.title = project.title + " — " + ((CH.state.site && CH.state.site.communityName) || "Community Data");
    }
  }

  function load() {
    var isDetail = !!document.getElementById("detailContent");
    var pSite = CH.fetchJSON("data/site.json");
    if (isDetail) {
      Promise.all([pSite, CH.fetchJSON("data/other.json")]).then(function (r) {
        CH.state.site = r[0] || {};
        CH.state.other = Array.isArray(r[1]) ? r[1] : [];
        setText("brandName", CH.state.site.communityName || "Community Hub");
        setText("year", String(new Date().getFullYear()));
        renderDetail();
      });
    } else {
      pSite.then(function (site) {
        var s = site || {};
        setText("brandName", s.communityName || "Community Hub");
        setText("year", String(new Date().getFullYear()));
      });
    }
  }

  document.addEventListener("ch:langchange", function () {
    if (document.getElementById("detailContent") && (CH.state.other || []).length) renderDetail();
  });

  if (window.CH && CH.fetchJSON) {
    CH.onReady(load);
  }
})();
