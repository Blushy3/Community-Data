/* ============================================================
   Project pages — minimal glue.
   Loads site.json so the header brand + footer year stay in
   sync with the rest of the site. The page content itself is
   static HTML inside /projects/<slug>/index.html.
   ============================================================ */
(function () {
  "use strict";
  var CH = window.CH;

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function load() {
    CH.fetchJSON("data/site.json").then(function (site) {
      var s = site || {};
      setText("brandName", s.communityName || "Community Hub");
      setText("year", String(new Date().getFullYear()));
    });
  }

  if (window.CH && CH.fetchJSON) {
    CH.onReady(load);
  }
})();
