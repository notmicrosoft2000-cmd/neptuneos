/* =========================================================
 * neptuneOS — My Computer (Explorer)
 * Browse the virtual filesystem with toolbar + sidebar.
 * ========================================================= */
(function () {
  "use strict";

  const ICONS = {
    dir: "assets/icons/folder.svg",
    text: "assets/icons/file-text.svg",
    file: "assets/icons/file.svg",
    drive: "assets/icons/drive.svg",
  };

  const TEXT_EXT = ["txt", "md", "log", "ini", "cfg", "csv", "html", "htm", "xml", "json", "css", "js"];
  const IMG_EXT = ["png", "jpg", "jpeg", "gif", "bmp", "svg"];

  function iconFor(name, type) {
    if (type === "dir") {
      const lower = name.toLowerCase();
      if (lower.includes("recycle")) return "assets/icons/recycle.svg";
      if (lower.includes("windows") || lower.includes("program")) return "assets/icons/folder-sys.svg";
      return ICONS.dir;
    }
    const ext = name.split(".").pop().toLowerCase();
    if (IMG_EXT.includes(ext)) return "assets/icons/file-image.svg";
    if (TEXT_EXT.includes(ext)) return ICONS.text;
    return ICONS.file;
  }

  const app = {
    id: "explorer",
    name: "My Computer",
    icon: "assets/icons/computer.svg",
    group: "apps",

    launch(opts) {
      const startPath = (opts && opts.path) ? OS.fs.normalize(opts.path) : "/C:";

      const win = OS.wm.createWindow({
        title: displayPath(startPath),
        icon: this.icon,
        width: 640,
        height: 420,
        app: "explorer",
      });

      const state = {
        current: startPath,
        back: [],
        forward: [],
        selected: null,
      };

      win.content.innerHTML =
        '<div class="explorer">' +
        '  <div class="explorer-toolbar">' +
        '    <button class="btn" data-act="back" title="Back">\u2190</button>' +
        '    <button class="btn" data-act="forward" title="Forward">\u2192</button>' +
        '    <button class="btn" data-act="up" title="Up one level">\u2191</button>' +
        '    <button class="btn" data-act="newfolder" title="New Folder">New Folder</button>' +
        '    <button class="btn" data-act="newfile" title="New Text File">New Text File</button>' +
        '    <button class="btn" data-act="delete" title="Delete (to Recycle Bin)">Delete</button>' +
        '    <button class="btn" data-act="rename" title="Rename">Rename</button>' +
        "  </div>" +
        '  <div class="explorer-address"><label>Address</label>' +
        '    <input type="text" id="explorer-address" spellcheck="false"></div>' +
        '  <div class="explorer-main">' +
        '    <div class="explorer-side"></div>' +
        '    <div class="explorer-files"></div>' +
        "  </div>" +
        "</div>";

      const filesEl = win.content.querySelector(".explorer-files");
      const sideEl = win.content.querySelector(".explorer-side");
      const addrEl = win.content.querySelector("#explorer-address");

      /* --- toolbar --- */
      win.content.querySelectorAll(".explorer-toolbar .btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          switch (btn.dataset.act) {
            case "back": nav("back"); break;
            case "forward": nav("forward"); break;
            case "up": upOne(); break;
            case "newfolder": newFolder(); break;
            case "newfile": newTextFile(); break;
            case "delete": delSelected(); break;
            case "rename": renameSelected(); break;
          }
        });
      });

      addrEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const p = OS.fs.normalize(toFsPath(addrEl.value));
          if (OS.fs.exists(p) && OS.fs.isDir(p)) goto(p);
          else OS.message("My Computer", "The path \u201C" + addrEl.value + "\u201D cannot be found.", "warn");
        }
      });

      /* --- sidebar --- */
      const places = [
        { name: "Desktop", icon: "assets/icons/desktop.svg", path: "/C:/Users/Guest/Desktop" },
        { name: "My Computer", icon: "assets/icons/computer.svg", path: "/" },
        { name: "Local Disk (C:)", icon: ICONS.drive, path: "/C:" },
        { name: "3\u00bd Floppy (D:)", icon: ICONS.drive, path: "/D:" },
        { name: "Documents", icon: "assets/icons/folder.svg", path: "/C:/Users/Guest/Documents" },
        { name: "Pictures", icon: "assets/icons/folder-image.svg", path: "/C:/Users/Guest/Pictures" },
        { name: "Music", icon: "assets/icons/folder-music.svg", path: "/C:/Users/Guest/Music" },
        { name: "Recycle Bin", icon: "assets/icons/recycle.svg", path: "/C:/Recycle Bin" },
      ];
      places.forEach((p) => {
        const el = document.createElement("div");
        el.className = "side-item";
        el.dataset.path = p.path;
        el.innerHTML = '<img src="' + p.icon + '" alt="">' + OS.esc(p.name);
        el.addEventListener("click", () => goto(p.path));
        sideEl.appendChild(el);
      });

      render();
      refreshSidebar();

      function render() {
        const node = OS.fs.getNode(state.current);
        filesEl.innerHTML = "";
        if (!node) {
          filesEl.innerHTML = '<div class="explorer-empty">This folder is no longer available.</div>';
          return;
        }
        addrEl.value = displayPath(state.current);
        win.setTitle(displayPath(state.current));

        const names = Object.keys(node.children).sort((a, b) => {
          const na = node.children[a], nb = node.children[b];
          if (na.type !== nb.type) return na.type === "dir" ? -1 : 1;
          return a.localeCompare(b);
        });

        if (!names.length) {
          filesEl.innerHTML = '<div class="explorer-empty">This folder is empty.</div>';
          return;
        }

        names.forEach((name) => {
          const child = node.children[name];
          const el = document.createElement("div");
          el.className = "explorer-file";
          el.dataset.name = name;
          el.innerHTML = '<img src="' + iconFor(name, child.type) + '" alt="" draggable="false"><div class="label">' + OS.esc(name) + "</div>";
          filesEl.appendChild(el);

          el.addEventListener("click", (e) => {
            if (e.ctrlKey) {
              el.classList.toggle("selected");
              state.selected = el.classList.contains("selected") ? name : null;
            } else {
              filesEl.querySelectorAll(".explorer-file.selected").forEach((x) => x.classList.remove("selected"));
              el.classList.add("selected");
              state.selected = name;
            }
          });

          el.addEventListener("dblclick", () => {
            if (child.type === "dir") {
              goto(OS.fs.normalize(state.current + "/" + name));
            } else {
              openFile(name, child);
            }
          });

          el.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            filesEl.querySelectorAll(".explorer-file.selected").forEach((x) => x.classList.remove("selected"));
            el.classList.add("selected");
            state.selected = name;
            const path = state.current + "/" + name;
            showFileMenu(e, name, child, {
              open: () => child.type === "dir" ? goto(OS.fs.normalize(path)) : openFile(name, child),
              delete: () => delSelected(),
              rename: () => renameSelected(),
            });
          });
        });
      }

      function nav(dir) {
        const from = dir === "back" ? state.back : state.forward;
        const to = dir === "back" ? state.forward : state.back;
        if (!from.length) return;
        to.push(state.current);
        state.current = from.pop();
        render();
      }

      function upOne() {
        if (state.current === "/") return;
        state.back.push(state.current);
        state.forward = [];
        state.current = OS.fs.joinDir(state.current) || "/";
        render();
      }

      function goto(path) {
        const p = OS.fs.normalize(path);
        if (p === state.current) return;
        state.back.push(state.current);
        state.forward = [];
        state.current = p;
        render();
      }

      function newFolder() {
        OS.prompt("New Folder", "Folder name:", "New Folder").then((name) => {
          if (!name) return;
          const res = OS.fs.mkdir(state.current + "/" + name);
          if (!res.ok) OS.message("My Computer", res.error, "warn");
          else render();
        });
      }

      function newTextFile() {
        OS.prompt("New Text File", "File name:", "New Text Document.txt").then((name) => {
          if (!name) return;
          const p = state.current + "/" + name;
          if (OS.fs.exists(p)) {
            OS.message("My Computer", "A file named \u201C" + name + "\u201D already exists.", "warn");
            return;
          }
          OS.fs.write(p, "");
          render();
        });
      }

      function delSelected() {
        if (!state.selected) return;
        OS.confirm("Delete", "Move \u201C" + state.selected + "\u201D to the Recycle Bin?").then((ok) => {
          if (!ok) return;
          OS.fs.trash(state.current + "/" + state.selected);
          state.selected = null;
          render();
        });
      }

      function renameSelected() {
        if (!state.selected) return;
        OS.prompt("Rename", "New name:", state.selected).then((name) => {
          if (!name || name === state.selected) return;
          const node = OS.fs.getNode(state.current + "/" + state.selected);
          if (!node) return;
          const parent = OS.fs.getNode(state.current);
          if (name in parent.children) {
            OS.message("My Computer", "A file with that name already exists.", "warn");
            return;
          }
          delete parent.children[node.name];
          node.name = name;
          parent.children[name] = node;
          OS.fs.save();
          state.selected = null;
          render();
        });
      }

      function openFile(name, node) {
        const path = state.current + "/" + name;
        const ext = name.split(".").pop().toLowerCase();
        if (IMG_EXT.includes(ext)) {
          pictureViewer(path, name);
        } else if (TEXT_EXT.includes(ext)) {
          OS.apps.notepad.launch({ path });
        } else {
          OS.message("My Computer", "This file has no associated program.", "info");
        }
      }

      function refreshSidebar() {
        const currentDisplay = displayPath(state.current);
        sideEl.querySelectorAll(".side-item").forEach((el) => {
          el.classList.remove("sel");
          const targetPath = el.dataset.path;
          if (targetPath && OS.fs.normalize(targetPath) === state.current) el.classList.add("sel");
        });
        void currentDisplay;
      }

      return win;
    },
  };

  function showFileMenu(e, name, node, actions) {
    const menu = document.getElementById("context-menu");
    menu.innerHTML = "";
    [
      { label: "Open", action: () => actions.open() },
      { label: "Delete", action: () => actions.delete() },
      { label: "Rename", action: () => actions.rename() },
    ].forEach((it) => {
      const d = document.createElement("div");
      d.className = "menu-item";
      d.textContent = it.label;
      d.addEventListener("click", () => { menu.hidden = true; it.action(); });
      menu.appendChild(d);
    });
    const r = document.getElementById("desktop").getBoundingClientRect();
    menu.style.left = Math.min(e.clientX, r.right - menu.offsetWidth - 4) + "px";
    menu.style.top = Math.min(e.clientY, r.bottom - menu.offsetHeight - 4) + "px";
    menu.hidden = false;
  }

  /* ----- helpers ----- */
  function displayPath(p) {
    if (p === "/") return "My Computer";
    let s = p.replace(/^\//, "").replace(/\//g, "\\");
    return s;
  }

  function toFsPath(s) {
    return "/" + s.replace(/\\/g, "/").replace(/^\//, "");
  }

  function pictureViewer(path, name) {
    const node = OS.fs.getNode(path);
    if (!node) return;
    const win = OS.wm.createWindow({
      title: name,
      icon: "assets/icons/file-image.svg",
      width: 520,
      height: 420,
      app: "explorer",
    });
    win.content.innerHTML = '<div class="picview"><img alt="" src=""></div>';
    win.content.querySelector("img").src = node.content || "assets/icons/file-image.svg";
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.explorer = app;
})();
