/* =========================================================
 * neptuneOS — Desktop
 * Icons, selection, context menus, wallpapers, power options.
 * ========================================================= */
(function () {
  "use strict";

  const ICON_SIZE = 84;  // horizontal pitch
  const ICON_GAP = 88;   // vertical pitch
  const POS_KEY = "retroos.desktop.positions";

  const WALLPAPERS = {
    hills: {
      name: "Rolling Hills",
      css:
        "radial-gradient(ellipse 60% 45% at 50% 62%, #2f8f6f 0%, #1e6b52 35%, transparent 70%)," +
        "radial-gradient(ellipse 70% 40% at 50% 115%, #0f4a38 0%, transparent 60%)," +
        "linear-gradient(180deg, #7ab8e8 0%, #a8d4f0 45%, #bfe2a0 60%, #7fbf7f 100%)",
    },
    teal: {
      name: "Classic Teal",
      css: "#008080",
    },
    navy: {
      name: "Midnight",
      css: "linear-gradient(180deg, #0a0e27 0%, #1d2b64 60%, #1a1a2e 100%)",
    },
    sunset: {
      name: "Sunset",
      css:
        "radial-gradient(ellipse 80% 60% at 50% 90%, #f97316 0%, transparent 55%)," +
        "linear-gradient(180deg, #1e3a8a 0%, #7c3aed 40%, #f97316 75%, #fbbf24 100%)",
    },
    clouds: {
      name: "Clouds",
      css:
        "radial-gradient(circle 80px at 20% 20%, rgba(255,255,255,0.9) 40%, transparent 42%)," +
        "radial-gradient(circle 110px at 70% 30%, rgba(255,255,255,0.85) 40%, transparent 42%)," +
        "radial-gradient(circle 90px at 45% 55%, rgba(255,255,255,0.8) 40%, transparent 42%)," +
        "linear-gradient(180deg, #4a90d9 0%, #9fd0ff 60%, #d9ecff 100%)",
    },
    matrix: {
      name: "Matrix",
      css:
        "repeating-linear-gradient(90deg, rgba(0,180,0,0.12) 0 2px, transparent 2px 14px)," +
        "repeating-linear-gradient(0deg, rgba(0,180,0,0.12) 0 2px, transparent 2px 14px)," +
        "#03110b",
    },
    neptune: {
      name: "Neptune",
      css:
        "radial-gradient(circle 90px at 78% 22%, rgba(111,161,255,0.35) 40%, transparent 42%)," +
        "radial-gradient(ellipse 30% 12% at 82% 24%, rgba(159,194,255,0.9) 0%, transparent 70%)," +
        "radial-gradient(ellipse 55% 40% at 20% 85%, #16305e 0%, transparent 65%)," +
        "linear-gradient(180deg, #05081a 0%, #122d63 55%, #1d2b64 100%)",
    },
  };

  const desktop = {
    items: [],
    selected: new Set(),
    positions: {},
    wallpaper: "hills",

    init() {
      this.loadPositions();
      this.loadWallpaper();
      this.wallpaperEl = document.getElementById("wallpaper");

      this.refreshIcons();
      this.setupSelection();

      document.getElementById("icon-layer").addEventListener("contextmenu", (e) => e.preventDefault());
      document.getElementById("desktop").addEventListener("contextmenu", (e) => this.showContextMenu(e));
      document.getElementById("window-layer").addEventListener("mousedown", () => this.clearSelection());
      document.getElementById("restart-btn").addEventListener("click", () => this.restart());
    },

    /* ---------- icons ---------- */
    addItem(item) {
      this.items.push(item);
      this.refreshIcons();
    },

    refreshIcons() {
      const layer = document.getElementById("icon-layer");
      layer.innerHTML = "";
      this.items.forEach((item, idx) => {
        const el = document.createElement("div");
        el.className = "desktop-icon";
        el.dataset.itemId = item.id;
        el.innerHTML = '<img src="' + OS.esc(item.icon) + '" alt="" draggable="false">' +
          '<div class="label">' + OS.esc(item.label) + "</div>";
        layer.appendChild(el);
        this.applyPosition(item, el, idx);
        this.bindIconEvents(item, el);
      });
    },

    applyPosition(item, el, idx) {
      const pos = this.positions[item.id];
      if (pos) {
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
      } else {
        const col = idx % Math.max(1, Math.floor(document.getElementById("icon-layer").clientWidth / ICON_SIZE));
        const row = Math.floor(idx / Math.max(1, Math.floor(document.getElementById("icon-layer").clientWidth / ICON_SIZE)));
        el.style.left = (col * ICON_SIZE + 6) + "px";
        el.style.top = (row * ICON_GAP + 6) + "px";
      }
    },

    bindIconEvents(item, el) {
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        OS.startmenu.close();
        if (e.ctrlKey || e.shiftKey) {
          this.selected.has(item.id) ? this.selected.delete(item.id) : this.selected.add(item.id);
        } else {
          if (!this.selected.has(item.id)) {
            this.selected.clear();
            this.selected.add(item.id);
          }
        }
        this.renderSelection();
        OS.wm.active && OS.wm.active.focus();

        /* drag to reposition */
        const drag = { ox: e.clientX, oy: e.clientY, moved: false };
        const move = (ev) => {
          const dx = ev.clientX - drag.ox;
          const dy = ev.clientY - drag.oy;
          if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
          drag.moved = true;
          el.style.left = (el.offsetLeft + dx) + "px";
          el.style.top = (el.offsetTop + dy) + "px";
          drag.ox = ev.clientX;
          drag.oy = ev.clientY;
        };
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
          if (drag.moved) this.setItemPosition(item, el.offsetLeft, el.offsetTop);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      });

      el.addEventListener("dblclick", () => {
        this.clearSelection();
        if (typeof item.launch === "function") item.launch();
      });

      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selected.add(item.id);
        this.renderSelection();
        this.showContextMenu(e, item);
      });
    },

    renderSelection() {
      const layer = document.getElementById("icon-layer");
      layer.querySelectorAll(".desktop-icon").forEach((el) => {
        const selected = this.selected.has(el.dataset.itemId);
        el.classList.toggle("selected", selected);
        if (selected) el.style.zIndex = 11;
        else el.style.zIndex = 10;
      });
    },

    clearSelection() {
      this.selected.clear();
      this.renderSelection();
    },

    savePositions() {
      try { localStorage.setItem(POS_KEY, JSON.stringify(this.positions)); } catch (e) {}
    },
    loadPositions() {
      try { this.positions = JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch (e) { this.positions = {}; }
    },

    setItemPosition(item, x, y) {
      this.positions[item.id] = { x, y };
      this.savePositions();
    },

    /* ---------- rubber-band selection ---------- */
    setupSelection() {
      const layer = document.getElementById("icon-layer");
      const box = document.getElementById("selection-box");
      let start = null;

      layer.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (e.target.closest(".desktop-icon")) return;
        this.clearSelection();
        start = { x: e.clientX, y: e.clientY };
        box.style.display = "block";
        box.style.left = e.clientX + "px";
        box.style.top = e.clientY + "px";
        box.style.width = "0px";
        box.style.height = "0px";
      });

      window.addEventListener("mousemove", (e) => {
        if (!start) return;
        const x = Math.min(e.clientX, start.x);
        const y = Math.min(e.clientY, start.y);
        const w = Math.abs(e.clientX - start.x);
        const h = Math.abs(e.clientY - start.y);
        box.style.left = x + "px";
        box.style.top = y + "px";
        box.style.width = w + "px";
        box.style.height = h + "px";

        document.querySelectorAll(".desktop-icon").forEach((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const hit = cx >= x && cx <= x + w && cy >= y && cy <= y + h;
          el.classList.toggle("selected", hit);
        });
      });

      window.addEventListener("mouseup", (e) => {
        if (!start) return;
        this.selected.clear();
        document.querySelectorAll(".desktop-icon").forEach((el) => {
          if (el.classList.contains("selected")) this.selected.add(el.dataset.itemId);
        });
        this.renderSelection();
        start = null;
        box.style.display = "none";
      });
    },

    /* ---------- context menu ---------- */
    showContextMenu(e, item) {
      const menu = document.getElementById("context-menu");
      const items = [];

      if (item) {
        items.push({ label: "Open", action: () => item.launch() });
        items.push({ sep: true });
        items.push({ label: "Delete Shortcut", action: () => {
          this.items = this.items.filter((i) => i.id !== item.id);
          this.selected.delete(item.id);
          this.refreshIcons();
        }});
      } else {
        items.push({ label: "New Folder", action: () => this.newDesktopFolder() });
        items.push({ label: "New Text File", action: () => this.newDesktopFile() });
        items.push({ sep: true });
        items.push({ label: "Refresh", action: () => this.refreshIcons() });
        items.push({ label: "Change Wallpaper\u2026", action: () => OS.apps.settings.launch() });
        items.push({ sep: true });
        items.push({ label: "Shut Down\u2026", action: () => this.shutdown() });
      }

      menu.innerHTML = "";
      items.forEach((it) => {
        if (it.sep) {
          const s = document.createElement("div");
          s.className = "menu-sep";
          menu.appendChild(s);
        } else {
          const d = document.createElement("div");
          d.className = "menu-item";
          d.textContent = it.label;
          d.addEventListener("click", () => { menu.hidden = true; it.action(); });
          menu.appendChild(d);
        }
      });

      const rect = this.desktopRect();
      const x = Math.min(e.clientX, rect.right - menu.offsetWidth - 4);
      const y = Math.min(e.clientY, rect.bottom - menu.offsetHeight - 4);
      menu.style.left = Math.max(rect.left, x) + "px";
      menu.style.top = Math.max(rect.top, y) + "px";
      menu.hidden = false;
    },

    hideContextMenu() {
      document.getElementById("context-menu").hidden = true;
    },

    newDesktopFolder() {
      OS.prompt("New Folder", "Folder name:", "New Folder").then((name) => {
        if (!name) return;
        const res = OS.fs.mkdir("/C:/Users/Guest/Desktop/" + name);
        if (!res.ok) OS.message("New Folder", res.error, "warn");
      });
    },

    newDesktopFile() {
      OS.prompt("New Text File", "File name:", "New Text Document.txt").then((name) => {
        if (!name) return;
        const p = "/C:/Users/Guest/Desktop/" + name;
        if (OS.fs.exists(p)) {
          OS.message("New Text File", "A file named \u201C" + name + "\u201D already exists.", "warn");
          return;
        }
        OS.fs.write(p, "");
      });
    },

    desktopRect() {
      const d = document.getElementById("desktop");
      return { left: d.offsetLeft, top: d.offsetTop, right: d.offsetLeft + d.clientWidth, bottom: d.offsetTop + d.clientHeight };
    },

    /* ---------- wallpaper ---------- */
    loadWallpaper() {
      try { this.wallpaper = localStorage.getItem("retroos.wallpaper") || "hills"; } catch (e) {}
    },

    setWallpaper(id) {
      this.wallpaper = WALLPAPERS[id] ? id : "hills";
      this.applyWallpaper();
      try { localStorage.setItem("retroos.wallpaper", this.wallpaper); } catch (e) {}
    },

    applyWallpaper() {
      this.wallpaperEl.style.background = WALLPAPERS[this.wallpaper].css;
    },

    /* ---------- power ---------- */
    shutdown() {
      OS.confirm("Shut Down Windows", "Are you sure you want to shut down your computer?").then((ok) => {
        if (!ok) return;
        document.getElementById("desktop").style.display = "none";
        document.getElementById("taskbar").style.display = "none";
        document.getElementById("shutdown-screen").hidden = false;
      });
    },

    restart() {
      location.reload();
    },
  };

  /* Clicking anywhere else closes context menus */
  document.addEventListener("mousedown", (e) => {
    const menu = document.getElementById("context-menu");
    if (menu && !menu.hidden && !menu.contains(e.target)) desktop.hideContextMenu();
  });
  window.addEventListener("blur", () => {
    const menu = document.getElementById("context-menu");
    if (menu) menu.hidden = true;
  });

  window.OS = window.OS || {};
  window.OS.desktop = desktop;
  window.OS.wallpapers = WALLPAPERS;
})();
