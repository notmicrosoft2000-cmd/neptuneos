/* =========================================================
 * neptuneOS — Notepad
 * ========================================================= */
(function () {
  "use strict";

  let win = null;
  let area = null;
  let status = null;
  let currentPath = null;
  let dirty = false;

  const app = {
    id: "notepad",
    name: "Notepad",
    icon: "assets/icons/notepad.svg",
    group: "apps",

    launch(opts) {
      if (win && !win.el.isConnected) win = null;
      if (win) { win.restore(); win.focus(); return win; }

      const openPath = (opts && opts.path) || null;

      win = OS.wm.createWindow({
        title: "Untitled - Notepad",
        icon: this.icon,
        width: 520,
        height: 400,
        app: "notepad",
        onClose: () => { win = null; },
        onReady: () => {
          if (openPath) loadFile(openPath);
        },
      });

      win.content.innerHTML =
        '<div class="app-menubar">' +
        '<div class="menu-label" data-menu="file">File</div>' +
        '<div class="menu-label" data-menu="edit">Edit</div>' +
        '<div class="menu-label" data-menu="help">Help</div>' +
        "</div>" +
        '<textarea class="notepad-area" spellcheck="false"></textarea>' +
        '<div class="app-statusbar"><span id="np-pos">Ln 1, Col 1</span><span id="np-chars">0 chars</span></div>';

      area = win.content.querySelector(".notepad-area");
      status = win.content.querySelectorAll(".app-statusbar span");

      setupMenus(win);
      setupStatusbar();

      if (openPath) loadFile(openPath);
    },
  };

  function closeMenus() {
    if (!win || !win.el.isConnected) return;
    win.content.querySelectorAll(".window-menu").forEach((m) => {
      m.style.display = "none";
      m.dataset.open = "0";
    });
    win.content.querySelectorAll(".menu-label").forEach((l) => l.classList.remove("open"));
  }

  function setupMenus() {
    win.content.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });

    window.addEventListener("mousedown", (e) => {
      if (win && win.el.isConnected && !e.target.closest(".app-menubar") && !e.target.closest(".window-menu")) closeMenus();
    });

    buildMenu("file", [
      { label: "New", action: () => { newFile(); closeMenus(); } },
      { label: "Open\u2026", action: () => { openFile(); closeMenus(); } },
      { label: "Save", action: () => { saveFile(); closeMenus(); } },
      { label: "Save As\u2026", action: () => { saveFileAs(); closeMenus(); } },
      { sep: true },
      { label: "Download\u2026", action: () => { downloadFile(); closeMenus(); } },
      { sep: true },
      { label: "Exit", action: () => { closeMenus(); win.close(); } },
    ]);

    buildMenu("edit", [
      { label: "Undo", action: () => { area.focus(); document.execCommand("undo"); closeMenus(); } },
      { sep: true },
      { label: "Cut", action: () => { area.focus(); document.execCommand("cut"); closeMenus(); } },
      { label: "Copy", action: () => { area.focus(); document.execCommand("copy"); closeMenus(); } },
      { label: "Paste", action: () => { area.focus(); document.execCommand("paste"); closeMenus(); } },
      { label: "Delete", action: () => { area.focus(); document.execCommand("delete"); closeMenus(); } },
      { sep: true },
      { label: "Select All", action: () => { area.focus(); area.select(); closeMenus(); } },
    ]);

    buildMenu("help", [
      { label: "About Notepad", action: () => { OS.about("Notepad", app.icon); closeMenus(); } },
    ]);
  }

  function buildMenu(name, items) {
    const label = win.content.querySelector('[data-menu="' + name + '"]');
    const menuEl = document.createElement("div");
    menuEl.className = "window-menu";
    menuEl.style.cssText =
      "position:absolute;z-index:500;background:var(--menu);border:2px solid;border-color:var(--face-light) var(--face-darker) var(--face-darker) var(--face-light);" +
      "box-shadow:2px 2px 0 rgba(0,0,0,0.35);min-width:150px;padding:2px;display:none;";
    menuEl.dataset.menu = name;

    items.forEach((it) => {
      if (it.sep) {
        const s = document.createElement("div");
        s.style.cssText = "border-top:1px solid var(--face-dark);margin:3px 2px;";
        menuEl.appendChild(s);
      } else {
        const d = document.createElement("div");
        d.textContent = it.label;
        d.style.cssText = "padding:4px 10px;cursor:default;font-size:13px;";
        d.addEventListener("mouseenter", () => (d.style.background = "var(--highlight)", d.style.color = "#fff"));
        d.addEventListener("mouseleave", () => (d.style.background = "", d.style.color = ""));
        d.addEventListener("click", it.action);
        menuEl.appendChild(d);
      }
    });

    win.content.appendChild(menuEl);

    label.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = menuEl.dataset.open === "1";
      closeMenus();
      if (!wasOpen) {
        menuEl.dataset.open = "1";
        menuEl.style.display = "block";
        const r = label.getBoundingClientRect();
        const cr = win.content.getBoundingClientRect();
        menuEl.style.left = (r.left - cr.left) + "px";
        menuEl.style.top = (r.bottom - cr.top) + "px";
        label.classList.add("open");
      }
    });
  }

  function setupStatusbar() {
    const update = () => {
      const before = area.value.slice(0, area.selectionStart);
      const lines = before.split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      status[0].textContent = "Ln " + line + ", Col " + col;
      status[1].textContent = area.value.length + " chars";
    };
    area.addEventListener("keyup", update);
    area.addEventListener("click", update);
    area.addEventListener("input", () => { dirty = true; update(); });
  }

  function setTitle() {
    const name = currentPath ? currentPath.split("/").pop() : "Untitled";
    win.setTitle((dirty ? "*" : "") + name + " - Notepad");
  }

  function newFile() {
    if (dirty) {
      OS.confirm("Notepad", "Save changes to " + (currentPath || "Untitled") + "?").then((ok) => {
        if (ok) {
          saveFile().then((saved) => {
            if (saved) doNew();
          });
        } else doNew();
      });
    } else doNew();
  }

  function doNew() {
    currentPath = null;
    dirty = false;
    area.value = "";
    setTitle();
  }

  function openFile() {
    const def = "/C:/Users/Guest/Documents/readme.txt";
    OS.prompt("Open", "Path to text file:", currentPath || def).then((p) => {
      if (!p) return;
      const content = OS.fs.read(p);
      if (content === null) {
        OS.message("Notepad", "Cannot open \u201C" + p + "\u201D. The file does not exist.", "error");
        return;
      }
      loadFile(p);
    });
  }

  function loadFile(path) {
    const content = OS.fs.read(path);
    if (content !== null) {
      currentPath = path;
      area.value = content;
      dirty = false;
      setTitle();
    }
  }

  function saveFile() {
    if (!currentPath) return saveFileAs();
    const res = OS.fs.write(currentPath, area.value);
    if (res.ok) { dirty = false; setTitle(); return Promise.resolve(true); }
    return Promise.resolve(false);
  }

  function saveFileAs() {
    return OS.prompt("Save As", "Path:", currentPath || "/C:/Users/Guest/Documents/note.txt").then((p) => {
      if (!p) return false;
      const res = OS.fs.write(p, area.value);
      if (!res.ok) {
        OS.message("Notepad", res.error, "error");
        return false;
      }
      currentPath = p;
      dirty = false;
      setTitle();
      return true;
    });
  }

  function downloadFile() {
    const name = currentPath ? currentPath.split("/").pop() : "note.txt";
    OS.prompt("Download", "Save as:", name).then((fname) => {
      if (!fname) return;
      const blob = new Blob([area.value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.notepad = app;
})();
