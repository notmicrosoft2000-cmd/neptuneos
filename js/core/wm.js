/* =========================================================
 * neptuneOS — Window Manager
 * Creates draggable, resizable windows with classic chrome.
 * ========================================================= */
(function () {
  "use strict";

  const WINDOW_MIN_W = 260;
  const WINDOW_MIN_H = 170;

  const wm = {
    zTop: 100,
    windows: [],
    active: null,
    cascadeIndex: 0,

    createWindow(opts) {
      const o = opts || {};
      const layer = document.getElementById("window-layer");
      const el = document.createElement("div");
      el.className = "window" + (o.resizable === false ? "" : " resizable");
      if (o.icon) el.style.setProperty("--win-icon", "url(" + o.icon + ")");

      const cascade = 24;
      this.cascadeIndex = (this.cascadeIndex + cascade) % 96;
      const vw = layer.clientWidth;
      const vh = layer.clientHeight;
      const w = Math.min(o.width || 480, vw - 20);
      const h = Math.min(o.height || 360, vh - 20);
      const x = (o.x !== undefined) ? o.x : Math.max(8, Math.round((vw - w) / 2 - 60 + this.cascadeIndex));
      const y = (o.y !== undefined) ? o.y : Math.max(8, Math.round((vh - h) / 2 - 40 + this.cascadeIndex / 2));

      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = w + "px";
      el.style.height = h + "px";

      el.innerHTML =
        '<div class="window-titlebar">' +
        '  <img class="window-title-icon" src="' + (o.icon || "") + '" alt="">' +
        '  <div class="window-title"></div>' +
        '  <button class="title-btn minimize" title="Minimize"></button>' +
        '  <button class="title-btn maximize" title="Maximize"></button>' +
        '  <button class="title-btn close" title="Close">&times;</button>' +
        "</div>" +
        '<div class="window-content"></div>';

      const contentEl = el.querySelector(".window-content");
      const titleEl = el.querySelector(".window-title");
      const iconEl = el.querySelector(".window-title-icon");
      const titlebar = el.querySelector(".window-titlebar");

      el.querySelector(".close").addEventListener("click", () => win.close());
      el.querySelector(".minimize").addEventListener("click", () => win.minimize());
      el.querySelector(".maximize").addEventListener("click", () => win.toggleMaximize());

      const win = {
        id: "win-" + Math.random().toString(36).slice(2, 9),
        el, content: contentEl, title: o.title || "Untitled",
        minimized: false, maximized: false, restoreRect: null,
        onClose: o.onClose || null, app: o.app || null,

        setTitle(t) { this.title = t; titleEl.textContent = t; OS.taskbar.updateButton(this); },
        setIcon(src) { iconEl.src = src; OS.taskbar.updateButton(this); },

        focus() { wm.focus(this); },

        minimize() {
          this.minimized = true;
          this.el.classList.add("window-minimizing");
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            this.el.classList.remove("window-minimizing");
            this.el.style.display = "none";
          };
          this.el.addEventListener("animationend", finish, { once: true });
          setTimeout(finish, 300);
          if (wm.active === this) wm.active = null;
          OS.taskbar.updateButton(this);
        },

        toggleMaximize() {
          if (this.maximized) this.restore();
          else this.maximize();
        },

        maximize() {
          if (this.maximized) return;
          this.restoreRect = { x: this.el.offsetLeft, y: this.el.offsetTop, w: this.el.offsetWidth, h: this.el.offsetHeight };
          this.el.classList.add("maximized");
          this.el.style.left = "0px";
          this.el.style.top = "0px";
          this.el.style.width = "100%";
          this.el.style.height = "100%";
          this.maximized = true;
          this.focus();
          const btn = this.el.querySelector(".maximize");
          btn.innerHTML = "&#9644;";
          btn.title = "Restore";
        },

        restore() {
          if (!this.maximized) { this.minimized = false; this.el.style.display = "flex"; this.focus(); return; }
          this.el.classList.remove("maximized");
          const r = this.restoreRect || { x: 60, y: 60, w: 480, h: 360 };
          this.el.style.left = r.x + "px";
          this.el.style.top = r.y + "px";
          this.el.style.width = r.w + "px";
          this.el.style.height = r.h + "px";
          this.maximized = false;
          this.restoreRect = null;
          this.el.querySelector(".maximize").innerHTML = "&#9633;";
          this.el.querySelector(".maximize").title = "Maximize";
          this.focus();
        },

        close() {
          if (typeof this.onClose === "function") this.onClose(this);
          if (this.app && OS.apps[this.app] && OS.apps[this.app].onWindowClose) {
            OS.apps[this.app].onWindowClose(this);
          }
          if (OS.sfx && typeof OS.sfx.windowClose === "function") OS.sfx.windowClose();
          el.classList.add("window-closing");
          let cleaned = false;
          const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            el.remove();
            const idx = wm.windows.indexOf(win);
            if (idx !== -1) wm.windows.splice(idx, 1);
            if (wm.active === win) {
              wm.active = null;
              const last = wm.windows[wm.windows.length - 1];
              if (last) last.focus();
            }
            OS.taskbar.removeButton(win);
          };
          el.addEventListener("animationend", cleanup, { once: true });
          setTimeout(cleanup, 200);
        },

        detachContent() { return this.content; },
      };

      titleEl.textContent = win.title;

      layer.appendChild(el);
      wm.windows.push(win);
      OS.taskbar.addButton(win);
      this.focus(win);
      if (OS.sfx && typeof OS.sfx.windowOpen === "function") OS.sfx.windowOpen();

      el.classList.add("window-opening");
      el.addEventListener("animationend", function onOpen() {
        el.classList.remove("window-opening");
        el.removeEventListener("animationend", onOpen);
      });

      this.setupDrag(win, titlebar);
      if (o.resizable !== false) this.setupResize(win);

      if (typeof o.onReady === "function") o.onReady(win);

      return win;
    },

    /* ---- focus / z-order ---- */
    focus(win) {
      this.zTop += 1;
      win.el.style.zIndex = this.zTop;
      win.el.classList.add("active");
      if (this.active && this.active !== win) this.active.el.classList.remove("active");
      this.active = win;
      OS.taskbar.setActive(win.id);
    },

    closeActive() {
      if (this.active) this.active.close();
    },

    /* ---- dragging ---- */
    setupDrag(win, titlebar) {
      let dragging = null;

      const move = (e) => {
        if (!dragging) return;
        const layer = document.getElementById("window-layer");
        let nx = e.clientX - dragging.ox;
        let ny = e.clientY - dragging.oy;
        nx = Math.max(-win.el.offsetWidth + 80, Math.min(nx, layer.clientWidth - 40));
        ny = Math.max(0, Math.min(ny, layer.clientHeight - 30));
        win.el.style.left = nx + "px";
        win.el.style.top = ny + "px";

        /* Window snap hints */
        const snapSide = getSnapSide(e.clientX, e.clientY);
        if (snapSide) showSnapHint(snapSide);
        else hideSnapHint();
      };

      titlebar.addEventListener("mousedown", (e) => {
        if (e.target.closest(".title-btn")) return;
        if (win.maximized) return;
        dragging = { ox: e.clientX - win.el.offsetLeft, oy: e.clientY - win.el.offsetTop };
        win.focus();
        document.body.classList.add("dragging");
        const up = (e2) => {
          /* Apply snap on mouse up */
          const snapSide = getSnapSide(e2.clientX, e2.clientY);
          if (snapSide) applySnap(win, snapSide);
          hideSnapHint();
          dragging = null;
          document.body.classList.remove("dragging");
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      });

      titlebar.addEventListener("dblclick", (e) => {
        if (e.target.closest(".title-btn")) return;
        win.toggleMaximize();
      });
    },

    /* ---- resizing ---- */
    setupResize(win) {
      const dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      dirs.forEach((dir) => {
        const h = document.createElement("div");
        h.className = "resize-handle resize-" + dir;
        h.dataset.dir = dir;
        win.el.appendChild(h);

        h.addEventListener("mousedown", (e) => {
          e.preventDefault();
          win.focus();
          const start = {
            x: e.clientX, y: e.clientY,
            w: win.el.offsetWidth, h: win.el.offsetHeight,
            l: win.el.offsetLeft, t: win.el.offsetTop,
            maxW: document.getElementById("window-layer").clientWidth,
            maxH: document.getElementById("window-layer").clientHeight,
          };
          document.body.classList.add("resizing");

          const move = (e2) => {
            const dx = e2.clientX - start.x;
            const dy = e2.clientY - start.y;
            let { l, t, w, h } = start;
            if (dir.includes("e")) w = Math.max(WINDOW_MIN_W, Math.min(start.w + dx, start.maxW - l));
            if (dir.includes("s")) h = Math.max(WINDOW_MIN_H, Math.min(start.h + dy, start.maxH - t));
            if (dir.includes("w")) {
              w = Math.max(WINDOW_MIN_W, start.w - dx);
              l = start.l + start.w - w;
            }
            if (dir.includes("n")) {
              h = Math.max(WINDOW_MIN_H, start.h - dy);
              t = start.t + start.h - h;
            }
            win.el.style.left = l + "px";
            win.el.style.top = t + "px";
            win.el.style.width = w + "px";
            win.el.style.height = h + "px";
          };
          const up = () => {
            document.body.classList.remove("resizing");
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        });
      });
    },
  };

  /* =========================================================
   * Generic dialogs (message box / prompt / confirm)
   * ========================================================= */
  const DIALOG_ICONS = {
    info: "assets/icons/msg-info.svg",
    warn: "assets/icons/msg-warn.svg",
    error: "assets/icons/msg-error.svg",
    question: "assets/icons/msg-question.svg",
  };

  function dialog({ title, message, icon, buttons, input, html, onClose }) {
    const layer = document.getElementById("dialog-layer");
    layer.hidden = false;
    layer.innerHTML = "";
    const box = document.createElement("div");
    box.className = "dialog outset";
    box.style.minWidth = input ? "360px" : "320px";

    let body = '<div class="dialog-title">' + esc(title || "neptuneOS") + "</div>";
    if (html !== undefined) {
      box.innerHTML = body + html;
    } else {
      body += '<div class="dialog-body" style="display:flex;gap:12px;align-items:flex-start;">';
      if (icon) body += '<img src="' + (DIALOG_ICONS[icon] || "") + '" style="width:30px;height:30px;flex-shrink:0;" alt="">';
      body += '<div style="flex:1;">' + esc(message || "") + "</div></div>";
      if (input !== undefined) {
        body += '<div class="dialog-body" style="margin-top:-6px;"><input type="text" id="dlg-input" value="' + esc(input) + '"></div>';
      }
      body += '<div class="dialog-actions">';
      const btnDefs = buttons || [{ label: "OK", value: null }];
      btnDefs.forEach((b, i) => {
        body += '<button class="btn" data-dlg-value="' + esc(b.value === undefined ? b.label : b.value) + '">' + esc(b.label) + "</button>";
      });
      body += "</div>";
      box.innerHTML = body;
    }
    layer.appendChild(box);

    let result = null;
    const finish = (val) => {
      layer.hidden = true;
      layer.innerHTML = "";
      if (typeof onClose === "function") onClose(val);
    };

    box.querySelectorAll(".dialog-actions .btn, [data-dlg-value]").forEach((b) => {
      b.addEventListener("click", () => {
        result = b.dataset.dlgValue;
        if (input !== undefined) {
          const inp = box.querySelector("#dlg-input");
          result = inp ? inp.value : result;
        }
        finish(result);
      });
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(input !== undefined ? box.querySelector("#dlg-input").value : null);
      if (e.key === "Escape") finish(null);
    });
    const first = box.querySelector("#dlg-input, .dialog-actions .btn, [data-dlg-value]");
    if (first) { first.focus(); if (first.tagName === "INPUT") first.select(); }
  }

  function message(title, text, icon) {
    return new Promise((resolve) => {
      dialog({ title, message: text, icon, buttons: [{ label: "OK", value: true }], onClose: resolve });
    });
  }

  function confirmDlg(title, text) {
    return new Promise((resolve) => {
      dialog({
        title, message: text, icon: "question",
        buttons: [{ label: "Yes", value: true }, { label: "No", value: false }],
        onClose: resolve,
      });
    });
  }

  function promptDlg(title, text, defValue) {
    return new Promise((resolve) => {
      dialog({
        title, message: text, icon: "question", input: defValue === undefined ? "" : defValue,
        buttons: [{ label: "OK", value: "__ok__" }, { label: "Cancel", value: null }],
        onClose: (val) => resolve(val),
      });
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Global keyboard: Alt+F4 closes the focused window, Alt+Tab switches windows */
  const altTabState = { active: false, index: 0, overlay: null };

  function buildAltTabOverlay() {
    if (altTabState.overlay) return altTabState.overlay;
    const ov = document.createElement("div");
    ov.id = "alt-tab-overlay";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:none;" +
      "align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
    ov.innerHTML = '<div id="alt-tab-grid"></div>';
    document.body.appendChild(ov);
    altTabState.overlay = ov;
    return ov;
  }

  function showAltTab() {
    const visible = wm.windows.filter((w) => w.el.style.display !== "none");
    if (visible.length < 2) return;
    altTabState.active = true;
    altTabState.index = (wm.windows.indexOf(wm.active) + 1) % wm.windows.length;
    const ov = buildAltTabOverlay();
    const grid = ov.querySelector("#alt-tab-grid");
    grid.innerHTML = "";
    grid.style.cssText =
      "display:flex;flex-wrap:wrap;gap:8px;padding:16px;max-width:80vw;justify-content:center;";
    wm.windows.forEach((w, i) => {
      const card = document.createElement("div");
      card.style.cssText =
        "width:180px;height:120px;background:#ece9d8;border:2px solid " + (i === altTabState.index ? "#316ac5" : "#808080") +
        ";border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "cursor:pointer;transition:border-color 0.1s,transform 0.1s;font-size:11px;text-align:center;padding:8px;" +
        (i === altTabState.index ? "transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.4);" : "");
      const iconSrc = w.el.querySelector(".window-title-icon")?.src || "";
      if (iconSrc) {
        card.innerHTML += '<img src="' + iconSrc + '" style="width:28px;height:28px;margin-bottom:6px;" alt="">';
      }
      card.innerHTML += '<div style="font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">' +
        OS.esc(w.title) + '</div>';
      card.addEventListener("click", () => {
        w.restore();
        w.focus();
        hideAltTab();
      });
      grid.appendChild(card);
    });
    ov.style.display = "flex";
  }

  function hideAltTab() {
    altTabState.active = false;
    if (altTabState.overlay) altTabState.overlay.style.display = "none";
  }

  function cycleAltTab(reverse) {
    if (!altTabState.active) return;
    const len = wm.windows.length;
    altTabState.index = (altTabState.index + (reverse ? -1 : 1) + len) % len;
    const grid = altTabState.overlay.querySelector("#alt-tab-grid");
    const cards = grid.children;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const isActive = i === altTabState.index;
      c.style.borderColor = isActive ? "#316ac5" : "#808080";
      c.style.transform = isActive ? "scale(1.05)" : "scale(1)";
      c.style.boxShadow = isActive ? "0 4px 12px rgba(0,0,0,0.4)" : "none";
    }
  }

  /* Window Snap */
  const SNAP_THRESHOLD = 20;
  let snapOverlay = null;
  let dragState = null;

  function getSnapOverlay() {
    if (!snapOverlay) {
      snapOverlay = document.createElement("div");
      snapOverlay.id = "snap-overlay";
      snapOverlay.style.cssText =
        "position:fixed;z-index:950;border:3px solid #316ac5;background:rgba(49,106,197,0.2);" +
        "border-radius:8px;display:none;pointer-events:none;transition:all 0.15s ease-out;";
      document.body.appendChild(snapOverlay);
    }
    return snapOverlay;
  }

  function showSnapHint(side) {
    const ov = getSnapOverlay();
    const vw = window.innerWidth, vh = window.innerHeight - 30;
    let x, y, w, h;
    if (side === "left") { x = 0; y = 0; w = vw / 2; h = vh; }
    else if (side === "right") { x = vw / 2; y = 0; w = vw / 2; h = vh; }
    else if (side === "top") { x = 0; y = 0; w = vw; h = vh; }
    else { hideSnapHint(); return; }
    ov.style.left = x + "px";
    ov.style.top = y + "px";
    ov.style.width = w + "px";
    ov.style.height = h + "px";
    ov.style.display = "block";
  }

  function hideSnapHint() {
    if (snapOverlay) snapOverlay.style.display = "none";
  }

  function getSnapSide(clientX, clientY) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (clientX <= SNAP_THRESHOLD) return "left";
    if (clientX >= vw - SNAP_THRESHOLD) return "right";
    if (clientY <= SNAP_THRESHOLD) return "top";
    return null;
  }

  function applySnap(win, side) {
    const vw = window.innerWidth, vh = window.innerHeight - 30;
    if (!win.restoreRect) {
      win.restoreRect = { x: win.el.offsetLeft, y: win.el.offsetTop, w: win.el.offsetWidth, h: win.el.offsetHeight };
    }
    win.el.classList.add("no-transition");
    if (side === "left") {
      win.el.style.left = "0px"; win.el.style.top = "0px";
      win.el.style.width = "50%"; win.el.style.height = vh + "px";
    } else if (side === "right") {
      win.el.style.left = "50%"; win.el.style.top = "0px";
      win.el.style.width = "50%"; win.el.style.height = vh + "px";
    } else if (side === "top") {
      win.maximize();
      hideSnapHint();
      return;
    }
    win.maximized = false;
    win.el.classList.remove("no-transition");
    win.focus();
  }

  window.addEventListener("keydown", (e) => {
    /* Alt+F4 */
    if (e.altKey && e.key === "F4") {
      e.preventDefault();
      if (document.activeElement && document.activeElement.tagName === "INPUT") {
        document.activeElement.blur();
      }
      wm.closeActive();
    }
    /* Alt+Tab / Alt+Shift+Tab */
    if (e.altKey && e.key === "Tab") {
      e.preventDefault();
      if (!altTabState.active) {
        showAltTab();
      } else {
        cycleAltTab(e.shiftKey);
      }
    }
    /* Escape to close Alt+Tab */
    if (e.key === "Escape" && altTabState.active) {
      e.preventDefault();
      hideAltTab();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "Alt" && altTabState.active) {
      const idx = altTabState.index;
      hideAltTab();
      const target = wm.windows[idx];
      if (target) {
        target.restore();
        target.focus();
      }
    }
  });

  /* Prevent Alt key from getting stuck */
  window.addEventListener("blur", () => {
    if (altTabState.active) hideAltTab();
  });

  window.OS = window.OS || {};
  window.OS.wm = wm;
  window.OS.dialog = dialog;
  window.OS.message = message;
  window.OS.confirm = confirmDlg;
  window.OS.prompt = promptDlg;
  window.OS.esc = esc;

  /* Restore saved appearance settings */
  (function restoreSettings() {
    var root = document.documentElement.style;
    var animSpeed = localStorage.getItem("neptuneos.anim.speed");
    if (animSpeed) {
      var speeds = { fast: "0.15s", normal: "0.25s", slow: "0.5s", off: "0s" };
      root.setProperty("--anim-speed", speeds[animSpeed] || "0.25s");
    }
    var noShadows = localStorage.getItem("neptuneos.window.shadows") === "off";
    if (noShadows) root.setProperty("--window-shadow", "none");
    var taskbarOp = localStorage.getItem("neptuneos.taskbar.opacity");
    if (taskbarOp) {
      var tb = document.getElementById("taskbar");
      if (tb) tb.style.opacity = taskbarOp / 100;
    }
    var iconLabels = localStorage.getItem("neptuneos.icon.labels");
    if (iconLabels === "off") {
      document.querySelectorAll(".desktop-icon .label").forEach(function (l) { l.style.display = "none"; });
    }
  })();

  /* Branded "About" box used by apps (Help menus etc.) */
  window.OS.about = function (appName, icon) {
    const b = OS.brand || { product: "NeptuneOS", version: "1.0", build: "2600", copyright: "", company: "Neptune Productions" };
    const html =
      '<div class="about-box">' +
      '<img src="' + esc(icon || "assets/icons/neptuneos.svg") + '" alt="">' +
      '<div class="about-info">' +
      "<b>" + esc(b.product) + " Version 5.1." + esc(b.build) + "</b>" +
      "<div>" + esc(appName) + "</div>" +
      "<div>" + esc(b.copyright) + ".</div>" +
      "<div>" + esc(b.company) + "</div>" +
      '<div class="about-detail">Desktop operating system shell. Written in plain HTML, CSS and JavaScript.</div>' +
      "</div>" +
      "</div>" +
      '<div class="dialog-actions"><button class="btn" data-dlg-value="ok">OK</button></div>';
    return new Promise((resolve) => {
      dialog({ title: b.product, html, onClose: resolve });
    });
  };
})();
