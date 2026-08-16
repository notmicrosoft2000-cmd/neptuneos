/* =========================================================
 * neptuneOS — Settings (Control Panel)
 * Wallpaper, accent color, system info, file reset.
 * ========================================================= */
(function () {
  "use strict";

  const ACCENTS = ["#000080", "#800000", "#008000", "#800080", "#008080", "#000000", "#4444aa"];

  const app = {
    id: "settings",
    name: "Control Panel",
    icon: "assets/icons/settings.svg",
    group: "system",

    launch() {
      const win = OS.wm.createWindow({
        title: "Control Panel",
        icon: this.icon,
        width: 560,
        height: 420,
        app: "settings",
      });

      win.content.innerHTML =
        '<div class="settings">' +
        '  <div class="settings-nav">' +
        '    <div class="nav-item sel" data-page="appearance">Appearance</div>' +
        '    <div class="nav-item" data-page="system">System</div>' +
        "  </div>" +
        '  <div class="settings-body"></div>' +
        "</div>";

      const body = win.content.querySelector(".settings-body");
      const nav = win.content.querySelectorAll(".nav-item");

      const showPage = (page) => {
        nav.forEach((n) => n.classList.toggle("sel", n.dataset.page === page));
        if (page === "appearance") renderAppearance();
        else renderSystem();
      };

      nav.forEach((n) => n.addEventListener("click", () => showPage(n.dataset.page)));

      function renderAppearance() {
        let html = "<h3>Wallpaper</h3><p>Click a wallpaper to apply it.</p><div style='display:flex;flex-wrap:wrap;gap:10px;'>";
        Object.keys(OS.wallpapers).forEach((id) => {
          const wp = OS.wallpapers[id];
          html += '<div><div class="wallpaper-preview' + (OS.desktop.wallpaper === id ? " sel" : "") + '" data-wp="' + id + '" style="background:' + wp.css + '"></div>' +
            '<div style="text-align:center;font-size:11px;margin-top:3px;">' + OS.esc(wp.name) + "</div></div>";
        });
        html += "</div>";
        html += "<h3 style='margin-top:18px'>Accent color</h3><p>Affects window title bars and selection highlights.</p><div>";
        ACCENTS.forEach((c) => {
          html += '<div class="accent-swatch' + (getAccent() === c ? " sel" : "") + '" data-accent="' + c + '" style="background:' + c + '"></div>';
        });
        html += "</div>";
        body.innerHTML = html;

        body.querySelectorAll("[data-wp]").forEach((el) => {
          el.addEventListener("click", () => {
            OS.desktop.setWallpaper(el.dataset.wp);
            body.querySelectorAll(".wallpaper-preview").forEach((x) => x.classList.remove("sel"));
            el.classList.add("sel");
          });
        });
        body.querySelectorAll("[data-accent]").forEach((el) => {
          el.addEventListener("click", () => {
            setAccent(el.dataset.accent);
            body.querySelectorAll(".accent-swatch").forEach((x) => x.classList.remove("sel"));
            el.classList.add("sel");
          });
        });
      }

      function renderSystem() {
        const size = OS.fs.sizeOf("/C:");
        body.innerHTML =
          "<h3>About neptuneOS</h3>" +
          "<p><b>neptuneOS 1.0</b> &mdash; a <b>Neptune Productions</b> product.<br>Classic Windows-style desktop shell written in plain HTML, CSS &amp; JavaScript.<br>It boots. It beeps. All files and settings are stored in your browser.</p>" +
          "<p>Files on disk: <b>" + OS.fs.listRecursive("/C:").filter((f) => f.type === "file").length + "</b><br>" +
          "Space used: <b>" + size + "</b> bytes</p>" +
          "<h3>Maintenance</h3>" +
          '<button class="btn" id="reset-fs">Reset file system to defaults</button>' +
          '<p style="font-size:11px;color:var(--text-dim);margin-top:8px;">This restores the original folders and sample files. Your saved work will be lost.</p>';

        body.querySelector("#reset-fs").addEventListener("click", () => {
          OS.confirm("Control Panel", "Reset the file system to its defaults? This cannot be undone.").then((ok) => {
            if (!ok) return;
            OS.fs.reset();
            OS.message("Control Panel", "The file system has been reset.", "info");
          });
        });
      }

      showPage("appearance");
    },
  };

  function getAccent() {
    try { return localStorage.getItem("retroos.accent") || ACCENTS[0]; } catch (e) { return ACCENTS[0]; }
  }

  function setAccent(hex) {
    try { localStorage.setItem("retroos.accent", hex); } catch (e) {}
    const root = document.documentElement.style;
    root.setProperty("--accent", hex);
    root.setProperty("--highlight", hex);
    root.setProperty("--title-blue", hex);
  }

  /* apply saved accent on boot */
  (function applySaved() {
    const a = getAccent();
    document.documentElement.style.setProperty("--accent", a);
    document.documentElement.style.setProperty("--highlight", a);
    document.documentElement.style.setProperty("--title-blue", a);
  })();

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.settings = app;
})();
