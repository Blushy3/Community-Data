/* ============================================================
   Project detail renderer + page glue.
   Reads data/other.json by ?id= into #detailContent when that
   container exists (project detail template), and keeps the
   shared site chrome in sync everywhere else.
   ============================================================ */
(function () {
  "use strict";

  var CH = window.CH;

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
      (CH.state.other || []).forEach(function (p) {
        if (p && p.id === id) project = p;
      });
    }
    container.innerHTML = "";

    if (!project || project.published === false) {
      container.appendChild(CH.el("p", "profile-msg", CH.t(id ? "other.notFound" : "common.noResults")));
      return;
    }

    var html = "";
    html += "<div class=\"detail-page\">";
    html += "<a href=\"../other/\" class=\"back-link\">&larr; " + CH.escapeHtml(CH.t("other.back")) + "</a>";
    html += "<div class=\"detail-head\">";
    if (project.title) html += "<h1 class=\"detail-title\">" + CH.escapeHtml(project.title) + "</h1>";
    if (project.status) {
      html += "<span class=\"badge badge-status\"><i class=\"status-dot\"></i>" + CH.escapeHtml(project.status) + "</span>";
    }
    html += "</div>";
    if (project.description) html += "<p class=\"detail-desc\">" + CH.escapeHtml(project.description) + "</p>";
    if (project.image) {
      html += "<div class=\"detail-figure\"><img src=\"" + CH.escapeHtml(CH.asset(project.image)) +
        "\" alt=\"" + CH.escapeHtml(project.title || "") + "\" loading=\"lazy\"></div>";
    }
    if (project.tags && project.tags.length) {
      html += "<div class=\"tags detail-tags\">";
      project.tags.forEach(function (t) {
        html += "<span class=\"badge\">" + CH.escapeHtml(t) + "</span>";
      });
      html += "</div>";
    }
    var pageUrl = project.page ? CH.safeUrl(project.page) : "";
    if (pageUrl) {
      html += "<a class=\"btn btn-solid\" href=\"" + CH.escapeHtml(CH.asset(pageUrl)) + "\">" +
        CH.escapeHtml(CH.t("other.open")) + " <span class=\"cta-arrow\">\u2192</span></a>";
    }
    html += "</div>";

    container.innerHTML = html;

    if (project.title) {
      var siteName = (CH.state.site && CH.state.site.communityName) || "Community Data";
      document.title = project.title + " \u2014 " + siteName;
    }
  }

  function load() {
    var isDetail = !!document.getElementById("detailContent");
    var requests = [CH.fetchJSON("data/site.json")];
    if (isDetail) requests.push(CH.fetchJSON("data/other.json"));

    Promise.all(requests).then(function (r) {
      CH.state.site = r[0] || {};
      CH.bindChrome();
      if (!isDetail) return;
      CH.state.other = Array.isArray(r[1]) ? r[1] : [];
      renderDetail();
    });
  }

  document.addEventListener("ch:langchange", function () {
    if (document.getElementById("detailContent") && (CH.state.other || []).length) renderDetail();
  });

  if (window.CH && CH.fetchJSON) {
    CH.onReady(load);
  }
})();
