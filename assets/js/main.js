/* ============================================================
   Community Data \u2014 core module
   i18n loading, language switcher, header/nav, toast,
   data helpers, security (URL/text sanitizing), empty states.
   ============================================================ */
(function () {
  "use strict";

  var CH = (window.CH = window.CH || {});

  var DEFAULT_LANG = "en"; // v4 — English-only site
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

  /* ---------- i18n (English only, v4) ---------- */
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
    if (/^\.{1,2}\//.test(url) || /^\//.test(url)) return url;
    return "";
  };

  /* ---------- translation application ---------- */
  function applyTranslations() {
    var nodes = document.querySelectorAll("[data-i18n]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-i18n");
      var resolved = CH.t(key);
      // never overwrite the built-in English text with a raw key (e.g. offline)
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
    box.appendChild(CH.el("div", "ic", "✦"));
    box.appendChild(CH.el("p", null, message));
    return box;
  };

  /* ---------- shared debounce helper ---------- */
  CH.debounce = function (fn, wait) {
    var timer = null;
    wait = wait || 150;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  };

  
  /* ---------- design helpers (v2 redesign) ---------- */
  CH.RARITY = {
    common: "#98a2b3",
    uncommon: "#3fd97f",
    rare: "#4da3ff",
    epic: "#b56cff",
    legendary: "#ffb02e",
    mythic: "#ff4d6d"
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
  CH.avatarGradient = function (name) {
    var h = CH.nameHue(name);
    return "linear-gradient(135deg, hsl(" + h + ",68%,56%), hsl(" + ((h + 70) % 360) + ",70%,42%))";
  };
  CH.stagger = function (list, base, step) {
    if (!list) return;
    var arr = ("length" in list) ? list : list.children;
    base = base || 40;
    step = step || 55;
    Array.prototype.forEach.call(arr, function (el, i) {
      el.style.animationDelay = (base + i * step) + "ms";
      el.classList.add("pop-in");
    });
  };
  CH.countUp = function (el, target, duration) {
    if (!el) return;
    duration = duration || 1100;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.requestAnimationFrame) {
      el.textContent = String(target);
      return;
    }
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      // easeOutBack — gentle spring overshoot for a premium feel
      var q = p - 1;
      var eased = 1 + 2.70158 * q * q * q + 1.70158 * q * q;
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  /* ---------- live Warsaw clock (masthead + navbar) ---------- */
  function initClock() {
    var nodes = document.querySelectorAll(".clock-utc");
    if (!nodes.length) return;
    var fmt = null;
    try {
      // Europe/Warsaw handles CET/CEST daylight saving automatically
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
        // graceful fallback: visitor's local time
        s = d.toLocaleTimeString("en-GB", { hour12: false }) + " LOCAL";
      }
      Array.prototype.forEach.call(nodes, function (n) { n.textContent = s; });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- boot ---------- */
  CH.init = function () {

    // English-only: single pack request, then translate.
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

    // live Warsaw clock in the masthead + navbar
    initClock();

    // scroll-reveal observer
    if (window.IntersectionObserver) {
      var els = document.querySelectorAll(".reveal");
      if (els.length) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        Array.prototype.forEach.call(els, function (el) { obs.observe(el); });
      }
    } else {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) { el.classList.add("visible"); });
    }

    // header scroll effect — the ink navbar slides in only AFTER the
    // static masthead has fully scrolled away (no overlap, later entry)
    var header = document.querySelector(".site-header");
    if (header) {
      var mast = document.querySelector(".masthead");
      function navLimit() {
        return mast && mast.offsetHeight ? mast.offsetHeight + 28 : 240;
      }
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            header.classList.toggle("scrolled", window.scrollY > navLimit());
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
      window.addEventListener("resize", function () {
        header.classList.toggle("scrolled", window.scrollY > navLimit());
      });
    }

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

  /* ============================================================
     v3 MOTION SUITE — scroll progress bar, cursor companion,
     3D tilt + spotlight cards (event-delegated, so dynamically
     rendered content is covered automatically), magnetic
     controls, ripple pulses and hero parallax layers.
     Progressive enhancement only: requires a fine pointer and
     respects prefers-reduced-motion. No existing hook changes.
     ============================================================ */
  function motionEnabled() {
    if (!window.matchMedia) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!window.matchMedia("(pointer: fine)").matches) return false;
    return true;
  }

  function initMotion() {
    if (!motionEnabled()) return;

    /* --- scroll progress bar --- */
    var progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);

    var progTicking = false;
    function updateProgress() {
      progTicking = false;
      var doc = document.documentElement;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      var y = window.scrollY || doc.scrollTop || 0;
      var p = Math.min(1, Math.max(0, y / max));
      progress.style.transform = "scaleX(" + p + ")";
    }
    window.addEventListener("scroll", function () {
      if (progTicking) return;
      progTicking = true;
      requestAnimationFrame(updateProgress);
    }, { passive: true });
    updateProgress();

    /* --- cursor companion: crisp gold dot + lagging spectral ring --- */
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.setAttribute("aria-hidden", "true");
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = -100, my = -100, rx = -100, ry = -100, cursorOn = false, ringRunning = false;
    function ringLoop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.4) {
        requestAnimationFrame(ringLoop);
      } else {
        ringRunning = false;
      }
    }
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!cursorOn) {
        cursorOn = true; rx = mx; ry = my;
        dot.classList.add("on"); ring.classList.add("on");
      }
      if (!ringRunning) { ringRunning = true; requestAnimationFrame(ringLoop); }
    }, { passive: true });
    document.addEventListener("mouseover", function (e) {
      var t = e.target;
      var hot = !!(t && t.closest && t.closest("a, button, .card, input, select, [tabindex]"));
      ring.classList.toggle("hot", hot);
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () {
      cursorOn = false;
      dot.classList.remove("on");
      ring.classList.remove("on");
    });

    /* --- 3D tilt + cursor spotlight (delegated → covers dynamic cards) --- */
    var TILT = 5;
    var tiltEl = null, tiltRaf = false, tiltX = 0, tiltY = 0;
    function cardOf(target) {
      return (target && target.closest) ? target.closest(".card, .profile-ach-item") : null;
    }
    function applyTilt() {
      tiltRaf = false;
      if (!tiltEl || !tiltEl.isConnected) { tiltEl = null; return; }
      var r = tiltEl.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = (tiltX - r.left) / r.width * 100;
      var py = (tiltY - r.top) / r.height * 100;
      tiltEl.style.setProperty("--mx", px.toFixed(2) + "%");
      tiltEl.style.setProperty("--my", py.toFixed(2) + "%");
      tiltEl.style.setProperty("--rx", ((50 - py) / 50 * TILT).toFixed(2) + "deg");
      tiltEl.style.setProperty("--ry", ((px - 50) / 50 * TILT).toFixed(2) + "deg");
    }
    document.addEventListener("pointerover", function (e) {
      var el = cardOf(e.target);
      if (el && el !== tiltEl) {
        tiltEl = el;
        tiltX = e.clientX; tiltY = e.clientY;
        el.classList.add("tilting");
        if (!tiltRaf) { tiltRaf = true; requestAnimationFrame(applyTilt); }
      }
    }, { passive: true });
    document.addEventListener("pointermove", function (e) {
      if (!tiltEl) return;
      tiltX = e.clientX; tiltY = e.clientY;
      if (!tiltRaf) { tiltRaf = true; requestAnimationFrame(applyTilt); }
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var el = cardOf(e.target);
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) {
        el.classList.remove("tilting");
        el.style.removeProperty("--rx");
        el.style.removeProperty("--ry");
        if (el === tiltEl) tiltEl = null;
      }
    }, { passive: true });

    /* --- magnetic controls --- */
    var MAG = 6;
    // dropdown/select buttons excluded — they must not move on hover
    var MAG_SEL = ".btn, .burger, .back-link, .brand";
    var magEl = null, magRaf = false, magX = 0, magY = 0;
    function applyMag() {
      magRaf = false;
      if (!magEl || !magEl.isConnected) { magEl = null; return; }
      var r = magEl.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var dx = Math.max(-1, Math.min(1, (magX - (r.left + r.width / 2)) / (r.width / 2)));
      var dy = Math.max(-1, Math.min(1, (magY - (r.top + r.height / 2)) / (r.height / 2)));
      magEl.style.setProperty("--mag-x", (dx * MAG).toFixed(2) + "px");
      magEl.style.setProperty("--mag-y", (dy * MAG).toFixed(2) + "px");
    }
    document.addEventListener("pointerover", function (e) {
      var t = e.target;
      var el = (t && t.closest) ? t.closest(MAG_SEL) : null;
      if (el) magEl = el;
    }, { passive: true });
    document.addEventListener("pointermove", function (e) {
      if (!magEl) return;
      magX = e.clientX; magY = e.clientY;
      if (!magRaf) { magRaf = true; requestAnimationFrame(applyMag); }
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var t = e.target;
      var el = (t && t.closest) ? t.closest(MAG_SEL) : null;
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) {
        el.style.removeProperty("--mag-x");
        el.style.removeProperty("--mag-y");
        if (el === magEl) magEl = null;
      }
    }, { passive: true });

    /* --- ripple pulse on primary buttons --- */
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".btn") : null;
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2.2;
      var s = document.createElement("span");
      s.className = "ripple";
      s.style.width = s.style.height = size + "px";
      s.style.left = (e.clientX - r.left - size / 2) + "px";
      s.style.top = (e.clientY - r.top - size / 2) + "px";
      btn.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 700);
    });

    /* --- hero parallax layers ([data-parallax]) --- */
    var layers = document.querySelectorAll("[data-parallax]");
    if (layers.length) {
      var parTicking = false;
      function updateParallax() {
        parTicking = false;
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        Array.prototype.forEach.call(layers, function (el) {
          var f = parseFloat(el.getAttribute("data-parallax")) || 0;
          el.style.setProperty("--py", (y * f).toFixed(1) + "px");
        });
      }
      window.addEventListener("scroll", function () {
        if (parTicking) return;
        parTicking = true;
        requestAnimationFrame(updateParallax);
      }, { passive: true });
      updateParallax();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    CH.init();
    initMotion();
  });
})();

