/* =========================================================
 * neptuneOS — Fullscreen
 * Toggle browser fullscreen from the tray button, the terminal
 * or OS.fullscreen.toggle().
 * ========================================================= */
(function () {
  "use strict";

  const fullscreen = {
    active: false,
    btn: null,

    init() {
      this.btn = document.getElementById("fullscreen-btn");
      if (this.btn) this.btn.addEventListener("click", () => this.toggle());
      document.addEventListener("fullscreenchange", () => {
        this.active = !!document.fullscreenElement;
        if (this.btn) this.btn.title = this.active ? "Exit Fullscreen" : "Fullscreen";
      });
    },

    request() {
      if (document.fullscreenElement) return;
      const el = document.documentElement;
      const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    },

    exit() {
      if (!document.fullscreenElement) return;
      const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
      if (p && p.catch) p.catch(() => {});
    },

    toggle() {
      this.active ? this.exit() : this.request();
    },

    isActive() {
      return !!document.fullscreenElement;
    },
  };

  window.OS = window.OS || {};
  OS.fullscreen = fullscreen;
})();
