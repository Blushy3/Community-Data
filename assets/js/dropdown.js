/* ============================================================
   Community Data v2.0 — custom dropdowns for toolbar selects.
   Mirrors native <select> into a vault-style menu (identical to
   the language switcher). The original selects stay in the DOM
   (hidden), so all existing filter logic keeps working — the UI
   syncs both ways and fires a real "change" event.
   ============================================================ */
(function () {
  "use strict";

  function fireChange(select) {
    try {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      var ev = document.createEvent("HTMLEvents");
      ev.initEvent("change", true, false);
      select.dispatchEvent(ev);
    }
  }

  function closeAll() {
    Array.prototype.forEach.call(document.querySelectorAll(".dd.open"), function (w) {
      w.classList.remove("open");
      var b = w.querySelector(".dd-btn");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  function sync(select) {
    var ui = select.__ddUI;
    if (!ui) return;
    var opt = select.options[select.selectedIndex];
    ui.label.textContent = opt ? (opt.textContent || opt.value) : "";
    Array.prototype.forEach.call(ui.menu.children, function (item) {
      item.setAttribute("aria-selected", "false");
    });
    if (select.selectedIndex >= 0 && ui.menu.children[select.selectedIndex]) {
      ui.menu.children[select.selectedIndex].setAttribute("aria-selected", "true");
    }
  }

  function refresh(select, ui) {
    var opts = select.options;
    if (!opts.length) {
      ui.wrap.style.display = "none";
      return;
    }
    ui.wrap.style.display = "";
    ui.menu.innerHTML = "";
    for (var i = 0; i < opts.length; i++) {
      (function (idx) {
        var opt = opts[idx];
        var item = document.createElement("button");
        item.type = "button";
        item.className = "dd-item";
        item.setAttribute("role", "option");
        item.textContent = opt.textContent || opt.value;
        if (idx === select.selectedIndex) item.setAttribute("aria-selected", "true");
        item.addEventListener("click", function () {
          select.selectedIndex = idx;
          sync(select);
          closeAll();
          fireChange(select);
        });
        ui.menu.appendChild(item);
      })(i);
    }
    sync(select);
  }

  function enhance(select) {
    if (select.__ddUI) return;

    var wrap = document.createElement("div");
    wrap.className = "dd";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");

    var label = document.createElement("span");
    label.className = "dd-label";
    var caret = document.createElement("span");
    caret.className = "caret";
    caret.innerHTML = "&#9660;";
    btn.appendChild(label);
    btn.appendChild(caret);

    var menu = document.createElement("div");
    menu.className = "dd-menu";
    menu.setAttribute("role", "listbox");

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = wrap.classList.contains("open");
      closeAll();
      if (!open) {
        wrap.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        wrap.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    select.parentNode.insertBefore(wrap, select.nextSibling);
    select.classList.add("dd-native");

    select.__ddUI = { wrap: wrap, btn: btn, label: label, menu: menu };
    refresh(select, select.__ddUI);

    // Rebuild items whenever the page script refills the select
    // (initial load, language change, etc.)
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { refresh(select, select.__ddUI); });
      mo.observe(select, { childList: true });
    }
  }

  function init() {
    var selects = document.querySelectorAll(".toolbar select, #categoryFilter, #rarityFilter, #tagFilter");
    Array.prototype.forEach.call(selects, enhance);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
