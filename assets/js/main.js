/* ============================================================
   Community Hub â€” core module
   i18n loading, language switcher, header/nav, toast,
   data helpers, security (URL/text sanitizing), empty states.
   ============================================================ */
(function () {
  "use strict";

  var CH = (window.CH = window.CH || {});

  var DEFAULT_LANG = "en";
  var LANG_KEY = "ch-lang";
  var LANGS = ["en", "pl", "es"];
  // Site root prefix relative to the current page. Set via window.CH_BASE
  // (e.g. "../" on /achievements/, "../../" inside a profile, "" on Home).
  var BASE = window.CH_BASE || "";

  CH.state = {
    lang: DEFAULT_LANG,
    t: {},
    site: null,
    users: [],
    achievements: [],
    other: []
  };

  /* ---------- i18n readiness ---------- */
  // Page modules render dynamic content only after translations are loaded,
  // so translated strings never leak as raw keys like "home.snapshotMembers".
  var _ready = false;
  var _readyCbs = [];
  CH.onReady = function (cb) {
    if (typeof cb !== "function") return;
    if (_ready) { cb(); return; }
    _readyCbs.push(cb);
  };
  function finishReady() {
    if (_ready) return;
    _ready = true;
    var list = _readyCbs;
    _readyCbs = [];
    list.forEach(function (cb) { cb(); });
  }

  /* ---------- asset path resolver ---------- */
  // Data files store root-relative paths ("assets/...", "users/..."). On pages
  // below the root we must prefix them with BASE so they resolve correctly.
  CH.asset = function (p) {
    p = String(p == null ? "" : p);
    while (p.length && p[0] === ".") { p = p.slice(p.indexOf("/") + 1); }
    return BASE + p;
  };

  /* ---------- storage ---------- */
  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) { stored = null; }
    var detected = (navigator.language || "en").slice(0, 2).toLowerCase();
    var chosen = LANGS.indexOf(stored) !== -1 ? stored
      : (LANGS.indexOf(detected) !== -1 ? detected : DEFAULT_LANG);
    return chosen;
  }

  function setLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  }

  CH.setLanguage = function (lang) {
    if (LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;
    CH.state.lang = lang;
    setLang(lang);
    loadI18n(lang).then(function () {
      applyTranslations();
      updateLangUI();
      document.documentElement.lang = lang;
      if (document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent("ch:langchange", { detail: { lang: lang } }));
      }
    });
  };

  /* ---------- fetch with error handling ---------- */
  CH.fetchJSON = function (url) {
    return fetch(BASE + url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function () {
        CH.writeError();
        return null;
      });
  };

  CH.fetchText = function (url) {
    return fetch(BASE + url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .catch(function () { return ""; });
  };

  /* ---------- i18n ---------- */
  function loadI18n(lang) {
    return CH.fetchText("data/i18n/" + lang + ".json").then(function (text) {
      try {
        CH.state.t = JSON.parse(text);
      } catch (e) {
        CH.state.t = {};
      }
    });
  }

  CH.t = function (key) {
    var parts = key.split(".");
    var cur = CH.state.t;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return key;
      cur = cur[parts[i]];
    }
    if (typeof cur === "string" && cur.length > 0) return cur;
    // fallback to English pack
    if (!window.__EN_FALLBACK) return key;
    cur = window.__EN_FALLBACK;
    for (var j = 0; j < parts.length; j++) {
      if (cur == null) return key;
      cur = cur[parts[j]];
    }
    return typeof cur === "string" && cur.length > 0 ? cur : key;
  };

  /* ---------- security helpers ---------- */
  CH.escapeHtml = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  CH.safeUrl = function (url, allowMailto) {
    if (!url) return "";
    url = String(url).trim();
    if (/^(https?:)\/\//i.test(url)) return url;
    if (allowMailto && /^mailto:/i.test(url)) return url;
    // allow relative (./ ../ /) paths for same-site links
    if (/^\\.{1,2}\//.test(url) || /^\//.test(url)) return url;
    return "";
  };

  /* ---------- translation application ---------- */
  function applyTranslations() {
    var nodes = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(nodes, function (node) {
      node.textContent = CH.t(node.getAttribute("data-i18n"));
    });
    var phs = document.querySelectorAll("[data-i18n-ph]");
    Array.prototype.forEach.call(phs, function (node) {
      node.setAttribute("placeholder", CH.t(node.getAttribute("data-i18n-ph")));
    });
    // dynamic string fill: {key:value} with [data-i18n-fmt]
    var fmts = document.querySelectorAll("[data-i18n-fmt]");
    Array.prototype.forEach.call(fmts, function (node) {
      var tpl = CH.t(node.getAttribute("data-i18n-fmt"));
      Array.prototype.forEach.call(node.attributes, function (attr) {
        if (attr.name.indexOf("data-i18n-p-") === 0) {
          var token = attr.name.slice("data-i18n-p-".length);
          tpl = tpl.split("{" + token + "}").join(attr.value);
        }
      });
      node.textContent = tpl;
    });
  }
  CH.applyTranslations = applyTranslations;

  /* ---------- language switcher UI ---------- */
  function updateLangUI() {
    var btn = document.getElementById("langBtn");
    var btns = document.querySelectorAll("[data-lang-opt]");
    var code = btn ? btn.querySelector(".lang-code") : null;
    if (code) code.textContent = CH.state.lang.toUpperCase();
    Array.prototype.forEach.call(btns, function (b) {
      var active = b.getAttribute("data-lang-opt") === CH.state.lang;
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function initLangSwitch() {
    var wrap = document.getElementById("langSwitch");
    var btn = document.getElementById("langBtn");
    var btns = document.querySelectorAll("[data-lang-opt]");
    if (!wrap || !btn) return;

    function close() { wrap.classList.remove("open"); }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.toggle("open");
    });
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        CH.setLanguage(b.getAttribute("data-lang-opt"));
        close();
      });
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    var burger = document.getElementById("burger");
    var nav = document.getElementById("mainNav");
    if (!burger || !nav) return;
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  CH.showToast = function (titleKey, descKey) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.querySelector("h4").textContent = CH.t(titleKey);
    toast.querySelector("p").textContent = CH.t(descKey);
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 3800);
  };

  /* ---------- shared rendering helpers ---------- */
  CH.el = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  CH.img = function (src, alt, className) {
    var img = new Image();
    img.src = src || "";
    img.alt = alt || "";
    if (className) img.className = className;
    img.loading = "lazy";
    img.addEventListener("error", function () {
      img.classList.add("broken");
      var ph = document.createElement("span");
      ph.textContent = "?";
      ph.className = "img-ph";
      img.replaceWith(ph);
    });
    return img;
  };

  CH.writeError = function (container) {
    if (!container) return;
    var box = CH.el("div", "empty-state");
    box.appendChild(CH.el("div", "ic", "âš "));
    box.appendChild(CH.el("p", null, CH.t("common.error")));
    container.appendChild(box);
  };

  CH.emptyState = function (message) {
    var box = CH.el("div", "empty-state");
    box.appendChild(CH.el("div", "ic", "✦"));
    box.appendChild(CH.el("p", null, message));
    return box;
  };

  
  /* ---------- boot ---------- */
  CH.init = function () {

    // cache English fallback once, then apply saved/preferred language
    if (!window.__EN_FALLBACK) {
      CH.fetchText("data/i18n/en.json").then(function (text) {
        try { window.__EN_FALLBACK = JSON.parse(text); } catch (e) { window.__EN_FALLBACK = {}; }
        CH.state.lang = getLang();
        loadI18n(CH.state.lang).then(function () {
          applyTranslations();
          updateLangUI();
          document.documentElement.lang = CH.state.lang;
          finishReady();
        });
      });
    } else {
      finishReady();
    }

    // build the bottom dock only after translations are available
    // scroll-reveal observer
    if (window.IntersectionObserver) {
      setTimeout(function () {
        var els = document.querySelectorAll(".reveal");
        if (!els.length) return;
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        Array.prototype.forEach.call(els, function (el) { obs.observe(el); });
      }, 200);
    } else {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) { el.classList.add("visible"); });
    }

    // header scroll effect (blur on scroll)
    var header = document.querySelector(".site-header");
    if (header) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            header.classList.toggle("scrolled", window.scrollY > 40);
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    // Language switcher - click to open
    var langSwitch = document.getElementById("langSwitch");
    var langBtn = document.getElementById("langBtn");
    if (langSwitch && langBtn) {
      langBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        langSwitch.classList.toggle("open");
      });
      document.addEventListener("click", function (e) {
        if (!langSwitch.contains(e.target)) langSwitch.classList.remove("open");
      });
    }


    // Language menu buttons - change language
    var langOpts = document.querySelectorAll("[data-lang-opt]");
    Array.prototype.forEach.call(langOpts, function (btn) {
      btn.addEventListener("click", function () {
        CH.setLanguage(btn.getAttribute("data-lang-opt"));
        var langSwitch = document.getElementById("langSwitch");
        if (langSwitch) langSwitch.classList.remove("open");
      });
    });

    // Burger nav
    var burger = document.getElementById("burger");
    var nav = document.getElementById("mainNav");
    if (burger && nav) {
      burger.addEventListener("click", function () {
        nav.classList.toggle("open");
        burger.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
      });
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
        a.addEventListener("click", function () { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); });
      });
    }

  };
  document.addEventListener("DOMContentLoaded", CH.init);
})();

