/* =========================================================
 * neptuneOS — Start Menu (XP style, slimmed)
 * User banner, pinned apps, essential programs, power options.
 * ========================================================= */
(function () {
  "use strict";

  /* Pinned apps on the right column */
  var PINS = ["explorer", "browser", "settings"];

  /* Which apps to show in the main list (left column) — in display order */
  var MAIN_APPS = ["email", "codeeditor", "mediaplayer", "terminal", "paint", "calculator", "worldclock"];

  /* Games shown as a compact sub-list */
  var GAME_APPS = ["chess", "sudoku", "snake", "pacman", "tetris", "minesweeper", "solitaire", "game2048"];

  var startmenu = {
    el: null,
    open: false,

    init: function () {
      this.el = document.getElementById("start-menu");
      this.render();
      this.el.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      window.addEventListener("mousedown", function () { startmenu.close(); });
    },

    render: function () {
      var pins = PINS.map(function (id) { return OS.apps[id]; }).filter(Boolean);

      var programItem = function (app) {
        return '<div class="start-program" data-app="' + app.id + '">' +
          '<img src="' + app.icon + '" alt="">' +
          '<span>' + OS.esc(app.name) + '</span></div>';
      };

      var html = '<div class="start-header">' +
        '<img src="assets/icons/user.svg" alt="">' +
        '<span class="start-username">' + OS.esc(OS.setup && OS.setup.userName ? OS.setup.userName() : "Guest") + '</span>' +
        '<span class="start-brand">' + OS.esc(OS.brand ? OS.brand.product : "NeptuneOS") + '</span></div>';

      html += '<div class="start-body"><div class="start-col">';

      /* Main programs */
      html += '<div class="start-section">Programs</div>';
      MAIN_APPS.forEach(function (id) {
        var app = OS.apps[id];
        if (app) html += programItem(app);
      });

      /* Games sub-list */
      html += '<div class="start-section" style="margin-top:6px;">Games</div>';
      GAME_APPS.forEach(function (id) {
        var app = OS.apps[id];
        if (app) html += programItem(app);
      });

      html += '</div><div class="start-pins">';
      pins.forEach(function (app) {
        html += '<div class="start-pin" data-app="' + app.id + '">' +
          '<img src="' + app.icon + '" alt="">' +
          '<span>' + OS.esc(app.name) + '</span></div>';
      });
      html += '</div></div>';

      html += '<div class="start-footer">' +
        '<button class="btn" id="restart-menu-btn">Restart</button>' +
        '<button class="btn btn-power" id="power-menu-btn">Turn Off</button>' +
        '</div>';

      this.el.innerHTML = html;

      this.el.querySelectorAll(".start-program, .start-pin").forEach(function (item) {
        item.addEventListener("click", function () {
          var app = OS.apps[item.dataset.app];
          if (app && typeof app.launch === "function") app.launch();
          startmenu.close();
        });
      });
      this.el.querySelector("#restart-menu-btn").addEventListener("click", function () {
        startmenu.close();
        OS.desktop.restart();
      });
      this.el.querySelector("#power-menu-btn").addEventListener("click", function () {
        startmenu.close();
        OS.desktop.shutdown();
      });
    },

    toggle: function () { this.open ? this.close() : this.openMenu(); },

    openMenu: function () {
      this.open = true;
      this.el.hidden = false;
      document.getElementById("start-btn").classList.add("pressed");
    },

    close: function () {
      this.open = false;
      this.el.hidden = true;
      document.getElementById("start-btn").classList.remove("pressed");
    },
  };

  window.OS = window.OS || {};
  window.OS.startmenu = startmenu;
})();
