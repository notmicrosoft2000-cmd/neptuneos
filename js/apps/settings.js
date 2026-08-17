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
        '    <div class="nav-item" data-page="tablet">Tablet Edition</div>' +
        "  </div>" +
        '  <div class="settings-body"></div>' +
        "</div>";

      const body = win.content.querySelector(".settings-body");
      const nav = win.content.querySelectorAll(".nav-item");

      const showPage = (page) => {
        nav.forEach((n) => n.classList.toggle("sel", n.dataset.page === page));
        if (page === "appearance") renderAppearance();
        else if (page === "tablet") renderTablet();
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
        const user = OS.setup && OS.setup.userName ? OS.setup.userName() : "Guest";
        const computer = OS.setup && OS.setup.computerName ? OS.setup.computerName() : "NEPTUNE-1";
        body.innerHTML =
          "<h3>About " + OS.brand.product + "</h3>" +
          "<p><b>" + OS.brand.product + " Version 5.1." + OS.brand.build + "</b> &mdash; a <b>" + OS.brand.company + "</b> product.<br>" + OS.brand.copyright + ".<br>Desktop operating system shell written in plain HTML, CSS &amp; JavaScript. All files and settings are stored in your browser.</p>" +
          "<p>Registered to: <b>" + user + "</b><br>" +
          "Computer name: <b>" + computer + "</b><br>" +
          "Files on disk: <b>" + OS.fs.listRecursive("/C:").filter((f) => f.type === "file").length + "</b><br>" +
          "Space used: <b>" + size + "</b> bytes</p>" +
          '<label class="settings-check"><input type="checkbox" id="logon-toggle"' +
          (OS.setup && OS.setup.logonEnabled && OS.setup.logonEnabled() ? " checked" : "") +
          '> Require log on at startup</label>' +
          "<h3>Maintenance</h3>" +
          '<button class="btn" id="setup-run">Run NeptuneOS setup wizard</button>' +
          '<button class="btn" id="reset-fs">Reset file system to defaults</button>' +
          '<p style="font-size:11px;color:var(--text-dim);margin-top:8px;">Reset restores the original folders and sample files. Your saved work will be lost.</p>';

        const logonToggle = body.querySelector("#logon-toggle");
        if (logonToggle) {
          logonToggle.addEventListener("change", () => {
            OS.setup.setLogonEnabled(logonToggle.checked);
          });
        }
        body.querySelector("#setup-run").addEventListener("click", () => {
          OS.confirm("Control Panel", "Run the NeptuneOS setup wizard now?").then((ok) => {
            if (ok && OS.setup && OS.setup.launch) OS.setup.launch();
          });
        });
        body.querySelector("#reset-fs").addEventListener("click", () => {
          OS.confirm("Control Panel", "Reset the file system to its defaults? This cannot be undone.").then((ok) => {
            if (!ok) return;
            OS.fs.reset();
            OS.message("Control Panel", "The file system has been reset.", "info");
          });
        });
      }

      showPage("appearance");

      function renderTablet() {
        const isTablet = OS.tablet && OS.tablet.isEnabled();
        body.innerHTML =
          "<h3>NeptuneOS Tablet Edition</h3>" +
          "<p>Tablet Edition transforms the desktop into a touch-friendly interface with:</p>" +
          "<ul style='margin:8px 0 12px 16px;line-height:1.8;'>" +
          "  <li>macOS-style floating dock with app icons</li>" +
          "  <li>Larger touch targets for buttons and menus</li>" +
          "  <li>Taskbar replaced by the dock</li>" +
          "  <li>Bigger desktop icons and window controls</li>" +
          "</ul>" +
          '<label class="settings-check"><input type="checkbox" id="tablet-toggle"' +
          (isTablet ? " checked" : "") +
          "> Enable Tablet Edition</label>" +
          '<div style="margin-top:12px;">' +
          '<button class="btn" id="tablet-dock-toggle">' + (isTablet ? "Hide Dock" : "Show Dock") + "</button>" +
          "</div>" +
          '<p style="font-size:11px;color:var(--text-dim);margin-top:12px;">The dock can be shown independently of Tablet Edition mode.</p>';

        body.querySelector("#tablet-toggle").addEventListener("change", (e) => {
          if (OS.tablet) OS.tablet.setEnabled(e.target.checked);
          const dockBtn = body.querySelector("#tablet-dock-toggle");
          if (dockBtn) dockBtn.textContent = e.target.checked ? "Hide Dock" : "Show Dock";
        });
        body.querySelector("#tablet-dock-toggle").addEventListener("click", () => {
          if (OS.dock) {
            const isHidden = document.querySelector(".dock-wrap") && document.querySelector(".dock-wrap").classList.contains("hidden");
            if (isHidden) OS.dock.show(); else OS.dock.hide();
          }
        });
      }
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
