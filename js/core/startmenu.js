/* =========================================================
 * neptuneOS — Start Menu (XP style)
 * User banner, program list, pinned places, power options.
 * ========================================================= */
(function () {
  "use strict";

  const PINS = ["explorer", "mediaplayer", "settings"];

  const startmenu = {
    el: null,
    open: false,

    init() {
      this.el = document.getElementById("start-menu");
      this.render();
      this.el.addEventListener("mousedown", (e) => e.stopPropagation());
      window.addEventListener("mousedown", () => this.close());
    },

    render() {
      const apps = Object.keys(OS.apps)
        .map((id) => OS.apps[id])
        .filter((a) => a.showInStart !== false);

      const programs = apps
        .filter((a) => a.group !== "system")
        .sort((a, b) => a.name.localeCompare(b.name));
      const system = apps.filter((a) => a.group === "system");
      const pins = PINS.map((id) => OS.apps[id]).filter(Boolean);

      const programItem = (app) =>
        '<div class="start-program" data-app="' + app.id + '">' +
        '<img src="' + app.icon + '" alt="">' +
        "<span>" + OS.esc(app.name) + "</span></div>";

      let html = '<div class="start-header">' +
        '<img src="assets/icons/user.svg" alt="">' +
        '<span class="start-username">Guest</span>' +
        '<span class="start-brand">neptuneOS</span></div>';

      html += '<div class="start-body"><div class="start-col">';
      programs.forEach((app) => { html += programItem(app); });
      if (system.length) {
        html += '<div class="start-sep"></div>';
        system.forEach((app) => { html += programItem(app); });
      }
      html += "</div><div class=\"start-pins\">";
      pins.forEach((app) => {
        html += '<div class="start-pin" data-app="' + app.id + '">' +
          '<img src="' + app.icon + '" alt="">' +
          "<span>" + OS.esc(app.name) + "</span></div>";
      });
      html += "</div></div>";

      html += '<div class="start-footer">' +
        '<button class="btn" id="restart-menu-btn">Restart</button>' +
        '<button class="btn btn-power" id="power-menu-btn">Turn Off Computer</button>' +
        "</div>";

      this.el.innerHTML = html;

      this.el.querySelectorAll(".start-program, .start-pin").forEach((item) => {
        item.addEventListener("click", () => {
          const app = OS.apps[item.dataset.app];
          if (app && typeof app.launch === "function") app.launch();
          this.close();
        });
      });
      this.el.querySelector("#restart-menu-btn").addEventListener("click", () => {
        this.close();
        OS.desktop.restart();
      });
      this.el.querySelector("#power-menu-btn").addEventListener("click", () => {
        this.close();
        OS.desktop.shutdown();
      });
    },

    toggle() {
      this.open ? this.close() : this.openMenu();
    },

    openMenu() {
      this.open = true;
      this.el.hidden = false;
      document.getElementById("start-btn").classList.add("pressed");
    },

    close() {
      this.open = false;
      this.el.hidden = true;
      document.getElementById("start-btn").classList.remove("pressed");
    },
  };

  window.OS = window.OS || {};
  window.OS.startmenu = startmenu;
})();
