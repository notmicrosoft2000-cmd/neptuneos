/* =========================================================
 * neptuneOS — Start Menu
 * Program list, user banner, shutdown / restart.
 * ========================================================= */
(function () {
  "use strict";

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

      let html = '<div class="start-left">';
      html += '<div class="start-user"><img src="assets/icons/user.svg" width="20" height="20" alt="">Guest</div>';
      html += '<div class="start-sep"></div>';
      programs.forEach((app) => {
        html += '<div class="start-program" data-app="' + app.id + '">' +
          '<img src="' + app.icon + '" alt="">' +
          "<span>" + OS.esc(app.name) + "</span></div>";
      });
      if (system.length) {
        html += '<div class="start-sep"></div>';
        system.forEach((app) => {
          html += '<div class="start-program" data-app="' + app.id + '">' +
            '<img src="' + app.icon + '" alt="">' +
            "<span>" + OS.esc(app.name) + "</span></div>";
        });
      }
      html += '<div class="start-footer">' +
        '<div class="start-user"><img src="assets/icons/shutdown.svg" width="20" height="20" alt=""><span>Shut Down&hellip;</span></div>' +
        '<button class="btn" id="restart-menu-btn">Restart</button>' +
        "</div></div>";
      html += '<div class="start-right">neptuneOS</div>';

      this.el.innerHTML = html;

      this.el.querySelectorAll(".start-program").forEach((item) => {
        item.addEventListener("click", () => {
          const app = OS.apps[item.dataset.app];
          if (app && typeof app.launch === "function") app.launch();
          this.close();
        });
      });
      this.el.querySelector(".start-footer").addEventListener("click", (e) => {
        if (e.target.id === "restart-menu-btn") {
          this.close();
          OS.desktop.restart();
        }
      });
      this.el.querySelector(".start-footer").querySelector(".start-user").addEventListener("click", () => {
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
