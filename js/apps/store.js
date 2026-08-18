/* =========================================================
 * NeptuneOS — Neptune Store
 * A parody app store where users can "install" apps that
 * don't actually do anything. Search, browse, and install
 * placeholder apps into the virtual filesystem.
 * ========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "neptuneos.store.installed";
  var win = null;

  var CATALOG = [
    { id: "calcpro",    name: "Neptune Calculator Pro", emoji: "\uD83E\uDDEE", desc: "The calculator you already have, but PRO",     price: "Free",  installed: true },
    { id: "weather",    name: "Neptune Weather",        emoji: "\u26C5",       desc: "Always 72\u00B0F and sunny",                  price: "Free" },
    { id: "maps",       name: "Neptune Maps",           emoji: "\uD83D\uDDFA\uFE0F", desc: "Navigate to places that don\u2019t exist", price: "Free" },
    { id: "music",      name: "Neptune Music",          emoji: "\uD83C\uDFB5", desc: "Listen to silence in high quality",           price: "Free" },
    { id: "video",      name: "Neptune Video",          emoji: "\uD83C\uDFAC", desc: "A video player with no videos",               price: "Free" },
    { id: "camera",     name: "Neptune Camera",         emoji: "\uD83D\uDCF7", desc: "Take screenshots of your desktop",            price: "Free" },
    { id: "notes",      name: "Neptune Notes",          emoji: "\uD83D\uDCDD", desc: "Like Sticky Notes but worse",                 price: "Free" },
    { id: "paint",      name: "Neptune Paint Pro",      emoji: "\uD83C\uDFA8", desc: "Paint with AI (the AI is a random number generator)", price: "Free" },
    { id: "office",     name: "Neptune Office",         emoji: "\uD83D\uDCC4", desc: "Write documents nobody will read",            price: "$9.99" },
    { id: "games",      name: "Neptune Games Bundle",   emoji: "\uD83C\uDFAE", desc: "Snake and Pac-Man (you already have these)",  price: "Free" },
    { id: "vpn",        name: "Neptune VPN",            emoji: "\uD83D\uDD10", desc: "Hide your IP from... nobody",                 price: "Free" },
    { id: "antivirus",  name: "Neptune Antivirus",      emoji: "\uD83D\uDEE1\uFE0F", desc: "Scans for viruses that don\u2019t exist", price: "Free" },
  ];

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
    var installed = getInstalled();
    return installed[id] === true || (id === "calcpro");
  }

  function installApp(entry) {
    var installed = getInstalled();
    installed[entry.id] = true;
    saveInstalled(installed);

    var dir = "/C:/Program Files/NeptuneOS";
    if (!OS.fs.exists(dir)) OS.fs.mkdir(dir);
    var filePath = dir + "/" + entry.name + ".exe";
    if (!OS.fs.exists(filePath)) {
      OS.fs.write(filePath, "NeptuneOS Store application \u2014 placeholder.");
    }
    OS.message("Neptune Store", OS.esc(entry.name) + " installed successfully!", "info");
  }

  function renderGrid(filter) {
    var grid = win.content.querySelector("#store-grid");
    if (!grid) return;

    var q = (filter || "").toLowerCase();
    var html = "";

    CATALOG.forEach(function (entry) {
      if (q && entry.name.toLowerCase().indexOf(q) === -1) return;

      var installed = isInstalled(entry.id);
      var btnClass = installed ? "store-btn store-btn-open" : "store-btn store-btn-install";
      var btnText = installed ? "Open" : "Install";
      var badge = installed ? '<span class="store-badge">Installed</span>' : "";
      var priceClass = entry.price === "Free" ? "store-price store-price-free" : "store-price store-price-paid";

      html +=
        '<div class="store-card">' +
          '<div class="store-card-header">' +
            '<div class="store-card-icon">' + entry.emoji + "</div>" +
            badge +
          "</div>" +
          '<div class="store-card-body">' +
            '<div class="store-card-name">' + OS.esc(entry.name) + "</div>" +
            '<div class="store-card-desc">' + OS.esc(entry.desc) + "</div>" +
          "</div>" +
          '<div class="store-card-footer">' +
            '<span class="' + priceClass + '">' + OS.esc(entry.price) + "</span>" +
            '<button class="' + btnClass + '" data-app-id="' + entry.id + '">' + btnText + "</button>" +
          "</div>" +
        "</div>";
    });

    if (!html) {
      html = '<div class="store-empty">No apps found matching "' + OS.esc(q) + '"</div>';
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".store-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var appId = btn.getAttribute("data-app-id");
        var entry = CATALOG.find(function (e) { return e.id === appId; });
        if (!entry) return;

        if (isInstalled(entry.id)) {
          OS.message("Neptune Store", "This app is a placeholder. It doesn\u2019t actually do anything.", "info");
          return;
        }

        installApp(entry);
        btn.className = "store-btn store-btn-open";
        btn.textContent = "Open";

        var card = btn.closest(".store-card");
        if (card) {
          var badge = card.querySelector(".store-badge");
          if (!badge) {
            var header = card.querySelector(".store-card-header");
            if (header) {
              var b = document.createElement("span");
              b.className = "store-badge";
              b.textContent = "Installed";
              header.appendChild(b);
            }
          }
        }
      });
    });
  }

  var CSS =
    "#store-wrap{font-family:Tahoma,Geneva,Verdana,sans-serif;background:var(--bg,#1a1a2e);color:var(--text,#e0e0e0);height:100%;display:flex;flex-direction:column;overflow:hidden;}" +
    ".store-header{display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,#0f3460,#16213e);border-bottom:1px solid rgba(255,255,255,0.08);}" +
    ".store-header h1{margin:0;font-size:18px;font-weight:600;color:#fff;white-space:nowrap;}" +
    ".store-search{flex:1;max-width:340px;margin-left:auto;position:relative;}" +
    ".store-search input{width:100%;padding:8px 12px 8px 32px;border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:13px;outline:none;box-sizing:border-box;}" +
    ".store-search input::placeholder{color:rgba(255,255,255,0.4);}" +
    ".store-search input:focus{border-color:rgba(100,180,255,0.5);background:rgba(255,255,255,0.12);}" +
    ".store-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.4);font-size:13px;pointer-events:none;}" +
    ".store-count{font-size:12px;color:rgba(255,255,255,0.45);padding:12px 20px 0;}" +
    "#store-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:12px 20px 20px;overflow-y:auto;flex:1;}" +
    ".store-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;display:flex;flex-direction:column;transition:border-color 0.15s,background 0.15s;overflow:hidden;}" +
    ".store-card:hover{border-color:rgba(100,180,255,0.3);background:rgba(255,255,255,0.08);}" +
    ".store-card-header{position:relative;display:flex;align-items:center;justify-content:center;padding:20px 16px 10px;}" +
    ".store-card-icon{font-size:36px;line-height:1;}" +
    ".store-badge{position:absolute;top:8px;right:8px;font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(100,200,120,0.2);color:#6bc87a;font-weight:600;}" +
    ".store-card-body{padding:0 14px;flex:1;}" +
    ".store-card-name{font-size:13px;font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".store-card-desc{font-size:11px;color:rgba(255,255,255,0.5);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}" +
    ".store-card-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;}" +
    ".store-price{font-size:12px;font-weight:600;}" +
    ".store-price-free{color:#6bc87a;}" +
    ".store-price-paid{color:#e8b44a;}" +
    ".store-btn{padding:5px 16px;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s,color 0.15s;}" +
    ".store-btn-install{background:#2563eb;color:#fff;}" +
    ".store-btn-install:hover{background:#1d4ed8;}" +
    ".store-btn-open{background:rgba(100,200,120,0.15);color:#6bc87a;}" +
    ".store-btn-open:hover{background:rgba(100,200,120,0.25);}" +
    ".store-empty{grid-column:1/-1;text-align:center;padding:40px 20px;color:rgba(255,255,255,0.35);font-size:13px;}";

  var styleEl = null;
  function ensureCSS() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
  }

  var app = {
    id: "store",
    name: "Neptune Store",
    icon: "assets/icons/store.svg",
    group: "system",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      ensureCSS();

      win = OS.wm.createWindow({
        title: "Neptune Store",
        icon: this.icon,
        width: 660,
        height: 480,
        resizable: true,
        app: "store",
        onClose: function () { win = null; },
      });

      var installedCount = 0;
      CATALOG.forEach(function (e) { if (isInstalled(e.id)) installedCount++; });

      win.content.innerHTML =
        '<div id="store-wrap">' +
          '<div class="store-header">' +
            "<h1>\uD83D\uDED2 Neptune Store</h1>" +
            '<div class="store-search">' +
              '<span class="store-search-icon">\uD83D\uDD0D</span>' +
              '<input type="text" id="store-search-input" placeholder="Search apps..." autocomplete="off">' +
            "</div>" +
          "</div>" +
          '<div class="store-count">' + installedCount + " of " + CATALOG.length + " apps installed</div>" +
          '<div id="store-grid"></div>' +
        "</div>";

      var searchInput = win.content.querySelector("#store-search-input");
      renderGrid("");

      searchInput.addEventListener("input", function () {
        renderGrid(searchInput.value);
      });
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.store = app;
})();
