/* =========================================================
 * neptuneOS — macOS-style Dock
 * Floating glass dock with magnification and bounce animation.
 * ========================================================= */
(function () {
  "use strict";

  const DOCK_APPS = [
    "explorer", "browser", "notepad", "mediaplayer", "paint",
    "separator",
    "calculator", "terminal", "snake", "pacman",
    "separator",
    "settings",
  ];

  let dockEl = null;
  let visible = false;

  const dock = {
    init() {
      if (dockEl) return;
      dockEl = document.createElement("div");
      dockEl.className = "dock-wrap hidden";
      document.body.appendChild(dockEl);
      this.render();
    },

    render() {
      dockEl.innerHTML = "";
      DOCK_APPS.forEach((id) => {
        if (id === "separator") {
          const sep = document.createElement("div");
          sep.className = "dock-sep";
          dockEl.appendChild(sep);
          return;
        }
        const app = OS.apps[id];
        if (!app) return;

        const item = document.createElement("div");
        item.className = "dock-item";
        item.dataset.app = id;
        item.innerHTML =
          '<div class="dock-item-label">' + OS.esc(app.name) + '</div>' +
          '<div class="dock-item-icon"><img src="' + app.icon + '" alt=""></div>' +
          '<div class="dock-indicator"></div>';

        item.addEventListener("click", () => {
          if (app.launch) app.launch();
          item.classList.add("bounce");
          item.addEventListener("animationend", () => item.classList.remove("bounce"), { once: true });
          this.updateRunning();
        });

        dockEl.appendChild(item);
      });
    },

    show() {
      if (!dockEl) this.init();
      dockEl.classList.remove("hidden");
      visible = true;
      this.updateRunning();
    },

    hide() {
      if (dockEl) dockEl.classList.add("hidden");
      visible = false;
    },

    toggle() {
      visible ? this.hide() : this.show();
    },

    updateRunning() {
      if (!dockEl) return;
      dockEl.querySelectorAll(".dock-item").forEach((item) => {
        const id = item.dataset.app;
        const hasWindow = OS.wm.windows.some((w) => w.app === id);
        item.classList.toggle("running", hasWindow);
      });
    },

    bounceApp(appId) {
      if (!dockEl) return;
      const item = dockEl.querySelector('[data-app="' + appId + '"]');
      if (item) {
        item.classList.add("bounce");
        item.addEventListener("animationend", () => item.classList.remove("bounce"), { once: true });
      }
    },
  };

  window.OS = window.OS || {};
  window.OS.dock = dock;
})();
