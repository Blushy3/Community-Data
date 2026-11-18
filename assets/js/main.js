/* ============================================================
   Community Data — core module (v6 "Archive")
   i18n loading, site chrome (brand / year / Discord),
   header + mobile nav, reveal observer, toast, data helpers,
   security (URL/text sanitizing) and small render utilities.
   No frameworks. Everything else (tilt, cursor, ripples) was
   removed on purpose: the interface stays quiet.
   ============================================================ */
(function () {
  "use strict";

  var CH = (window.CH = window.CH || {});

  var DEFAULT_LANG = "en"; // English-only site
  // Site root prefix relative to the current page. Set via window.CH_BASE
  // (e.g. "../../" inside a sub-page, "" on Home).
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
  // Data files store root-relative paths ("assets/...", "./projects/..."). On
  // pages below the root we prefix them with BASE so they resolve correctly.
  CH.asset = function (p) {
    p = String(p == null ? "" : p);
    while (p.length && p[0] === "." && p.indexOf("/") !== -1) { p = p.slice(p.indexOf("/") + 1); }
    return BASE + p;
  };

  /* ---------- fetch with error handling ---------- */
  CH.fetchJSON = function (url) {
    return fetch(BASE + url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function () {
        return null;
      });
  };

  CH.fetchText = function (url) {
    return fetch(BASE + url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .catch(function () { return ""; });
  };

  /* ---------- i18n (English only) ---------- */
  function loadI18n() {
    return CH.fetchText("data/i18n/en.json").then(function (text) {
      try {
        CH.state.t = JSON.parse(String(text).replace(/^\uFEFF/, ""));
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
    // fallback to the English pack loaded separately
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
    if (/^\.{1,2}\//.test(url) || /^\//.test(url)) return url;
    return "";
  };

  /* ---------- translation application ---------- */
  function applyTranslations() {
    var nodes = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-i18n");
      var resolved = CH.t(key);
      // never overwrite the built-in English text with a raw key (offline)
      if (resolved !== key) node.textContent = resolved;
    });
    var phs = document.querySelectorAll("[data-i18n-ph]");
    Array.prototype.forEach.call(phs, function (node) {
      var key = node.getAttribute("data-i18n-ph");
      var resolved = CH.t(key);
      if (resolved !== key) node.setAttribute("placeholder", resolved);
    });
    // dynamic string fill: {key:value} with [data-i18n-fmt]
    var fmts = document.querySelectorAll("[data-i18n-fmt]");
    Array.prototype.forEach.call(fmts, function (node) {
      var fkey = node.getAttribute("data-i18n-fmt");
      var tpl = CH.t(fkey);
      if (tpl === fkey) return;
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
    box.appendChild(CH.el("div", "ic", "\u26A0"));
    box.appendChild(CH.el("p", null, CH.t("common.error")));
    container.appendChild(box);
  };

  CH.emptyState = function (message) {
    var box = CH.el("div", "empty-state");
    box.appendChild(CH.el("div", "ic", "\u2726"));
    box.appendChild(CH.el("p", null, message));
    return box;
  };

  CH.debounce = function (fn, wait) {
    var timer = null;
    wait = wait || 150;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  };

  /* ---------- design helpers ---------- */
  // Muted rarity tints — distinguishable, never neon.
  CH.RARITY = {
    common: "#8c8c8c",
    uncommon: "#8fa89a",
    rare: "#8fa3bf",
    epic: "#a99bc0",
    legendary: "#c2ae85",
    mythic: "#c08f8f"
  };
  CH.rarityColor = function (r) {
    if (!r) return CH.RARITY.common;
    var k = String(r).toLowerCase().replace(/[^a-z]/g, "");
    return CH.RARITY[k] || CH.RARITY.common;
  };
  CH.initials = function (name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var a = parts[0] ? parts[0].charAt(0) : "";
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (a + b).toUpperCase() || "?";
  };
  CH.nameHue = function (str) {
    var h = 0;
    str = String(str || "");
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  };
  // Subtle per-member tint: a near-neutral graphite with a faint hue shift.
  CH.avatarGradient = function (name) {
    var h = CH.nameHue(name);
    return "linear-gradient(140deg, hsl(" + h + ",10%,21%), hsl(" + ((h + 40) % 360) + ",10%,15%))";
  };
  CH.stagger = function (list, base, step) {
    if (!list) return;
    var arr = ("length" in list) ? list : list.children;
    base = base || 0;
    step = step || 45;
    Array.prototype.forEach.call(arr, function (el, i) {
      el.style.animationDelay = (base + i * step) + "ms";
      el.classList.add("pop-in");
    });
  };
  CH.countUp = function (el, target, duration) {
    if (!el) return;
    duration = duration || 900;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.requestAnimationFrame) {
      el.textContent = String(target);
      return;
    }
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  /* ---------- shared site chrome ---------- */
  // Applies community name, footer year and the Discord link from site.json
  // on every page. Page scripts may apply the same values again — harmless.
  CH.bindChrome = function () {
    var site = CH.state.site;
    if (!site) return;
    var name = site.communityName || "";
    if (name) {
      ["brandName", "footerBrand"].forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.textContent = name;
      });
    }
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    var url = CH.safeUrl(site.discordUrl);
    Array.prototype.forEach.call(document.querySelectorAll("[data-discord]"), function (a) {
      if (url) {
        a.href = url;
      } else {
        a.hidden = true;
      }
    });
  };

  function fetchChrome() {
    if (CH.state.site && CH.state.site.communityName) {
      CH.bindChrome();
      return;
    }
    CH.fetchJSON("data/site.json").then(function (site) {
      if (!CH.state.site || !CH.state.site.communityName) CH.state.site = site || {};
      CH.bindChrome();
    });
  }

  /* ---------- live Warsaw clock ---------- */
  function initClock() {
    var nodes = document.querySelectorAll(".clock-utc");
    if (!nodes.length) return;
    var fmt = null;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });
    } catch (e) { fmt = null; }
    function tick() {
      var d = new Date();
      var s;
      if (fmt) {
        s = fmt.format(d).replace(/^24:/, "00:") + " WARSAW";
      } else {
        s = d.toLocaleTimeString("en-GB", { hour12: false }) + " LOCAL";
      }
      Array.prototype.forEach.call(nodes, function (n) { n.textContent = s; });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!window.IntersectionObserver) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    Array.prototype.forEach.call(els, function (el) { obs.observe(el); });
  }

  /* ---------- header state + mobile navigation ---------- */
  function initNav() {
    var header = document.querySelector(".site-header");
    if (header) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          header.classList.toggle("scrolled", window.scrollY > 8);
          ticking = false;
        });
      }, { passive: true });
    }

    var burger = document.getElementById("burger");
    var nav = document.getElementById("mainNav");
    if (!burger || !nav) return;

    function closeNav() {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("menu-open", open);
    });
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      a.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ---------- boot ---------- */
  CH.init = function () {
    CH.state.lang = DEFAULT_LANG;
    var pEn = CH.fetchText("data/i18n/en.json").then(function (text) {
      try { window.__EN_FALLBACK = JSON.parse(String(text).replace(/^\uFEFF/, "")); } catch (e) { window.__EN_FALLBACK = {}; }
    });
    var pLang = loadI18n();
    Promise.all([pEn, pLang]).then(function () {
      applyTranslations();
      document.documentElement.lang = DEFAULT_LANG;
      finishReady();
    });

    initClock();
    initReveal();
    initNav();
    fetchChrome();
  };

  document.addEventListener("DOMContentLoaded", function () {
    CH.init();
  });
})();
