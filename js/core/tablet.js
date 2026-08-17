/* =========================================================
 * neptuneOS — Tablet Edition
 * Touch-friendly mode toggle, dock integration.
 * ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "neptuneos.tablet";

  const tablet = {
    isEnabled() {
      try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch (e) { return false; }
    },

    setEnabled(on) {
      try { localStorage.setItem(STORAGE_KEY, on ? "true" : "false"); } catch (e) {}
      if (on) {
        document.body.classList.add("tablet-mode");
        if (OS.dock) OS.dock.show();
      } else {
        document.body.classList.remove("tablet-mode");
        if (OS.dock) OS.dock.hide();
      }
    },

    toggle() {
      this.setEnabled(!this.isEnabled());
    },
  };

  window.OS = window.OS || {};
  window.OS.tablet = tablet;
})();
