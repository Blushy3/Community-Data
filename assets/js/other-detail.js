/* Other detail page - loads project data from URL param */
(function () {
  "use strict";
  var CH = window.CH;
  function getParam(name) {
    var q = window.location.search.substring(1).split("&");
    for (var i = 0; i < q.length; i++) {
      var p = q[i].split("=");
      if (p[0] === name) return decodeURIComponent(p[1]);
    }
    return null;
  }
  function render() {
    var pid = getParam("id");
    var container = document.getElementById("detailContent");
    if (!container) return;
    if (!pid) { container.innerHTML = "<p style=\"text-align:center;padding:4rem;color:var(--ink-dim)\">" + CH.t("other.notFound") + "</p>"; return; }
    var project = null;
    (CH.state.other || []).forEach(function (p) { if (p.id === pid) project = p; });
    if (!project) { container.innerHTML = "<p style=\"text-align:center;padding:4rem;color:var(--ink-dim)\">" + CH.t("other.notFound") + "</p>"; return; }
    var html = "<div class=\"detail-page\">";
    html += "<a href=\"../other/\" class=\"btn btn-ghost\" style=\"margin-bottom:1.5rem;display:inline-flex\">&larr; " + CH.t("other.back") + "</a>";
    if (project.image) {
      html += "<img class=\"detail-image\" src=\"" + CH.escapeHtml(CH.asset(project.image)) + "\" alt=\"" + CH.escapeHtml(project.title) + "\" loading=\"lazy\" onerror=\"this.style.display='none'\">";
    }
    html += "<h1 class=\"detail-title\">" + CH.escapeHtml(project.title) + "</h1>";
    if (project.status) html += "<div class=\"detail-status\">" + CH.escapeHtml(project.status) + "</div>";
    html += "<p class=\"detail-desc\">" + CH.escapeHtml(project.detail || project.description) + "</p>";
    if (project.tags && project.tags.length) {
      html += "<div class=\"detail-tags\">";
      project.tags.forEach(function (t) { html += "<span class=\"badge\">" + CH.escapeHtml(t) + "</span> "; });
      html += "</div>";
    }
    var safe = CH.safeUrl(project.url);
    if (safe) {
      html += "<a href=\"" + CH.escapeHtml(safe) + "\" class=\"btn btn-accent\" target=\"_blank\" rel=\"noopener\" style=\"margin-top:1.5rem;display:inline-flex;padding:0.5rem 1.25rem;font-size:0.85rem\">" + CH.escapeHtml(project.urlLabel || project.url) + "</a>";
    }
    html += "</div>";
    container.innerHTML = html;
  }
  function load() {
    Promise.all([
      CH.fetchJSON("data/other.json"),
      CH.fetchJSON("data/site.json")
    ]).then(function (r) {
      CH.state.site = r[1] || {};
      document.getElementById("brandName").textContent = CH.state.site.communityName || "Community Hub";
      CH.state.other = Array.isArray(r[0]) ? r[0] : [];
      document.getElementById("year").textContent = new Date().getFullYear();
      render();
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (window.CH && CH.fetchJSON) {
      CH.onReady(load);
      document.addEventListener("ch:langchange", function () { if (CH.state.other.length) render(); });
    }
  });
})();
