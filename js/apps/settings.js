/* =========================================================
 * neptuneOS — Settings (Control Panel)
 * Appearance, System, Tablet Edition, Display, Sound, Network, Add/Remove Programs.
 * ========================================================= */
(function () {
  "use strict";

  const ACCENTS = ["#000080", "#800000", "#008000", "#800080", "#008080", "#000000", "#4444aa", "#c0392b", "#e67e22", "#2ecc71", "#9b59b6", "#1abc9c"];

  const BLOATWARE_APPS = [
    { name: "Neptune Notes", size: "6 KB", desc: "Quick note-taking app" },
    { name: "Neptune Weather", size: "4 KB", desc: "Local weather (permanently 72°F)" },
    { name: "Neptune Maps", size: "8 KB", desc: "Turn-by-turn directions to nowhere" },
    { name: "Neptune Calculator Pro", size: "12 KB", desc: "It adds. That's it." },
  ];

  const app = {
    id: "settings",
    name: "Control Panel",
    icon: "assets/icons/settings.svg",
    group: "system",

    launch() {
      const win = OS.wm.createWindow({
        title: "Control Panel",
        icon: this.icon,
        width: 600,
        height: 440,
        app: "settings",
      });

      win.content.innerHTML =
        '<div class="settings">' +
        '  <div class="settings-nav">' +
        '    <div class="nav-item sel" data-page="appearance">Appearance</div>' +
        '    <div class="nav-item" data-page="display">Display</div>' +
        '    <div class="nav-item" data-page="sound">Sound</div>' +
        '    <div class="nav-item" data-page="network">Network</div>' +
        '    <div class="nav-item" data-page="addremove">Add/Remove Programs</div>' +
        '    <div class="nav-item" data-page="tablet">Tablet Edition</div>' +
        '    <div class="nav-item" data-page="bloat">Bundled Apps</div>' +
        '    <div class="nav-item" data-page="system">System</div>' +
        "  </div>" +
        '  <div class="settings-body"></div>' +
        "</div>";

      const body = win.content.querySelector(".settings-body");
      const nav = win.content.querySelectorAll(".nav-item");

      const showPage = (page) => {
        nav.forEach((n) => n.classList.toggle("sel", n.dataset.page === page));
        const renderer = {
          appearance: renderAppearance,
          display: renderDisplay,
          sound: renderSound,
          network: renderNetwork,
          addremove: renderAddRemove,
          tablet: renderTablet,
          bloat: renderBloat,
          system: renderSystem,
        };
        if (renderer[page]) renderer[page]();
      };

      nav.forEach((n) => n.addEventListener("click", () => showPage(n.dataset.page)));

      function renderAppearance() {
        const taskbarOp = localStorage.getItem("neptuneos.taskbar.opacity") || "95";
        const cursorSize = localStorage.getItem("neptuneos.cursor.size") || "normal";
        const animSpeed = localStorage.getItem("neptuneos.anim.speed") || "normal";

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
        html += "<h3 style='margin-top:18px'>Taskbar</h3>";
        html += '<div class="settings-row"><label>Opacity</label>' +
          '<input type="range" id="taskbar-opacity" min="50" max="100" value="' + taskbarOp + '" style="width:160px;">' +
          '<span id="taskbar-opacity-val">' + taskbarOp + "%</span></div>";
        html += "<h3 style='margin-top:18px'>Cursor</h3>";
        html += '<div class="settings-row"><label>Size</label>' +
          '<select class="settings-select" id="cursor-size-sel">' +
          '<option value="small"' + (cursorSize === "small" ? " selected" : "") + ">Small</option>" +
          '<option value="normal"' + (cursorSize === "normal" ? " selected" : "") + ">Normal</option>" +
          '<option value="large"' + (cursorSize === "large" ? " selected" : "") + ">Large</option>" +
          '</select></div>';
        html += "<h3 style='margin-top:18px'>Animations</h3>";
        html += '<div class="settings-row"><label>Speed</label>' +
          '<select class="settings-select" id="anim-speed-sel">' +
          '<option value="fast"' + (animSpeed === "fast" ? " selected" : "") + ">Fast</option>" +
          '<option value="normal"' + (animSpeed === "normal" ? " selected" : "") + ">Normal</option>" +
          '<option value="slow"' + (animSpeed === "slow" ? " selected" : "") + ">Slow</option>" +
          '<option value="off"' + (animSpeed === "off" ? " selected" : "") + ">Off</option>" +
          '</select></div>';
        html += '<div class="settings-row"><label>Window animations</label>' +
          '<label class="settings-check"><input type="checkbox" id="anim-toggle" ' +
          (localStorage.getItem("neptuneos.animations") !== "off" ? "checked" : "") +
          '> Enable window open/close animations</label></div>';
        html += '<div class="settings-row"><label>Desktop icon labels</label>' +
          '<label class="settings-check"><input type="checkbox" id="icon-labels-toggle" ' +
          (localStorage.getItem("neptuneos.icon.labels") !== "off" ? "checked" : "") +
          '> Show icon labels on desktop</label></div>';
        html += '<div class="settings-row"><label>Window shadows</label>' +
          '<label class="settings-check"><input type="checkbox" id="shadow-toggle" ' +
          (localStorage.getItem("neptuneos.window.shadows") !== "off" ? "checked" : "") +
          '> Enable window drop shadows</label></div>';
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
        body.querySelector("#anim-toggle").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.animations", e.target.checked ? "on" : "off");
        });
        body.querySelector("#taskbar-opacity").addEventListener("input", (e) => {
          var v = e.target.value;
          body.querySelector("#taskbar-opacity-val").textContent = v + "%";
          localStorage.setItem("neptuneos.taskbar.opacity", v);
          var tb = document.getElementById("taskbar");
          if (tb) tb.style.opacity = v / 100;
        });
        body.querySelector("#cursor-size-sel").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.cursor.size", e.target.value);
          var sizes = { small: 0.8, normal: 1, large: 1.3 };
          var vc = document.getElementById("virtual-cursor");
          if (vc) vc.style.transform = "scale(" + (sizes[e.target.value] || 1) + ")";
        });
        body.querySelector("#anim-speed-sel").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.anim.speed", e.target.value);
          var speeds = { fast: "0.15s", normal: "0.25s", slow: "0.5s", off: "0s" };
          document.documentElement.style.setProperty("--anim-speed", speeds[e.target.value] || "0.25s");
        });
        body.querySelector("#icon-labels-toggle").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.icon.labels", e.target.checked ? "on" : "off");
          document.querySelectorAll(".desktop-icon .label").forEach(function (l) {
            l.style.display = e.target.checked ? "" : "none";
          });
        });
        body.querySelector("#shadow-toggle").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.window.shadows", e.target.checked ? "on" : "off");
          document.documentElement.style.setProperty("--window-shadow", e.target.checked ? "0 4px 12px rgba(0,0,0,0.35)" : "none");
        });
      }

      function renderDisplay() {
        const res = localStorage.getItem("neptuneos.display.resolution") || "auto";
        const scale = localStorage.getItem("neptuneos.display.scale") || "100";
        const freshHz = localStorage.getItem("neptuneos.display.refresh") || "60";
        body.innerHTML =
          "<h3>Display Settings</h3>" +
          "<p>Adjust resolution, scaling, and refresh rate.</p>" +
          '<div class="settings-group">' +
          '<div class="settings-row"><label>Resolution</label>' +
          '<select class="settings-select" id="res-sel">' +
          '<option value="auto"' + (res === "auto" ? " selected" : "") + ">Auto (recommended)</option>" +
          '<option value="1024x768"' + (res === "1024x768" ? " selected" : "") + ">1024 x 768</option>" +
          '<option value="1280x720"' + (res === "1280x720" ? " selected" : "") + ">1280 x 720</option>" +
          '<option value="1920x1080"' + (res === "1920x1080" ? " selected" : "") + ">1920 x 1080</option>" +
          '</select></div>' +
          '<div class="settings-row"><label>Scaling</label>' +
          '<select class="settings-select" id="scale-sel">' +
          '<option value="100"' + (scale === "100" ? " selected" : "") + ">100%</option>" +
          '<option value="125"' + (scale === "125" ? " selected" : "") + ">125%</option>" +
          '<option value="150"' + (scale === "150" ? " selected" : "") + ">150%</option>" +
          '</select></div>' +
          '<div class="settings-row"><label>Refresh Rate</label>' +
          '<select class="settings-select" id="hz-sel">' +
          '<option value="60"' + (freshHz === "60" ? " selected" : "") + ">60 Hz</option>" +
          '<option value="144"' + (freshHz === "144" ? " selected" : "") + ">144 Hz (probably lying)</option>" +
          '</select></div>' +
          '<div class="settings-row"><label>Color depth</label><span style="color:var(--text-dim)">32-bit True Color (always)</span></div>' +
          "</div>" +
          '<p style="font-size:11px;color:var(--text-dim);margin-top:12px;">Note: NeptuneOS renders at your browser\'s native resolution. These settings affect scaling and internal dimensions only.</p>';

        body.querySelector("#res-sel").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.display.resolution", e.target.value);
        });
        body.querySelector("#scale-sel").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.display.scale", e.target.value);
          document.documentElement.style.zoom = e.target.value === "100" ? "" : (parseInt(e.target.value) / 100).toString();
        });
        body.querySelector("#hz-sel").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.display.refresh", e.target.value);
        });
      }

      function renderSound() {
        const vol = parseInt(localStorage.getItem("neptuneos.sound.volume") || "75");
        const muted = localStorage.getItem("neptuneos.sound.muted") === "true";
        const sfxEnabled = localStorage.getItem("neptuneos.sound.sfx") !== "off";
        body.innerHTML =
          "<h3>Sound Settings</h3>" +
          '<div class="settings-group">' +
          '<div class="settings-row"><label>Master Volume</label>' +
          '<input type="range" id="vol-slider" min="0" max="100" value="' + vol + '" style="width:200px;">' +
          '<span id="vol-val">' + vol + "%</span></div>" +
          '<div class="settings-row"><label>Mute</label>' +
          '<label class="settings-check"><input type="checkbox" id="mute-toggle"' + (muted ? " checked" : "") + "> Mute all sounds</label></div>" +
          '<div class="settings-row"><label>Sound Effects</label>' +
          '<label class="settings-check"><input type="checkbox" id="sfx-toggle"' + (sfxEnabled ? "" : " checked") + "> Disable system sound effects</label></div>" +
          "</div>" +
          "<h3 style='margin-top:16px'>Sound Scheme</h3>" +
          '<div class="settings-row"><label>Current scheme</label><span style="color:var(--text-dim)">NeptuneOS Default</span></div>' +
          '<button class="btn" id="test-sound" style="margin-top:8px;">Test Sound</button>' +
          '<p style="font-size:11px;color:var(--text-dim);margin-top:12px;">NeptuneOS uses the Web Audio API for all sounds. Volume is shared with your browser.</p>';

        body.querySelector("#vol-slider").addEventListener("input", (e) => {
          const v = e.target.value;
          body.querySelector("#vol-val").textContent = v + "%";
          localStorage.setItem("neptuneos.sound.volume", v);
          if (OS.sfx && OS.sfx.setVolume) OS.sfx.setVolume(parseInt(v));
        });
        body.querySelector("#mute-toggle").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.sound.muted", e.target.checked);
          if (OS.sfx) OS.sfx.setMuted(e.target.checked);
        });
        body.querySelector("#sfx-toggle").addEventListener("change", (e) => {
          localStorage.setItem("neptuneos.sound.sfx", e.target.checked ? "off" : "on");
        });
        body.querySelector("#test-sound").addEventListener("click", () => {
          if (OS.sfx && OS.sfx.play) OS.sfx.play("click");
        });
      }

      function renderNetwork() {
        const hostname = localStorage.getItem("neptuneos.network.hostname") || "NEPTUNE-1";
        const workgroup = localStorage.getItem("neptuneos.network.workgroup") || "NEPTUNE";
        body.innerHTML =
          "<h3>Network Connections</h3>" +
          '<div class="settings-group">' +
          '<div class="settings-row"><label>Status</label><span class="settings-ok">Connected</span></div>' +
          '<div class="settings-row"><label>Connection type</label><span style="color:var(--text-dim)">Virtual Ethernet (Browser API)</span></div>' +
          '<div class="settings-row"><label>Speed</label><span style="color:var(--text-dim)">∞ Mbps (local only)</span></div>' +
          "</div>" +
          "<h3 style='margin-top:16px'>Identification</h3>" +
          '<div class="settings-row"><label>Computer name</label>' +
          '<input type="text" class="settings-input" id="hostname-input" value="' + OS.esc(hostname) + '" style="width:180px;"></div>' +
          '<div class="settings-row"><label>Workgroup</label>' +
          '<input type="text" class="settings-input" id="workgroup-input" value="' + OS.esc(workgroup) + '" style="width:180px;"></div>' +
          '<button class="btn" id="net-apply" style="margin-top:8px;">Apply</button>' +
          "<h3 style='margin-top:16px'>Firewall</h3>" +
          '<div class="settings-row"><label>Firewall</label><span class="settings-ok">Enabled (blocking nothing, since this is fake)</span></div>' +
          "<h3 style='margin-top:16px'>Network Discovery</h3>" +
          '<div class="settings-row"><label>Discover other computers</label>' +
          '<label class="settings-check"><input type="checkbox" checked disabled> Always on (there are no other computers)</label></div>';

        body.querySelector("#net-apply").addEventListener("click", () => {
          const h = body.querySelector("#hostname-input").value.trim() || "NEPTUNE-1";
          const w = body.querySelector("#workgroup-input").value.trim() || "MICROSLOP";
          localStorage.setItem("neptuneos.network.hostname", h);
          localStorage.setItem("neptuneos.network.workgroup", w);
          OS.message("Network", "Network settings applied. Nothing actually changed.", "info");
        });
      }

      function renderAddRemove() {
        let html = "<h3>Add or Remove Programs</h3>" +
          '<div class="settings-row"><label>Currently installed programs:</label></div>' +
          '<div class="settings-prog-list" id="prog-list">';
        const coreApps = [
          { name: "NeptuneOS", size: "∞", desc: "Your operating system (you can't remove this)" },
          { name: "Terminal", size: "42 KB", desc: "Command line interface" },
          { name: "Notepad", size: "18 KB", desc: "Text editor" },
          { name: "Calculator", size: "24 KB", desc: "Arithmetic device" },
          { name: "Paint", size: "56 KB", desc: "Drawing program" },
          { name: "Media Player", size: "34 KB", desc: "Music and visualization" },
          { name: "File Explorer", size: "78 KB", desc: "Browse the virtual file system" },
          { name: "Browser", size: "12 KB", desc: "Web browser with CORS proxy" },
          { name: "Snake", size: "8 KB", desc: "Classic snake game" },
          { name: "Pacman", size: "11 KB", desc: "Pac-Man clone" },
          { name: "Solitaire", size: "14 KB", desc: "Klondike solitaire" },
          { name: "Minesweeper", size: "9 KB", desc: "Classic minesweeper" },
          { name: "Sticky Notes", size: "6 KB", desc: "Desktop sticky notes" },
          { name: "Clock", size: "5 KB", desc: "Analog and digital clock" },
          { name: "Task Manager", size: "16 KB", desc: "System monitor and process manager" },
          { name: "Neptune Store", size: "22 KB", desc: "Download additional applications" },
        ];
        coreApps.forEach((a) => {
          html += '<div class="settings-prog">' +
            '<div class="settings-prog-info"><b>' + OS.esc(a.name) + '</b> <span style="color:var(--text-dim);font-size:11px;">(' + a.size + ')</span>' +
            '<div style="font-size:11px;color:var(--text-dim);">' + OS.esc(a.desc) + '</div></div>' +
            '<span style="font-size:11px;color:#c00;">System component</span></div>';
        });
        html += "</div>";
        body.innerHTML = html;
      }

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

      function renderBloat() {
        let html = "<h3>NeptuneOS Bundled Apps</h3>" +
          '<p style="color:var(--text-dim);margin-bottom:12px;">These applications are included with NeptuneOS.</p>' +
          '<div class="settings-prog-list">';
        BLOATWARE_APPS.forEach((a) => {
          html += '<div class="settings-prog">' +
            '<div class="settings-prog-info"><b>' + OS.esc(a.name) + '</b> <span style="color:var(--text-dim);font-size:11px;">(' + a.size + ')</span>' +
            '<div style="font-size:11px;color:var(--text-dim);">' + OS.esc(a.desc) + '</div></div>' +
            '<button class="btn btn-small" disabled>System component</button></div>';
        });
        html += "</div>";
        body.innerHTML = html;
      }

      function renderSystem() {
        const size = OS.fs.sizeOf("/C:");
        const user = OS.setup && OS.setup.userName ? OS.setup.userName() : "Guest";
        const computer = OS.setup && OS.setup.computerName ? OS.setup.computerName() : "NEPTUNE-1";
        const uptime = Math.floor((Date.now() - (window.__bootTime || Date.now())) / 1000);
        const mins = Math.floor(uptime / 60);
        const hrs = Math.floor(mins / 60);
        const uptimeStr = hrs > 0 ? hrs + "h " + (mins % 60) + "m " + (uptime % 60) + "s" : mins + "m " + (uptime % 60) + "s";

        body.innerHTML =
          "<h3>About " + OS.brand.product + "</h3>" +
          "<p><b>" + OS.brand.product + " Version 5.1." + OS.brand.build + "</b> &mdash; a <b>" + OS.brand.company + "</b> product.<br>" + OS.brand.copyright + ".<br>Desktop operating system shell written in plain HTML, CSS &amp; JavaScript. All files and settings are stored in your browser.</p>" +
          '<div class="settings-group">' +
          "<p>Registered to: <b>" + user + "</b><br>" +
          "Computer name: <b>" + computer + "</b><br>" +
          "Files on disk: <b>" + OS.fs.listRecursive("/C:").filter((f) => f.type === "file").length + "</b><br>" +
          "Space used: <b>" + size + "</b> bytes<br>" +
          "Uptime: <b>" + uptimeStr + "</b><br>" +
          "RAM: <b>640KB</b> (ought to be enough for anybody)<br>" +
          "CPU: <b>1x Virtual JavaScript Engine @ ∞ GHz</b></p>" +
          "</div>" +
          '<label class="settings-check"><input type="checkbox" id="logon-toggle"' +
          (OS.setup && OS.setup.logonEnabled && OS.setup.logonEnabled() ? " checked" : "") +
          '> Require log on at startup</label>' +
          "<h3>Maintenance</h3>" +
          '<button class="btn" id="setup-run">Run NeptuneOS setup wizard</button> ' +
          '<button class="btn" id="reset-fs">Reset file system to defaults</button> ' +
          '<button class="btn" id="watermark-toggle">Toggle "Activate NeptuneOS" watermark</button>' +
          '<button class="btn" id="neptunai-toggle">Toggle NeptunAI Assistant</button>' +
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
        body.querySelector("#watermark-toggle").addEventListener("click", () => {
          const wm = document.getElementById("activate-watermark");
          if (wm) {
            wm.remove();
            try { localStorage.setItem("neptuneos.watermark", "off"); } catch (e) {}
            OS.message("Control Panel", "Activate NeptuneOS watermark hidden.", "info");
          } else {
            try { localStorage.removeItem("neptuneos.watermark"); } catch (e) {}
            location.reload();
          }
        });
        body.querySelector("#neptunai-toggle").addEventListener("click", () => {
          if (OS.neptunai) {
            if (OS.neptunai.isEnabled()) {
              OS.neptunai.disable();
              OS.message("Control Panel", "NeptunAI has been disabled.", "info");
            } else {
              OS.neptunai.enable();
              OS.message("Control Panel", "NeptunAI has been re-enabled.", "info");
            }
          }
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
