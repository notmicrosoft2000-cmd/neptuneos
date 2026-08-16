/* =========================================================
 * neptuneOS — Recycle Bin
 * Restore or permanently delete trashed items.
 * ========================================================= */
(function () {
  "use strict";

  const BIN = "/C:/Recycle Bin";

  const app = {
    id: "recycle",
    name: "Recycle Bin",
    icon: "assets/icons/recycle.svg",
    group: "system",

    launch() {
      const win = OS.wm.createWindow({
        title: "Recycle Bin",
        icon: this.icon,
        width: 460,
        height: 340,
        app: "recycle",
      });

      win.content.innerHTML =
        '<div class="recycle">' +
        '  <div class="recycle-toolbar">' +
        '    <button class="btn" data-act="restore">Restore</button>' +
        '    <button class="btn" data-act="empty">Empty Recycle Bin</button>' +
        "  </div>" +
        '  <div class="recycle-list"></div>' +
        "</div>";

      const listEl = win.content.querySelector(".recycle-list");
      let selected = null;

      const render = () => {
        const bin = OS.fs.getNode(BIN);
        listEl.innerHTML = "";
        if (!bin || !Object.keys(bin.children).length) {
          listEl.innerHTML = '<div class="explorer-empty">The Recycle Bin is empty.</div>';
          return;
        }
        Object.keys(bin.children).forEach((name) => {
          const node = bin.children[name];
          const el = document.createElement("div");
          el.className = "recycle-file";
          el.innerHTML = '<img src="' + (node.type === "dir" ? "assets/icons/folder.svg" : "assets/icons/file-text.svg") + '" alt="">' +
            OS.esc(name) + '<span style="margin-left:auto;color:var(--text-dim);font-size:11px;">' + OS.esc(node.origPath || "?") + "</span>";
          el.addEventListener("click", () => {
            listEl.querySelectorAll(".recycle-file.selected").forEach((x) => x.classList.remove("selected"));
            el.classList.add("selected");
            selected = name;
          });
          el.addEventListener("dblclick", () => restore(name));
          listEl.appendChild(el);
        });
      };

      const restore = (name) => {
        const bin = OS.fs.getNode(BIN);
        const node = bin.children[name];
        if (!node) return;
        const dest = node.origPath ? OS.fs.joinDir(node.origPath) : "/C:/Users/Guest/Documents";
        const res = OS.fs.move(BIN + "/" + name, dest);
        if (!res.ok) {
          OS.message("Recycle Bin", res.error, "warn");
          return;
        }
        const moved = OS.fs.getNode(dest + "/" + name);
        if (moved && node.origPath) moved.origPath = null;
        selected = null;
        render();
      };

      win.content.querySelector('[data-act="restore"]').addEventListener("click", () => {
        if (!selected) { OS.message("Recycle Bin", "Select an item to restore.", "info"); return; }
        restore(selected);
      });

      win.content.querySelector('[data-act="empty"]').addEventListener("click", () => {
        const bin = OS.fs.getNode(BIN);
        if (!bin || !Object.keys(bin.children).length) return;
        OS.confirm("Recycle Bin", "Permanently delete all " + Object.keys(bin.children).length + " item(s) in the Recycle Bin?").then((ok) => {
          if (!ok) return;
          Object.keys(bin.children).forEach((k) => delete bin.children[k]);
          OS.fs.save();
          selected = null;
          render();
        });
      });

      render();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.recycle = app;
})();
