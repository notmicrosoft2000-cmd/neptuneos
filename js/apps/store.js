/* =========================================================
 * NeptuneOS — Neptune Store
 * A working app store: install real apps, add desktop
 * shortcuts, launch working or placeholder applications.
 * ========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "neptuneos.store.installed";
  var SHORTCUT_KEY = "neptuneos.store.shortcuts";
  var win = null;

  /* ── catalog ─────────────────────────────────────────── */

  var CATALOG = [
    {
      id: "neptunenotepad",
      name: "NeptuneNotepad",
      desc: "A full-featured text editor for notes, code, and documents.",
      color: "#4fc3f7",
      letter: "N",
      type: "real",
      appKey: "notepad",
      shortcutIcon: "assets/icons/notepad.svg",
    },
    {
      id: "neptunecalc",
      name: "NeptuneCalc",
      desc: "Powerful calculator for everyday and advanced math.",
      color: "#66bb6a",
      letter: "\u03A3",
      type: "real",
      appKey: "calculator",
      shortcutIcon: "assets/icons/calc.svg",
    },
    {
      id: "neptunepaint",
      name: "Neptune Paint Studio",
      desc: "Create art, draw, and edit images with full toolset.",
      color: "#ef5350",
      letter: "P",
      type: "real",
      appKey: "paint",
      shortcutIcon: "assets/icons/paint.svg",
    },
    {
      id: "neptuneclock",
      name: "Neptune Clock",
      desc: "Analog and digital clock with timezone support.",
      color: "#ffa726",
      letter: "\u23F0",
      type: "real",
      appKey: "clock",
      shortcutIcon: "assets/icons/clock.svg",
    },
    {
      id: "neptuneterminal",
      name: "Neptune Terminal",
      desc: "Command-line interface for power users and developers.",
      color: "#ab47bc",
      letter: ">_",
      type: "real",
      appKey: "terminal",
      shortcutIcon: "assets/icons/terminal.svg",
    },
    {
      id: "neptuneemail",
      name: "Neptune Email",
      desc: "Send and receive emails from your desktop.",
      color: "#42a5f5",
      letter: "@",
      type: "placeholder",
    },
    {
      id: "neptunevideo",
      name: "Neptune Video Editor",
      desc: "Edit videos with transitions, effects, and more.",
      color: "#ec407a",
      letter: "\u25B6",
      type: "placeholder",
    },
    {
      id: "neptunemusic",
      name: "Neptune Music Maker",
      desc: "Compose music with virtual instruments and tracks.",
      color: "#7e57c2",
      letter: "\u266B",
      type: "placeholder",
    },
    {
      id: "neptunephotos",
      name: "Neptune Photos",
      desc: "Organize, edit, and share your photo collection.",
      color: "#26a69a",
      letter: "\u2615",
      type: "placeholder",
    },
    {
      id: "neptunegames",
      name: "Neptune Games Pro",
      desc: "A curated collection of games and entertainment.",
      color: "#ff7043",
      letter: "\u2694",
      type: "placeholder",
    },
  ];

  /* ── helpers ─────────────────────────────────────────── */

  function getInstalled() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveInstalled(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function isInstalled(id) {
    return getInstalled()[id] === true;
  }

  function getShortcutIds() {
    try {
      return JSON.parse(localStorage.getItem(SHORTCUT_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveShortcutIds(arr) {
    try {
      localStorage.setItem(SHORTCUT_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function hasShortcut(id) {
    return getShortcutIds().indexOf(id) !== -1;
  }

  function addShortcutId(id) {
    if (!hasShortcut(id)) {
      var arr = getShortcutIds();
      arr.push(id);
      saveShortcutIds(arr);
    }
  }

  /* ── install / open ──────────────────────────────────── */

  function installApp(entry) {
    var installed = getInstalled();
    installed[entry.id] = true;
    saveInstalled(installed);

    var dir = "/C:/Program Files/NeptuneOS";
    if (!OS.fs.exists(dir)) OS.fs.mkdir(dir);
    var filePath = dir + "/" + entry.name + ".exe";
    if (!OS.fs.exists(filePath)) {
      OS.fs.write(
        filePath,
        "NeptuneOS Store application \u2014 " + entry.name + "\nType: " + entry.type + "\n" + (entry.appKey ? "AppKey: " + entry.appKey + "\n" : "") + "Description: " + entry.desc
      );
    }

    if (entry.type === "real" && entry.appKey) {
      OS.desktop.addItem({
        id: "shortcut-" + entry.id,
        label: entry.name,
        icon: entry.shortcutIcon || "assets/icons/store.svg",
        launch: function () {
          OS.apps[entry.appKey].launch();
        },
      });
      addShortcutId(entry.id);
    }

    OS.message("Neptune Store", entry.name + " installed successfully!", "info");
  }

  function openApp(entry) {
    if (entry.type === "real" && entry.appKey && OS.apps[entry.appKey]) {
      OS.apps[entry.appKey].launch();
    } else if (entry.type === "placeholder") {
      OS.message(
        "Neptune Store",
        "Coming soon! We haven\u2019t built " + entry.name + " yet.\n\nCheck back in a future NeptuneOS update.",
        "info"
      );
    }
  }

  /* ── SVG icon generator ──────────────────────────────── */

  function makeIconSVG(color, letter) {
    return (
      '<svg viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="g-' + letter.replace(/[^a-zA-Z0-9]/g, "") + '" cx="40%" cy="35%">' +
      '<stop offset="0%" stop-color="' + lighten(color, 30) + '"/>' +
      '<stop offset="100%" stop-color="' + color + '"/>' +
      "</radialGradient></defs>" +
      '<circle cx="24" cy="24" r="22" fill="url(#g-' + letter.replace(/[^a-zA-Z0-9]/g, "") + ')" stroke="' + darken(color, 20) + '" stroke-width="1.5"/>' +
      '<text x="24" y="29" text-anchor="middle" font-family="Segoe UI, Tahoma, sans-serif" font-size="18" font-weight="bold" fill="#fff">' +
      escapeXml(letter) +
      "</text></svg>"
    );
  }

  function lighten(hex, pct) {
    var rgb = hexToRgb(hex);
    return (
      "rgb(" +
      Math.min(255, rgb.r + Math.round(2.55 * pct)) +
      "," +
      Math.min(255, rgb.g + Math.round(2.55 * pct)) +
      "," +
      Math.min(255, rgb.b + Math.round(2.55 * pct)) +
      ")"
    );
  }

  function darken(hex, pct) {
    var rgb = hexToRgb(hex);
    return (
      "rgb(" +
      Math.max(0, rgb.r - Math.round(2.55 * pct)) +
      "," +
      Math.max(0, rgb.g - Math.round(2.55 * pct)) +
      "," +
      Math.max(0, rgb.b - Math.round(2.55 * pct)) +
      ")"
    );
  }

  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3)
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function escapeXml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /* ── render ──────────────────────────────────────────── */

  function renderGrid(filter) {
    var grid = win.content.querySelector("#store-grid");
    if (!grid) return;

    var q = (filter || "").toLowerCase();
    var html = "";
    var count = 0;

    CATALOG.forEach(function (entry) {
      if (q && entry.name.toLowerCase().indexOf(q) === -1 && entry.desc.toLowerCase().indexOf(q) === -1) return;
      count++;

      var installed = isInstalled(entry.id);
      var isPlaceholder = entry.type === "placeholder";

      var btnLabel, btnClass;
      if (installed) {
        if (isPlaceholder) {
          btnLabel = "Unavailable";
          btnClass = "store-btn store-btn-unavailable";
        } else {
          btnLabel = "Open";
          btnClass = "store-btn store-btn-open";
        }
      } else {
        btnLabel = "Install";
        btnClass = "store-btn store-btn-install";
      }

      var badge = "";
      if (installed && !isPlaceholder) {
        badge = '<span class="store-badge store-badge-installed">Installed</span>';
      } else if (installed && isPlaceholder) {
        badge = '<span class="store-badge store-badge-soon">Coming Soon</span>';
      } else if (isPlaceholder) {
        badge = '<span class="store-badge store-badge-soon">Coming Soon</span>';
      }

      var typeTag = isPlaceholder
        ? '<span class="store-type-tag store-type-soon">Preview</span>'
        : '<span class="store-type-tag store-type-ready">Ready</span>';

      var iconSvg = makeIconSVG(entry.color, entry.letter);

      html +=
        '<div class="store-card">' +
          '<div class="store-card-icon-wrap">' +
            '<div class="store-card-icon">' + iconSvg + "</div>" +
            badge +
          "</div>" +
          '<div class="store-card-info">' +
            '<div class="store-card-row">' +
              '<span class="store-card-name">' + OS.esc(entry.name) + "</span>" +
              typeTag +
            "</div>" +
            '<div class="store-card-desc">' + OS.esc(entry.desc) + "</div>" +
          "</div>" +
          '<div class="store-card-actions">' +
            '<span class="store-price">Free</span>' +
            '<button class="' + btnClass + '" data-store-id="' + entry.id + '">' + btnLabel + "</button>" +
          "</div>" +
        "</div>";
    });

    if (!count) {
      html = '<div class="store-empty">No apps found matching &ldquo;' + OS.esc(q) + "&rdquo;</div>";
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".store-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var storeId = btn.getAttribute("data-store-id");
        var entry = CATALOG.find(function (e) { return e.id === storeId; });
        if (!entry) return;

        if (isInstalled(entry.id)) {
          openApp(entry);
          return;
        }

        installApp(entry);

        btn.className = entry.type === "placeholder" ? "store-btn store-btn-unavailable" : "store-btn store-btn-open";
        btn.textContent = entry.type === "placeholder" ? "Unavailable" : "Open";

        var card = btn.closest(".store-card");
        if (card) {
          var existingBadge = card.querySelector(".store-badge");
          if (existingBadge) existingBadge.remove();
          var iconWrap = card.querySelector(".store-card-icon-wrap");
          if (iconWrap) {
            var b = document.createElement("span");
            b.className = entry.type === "placeholder" ? "store-badge store-badge-soon" : "store-badge store-badge-installed";
            b.textContent = entry.type === "placeholder" ? "Coming Soon" : "Installed";
            iconWrap.appendChild(b);
          }
        }

        updateCount();
      });
    });
  }

  function updateCount() {
    var countEl = win.content.querySelector("#store-count");
    if (!countEl) return;
    var installedCount = 0;
    var readyCount = 0;
    CATALOG.forEach(function (e) {
      if (e.type === "real") readyCount++;
      if (isInstalled(e.id)) installedCount++;
    });
    countEl.textContent = installedCount + " of " + readyCount + " apps installed";
  }

  /* ── CSS ─────────────────────────────────────────────── */

  var CSS =
    "#store-wrap{font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;background:var(--bg,#1a1a2e);color:var(--text,#e0e0e0);height:100%;display:flex;flex-direction:column;overflow:hidden;}" +

    /* header */
    ".store-header{display:flex;align-items:center;gap:14px;padding:16px 20px;background:linear-gradient(135deg,#0d1b3e 0%,#162447 50%,#1f4068 100%);border-bottom:1px solid rgba(255,255,255,0.06);}" +
    ".store-brand{display:flex;align-items:center;gap:10px;flex-shrink:0;}" +
    ".store-brand-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2979ff,#00b0ff);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(41,121,255,0.4);}" +
    ".store-brand-text{display:flex;flex-direction:column;}" +
    ".store-brand-name{font-size:16px;font-weight:700;color:#fff;line-height:1.2;letter-spacing:-0.3px;}" +
    ".store-brand-sub{font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:0.5px;text-transform:uppercase;}" +

    /* search */
    ".store-search{flex:1;max-width:320px;margin-left:auto;position:relative;}" +
    ".store-search input{width:100%;padding:8px 14px 8px 36px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:rgba(255,255,255,0.07);color:#fff;font-size:13px;outline:none;box-sizing:border-box;transition:border-color .2s,background .2s;}" +
    ".store-search input::placeholder{color:rgba(255,255,255,0.35);}" +
    ".store-search input:focus{border-color:rgba(100,180,255,0.5);background:rgba(255,255,255,0.11);}" +
    ".store-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:13px;pointer-events:none;}" +

    /* count bar */
    ".store-count{font-size:12px;color:rgba(255,255,255,0.4);padding:14px 22px 0;display:flex;align-items:center;gap:8px;}" +
    ".store-count-line{flex:1;height:1px;background:rgba(255,255,255,0.06);}" +

    /* grid */
    "#store-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 22px 22px;overflow-y:auto;flex:1;}" +

    /* card */
    ".store-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;display:flex;flex-direction:column;transition:border-color .2s,background .2s,box-shadow .2s;overflow:hidden;}" +
    ".store-card:hover{border-color:rgba(100,180,255,0.25);background:rgba(255,255,255,0.07);box-shadow:0 4px 16px rgba(0,0,0,0.2);}" +

    /* card icon area */
    ".store-card-icon-wrap{position:relative;display:flex;align-items:center;justify-content:center;padding:20px 16px 12px;}" +
    ".store-card-icon{width:56px;height:56px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:rgba(255,255,255,0.05);}" +
    ".store-card-icon svg{width:52px;height:52px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));}" +

    /* badges */
    ".store-badge{position:absolute;top:8px;right:8px;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;letter-spacing:0.3px;}" +
    ".store-badge-installed{background:rgba(76,175,80,0.18);color:#81c784;}" +
    ".store-badge-soon{background:rgba(255,167,38,0.15);color:#ffb74d;}" +

    /* card info */
    ".store-card-info{padding:0 16px;flex:1;}" +
    ".store-card-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;}" +
    ".store-card-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".store-type-tag{font-size:9px;padding:1px 6px;border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;}" +
    ".store-type-ready{background:rgba(76,175,80,0.15);color:#81c784;}" +
    ".store-type-soon{background:rgba(255,167,38,0.12);color:#ffb74d;}" +
    ".store-card-desc{font-size:11px;color:rgba(255,255,255,0.45);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}" +

    /* card actions */
    ".store-card-actions{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid rgba(255,255,255,0.05);margin-top:10px;}" +
    ".store-price{font-size:12px;font-weight:600;color:rgba(255,255,255,0.3);}" +

    /* buttons */
    ".store-btn{padding:6px 18px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:background .18s,color .18s,transform .1s;letter-spacing:0.2px;}" +
    ".store-btn:active{transform:scale(0.97);}" +
    ".store-btn-install{background:linear-gradient(135deg,#2979ff,#1565c0);color:#fff;box-shadow:0 2px 8px rgba(41,121,255,0.3);}" +
    ".store-btn-install:hover{background:linear-gradient(135deg,#448aff,#1976d2);box-shadow:0 3px 12px rgba(41,121,255,0.45);}" +
    ".store-btn-open{background:rgba(76,175,80,0.15);color:#81c784;border:1px solid rgba(76,175,80,0.25);}" +
    ".store-btn-open:hover{background:rgba(76,175,80,0.25);}" +
    ".store-btn-unavailable{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.25);cursor:default;}" +

    /* empty */
    ".store-empty{grid-column:1/-1;text-align:center;padding:48px 20px;color:rgba(255,255,255,0.3);font-size:13px;}";

  var styleEl = null;
  function ensureCSS() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
  }

  /* ── app registration ────────────────────────────────── */

  var app = {
    id: "store",
    name: "Neptune Store",
    icon: "assets/icons/store.svg",
    group: "system",

    launch: function () {
      if (win && win.el.isConnected) {
        win.restore();
        win.focus();
        return win;
      }

      ensureCSS();

      win = OS.wm.createWindow({
        title: "Neptune Store",
        icon: this.icon,
        width: 680,
        height: 500,
        resizable: true,
        app: "store",
        onClose: function () {
          win = null;
        },
      });

      var installedCount = 0;
      var readyCount = 0;
      CATALOG.forEach(function (e) {
        if (e.type === "real") readyCount++;
        if (isInstalled(e.id)) installedCount++;
      });

      win.content.innerHTML =
        '<div id="store-wrap">' +
          '<div class="store-header">' +
            '<div class="store-brand">' +
              '<div class="store-brand-icon">N</div>' +
              '<div class="store-brand-text">' +
                '<span class="store-brand-name">Neptune Store</span>' +
                '<span class="store-brand-sub">NeptuneOS Marketplace</span>' +
              "</div>" +
            "</div>" +
            '<div class="store-search">' +
              '<span class="store-search-icon">\uD83D\uDD0D</span>' +
              '<input type="text" id="store-search-input" placeholder="Search apps..." autocomplete="off">' +
            "</div>" +
          "</div>" +
          '<div class="store-count">' +
            '<span id="store-count">' + installedCount + " of " + readyCount + ' apps installed</span>' +
            '<span class="store-count-line"></span>' +
          "</div>" +
          '<div id="store-grid"></div>' +
        "</div>";

      var searchInput = win.content.querySelector("#store-search-input");
      renderGrid("");

      searchInput.addEventListener("input", function () {
        renderGrid(searchInput.value);
      });

      searchInput.focus();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.store = app;
})();
