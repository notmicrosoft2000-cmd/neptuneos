/* =========================================================
 * neptuneOS — Taskbar
 * Start button, running-window buttons, tray clock.
 * ========================================================= */
(function () {
  "use strict";

  const taskbar = {
    buttons: {},

    init() {
      const startBtn = document.getElementById("start-btn");
      startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        OS.startmenu.toggle();
      });

      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
    },

    updateClock() {
      const el = document.getElementById("clock");
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      el.textContent = h + ":" + m;
      el.title = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    },

    addButton(win) {
      const btn = document.createElement("button");
      btn.className = "window-task";
      btn.dataset.winId = win.id;
      btn.innerHTML =
        '<img src="' + OS.esc(win.el.querySelector(".window-title-icon").src || "") + '" alt="">' +
        '<span></span>';
      btn.addEventListener("click", () => {
        if (win.minimized) win.restore();
        else if (win === OS.wm.active) win.minimize();
        else win.focus();
      });
      document.getElementById("task-list").appendChild(btn);
      this.buttons[win.id] = btn;
      this.updateButton(win);
    },

    removeButton(win) {
      const btn = this.buttons[win.id];
      if (btn) { btn.remove(); delete this.buttons[win.id]; }
    },

    updateButton(win) {
      const btn = this.buttons[win.id];
      if (!btn) return;
      btn.querySelector("span").textContent = win.title;
      btn.title = win.title;
      btn.classList.toggle("active", win === OS.wm.active && !win.minimized);
    },

    setActive(id) {
      for (const key in this.buttons) {
        const win = OS.wm.windows.find((w) => w.id === key);
        const active = key === id && win && !win.minimized;
        this.buttons[key].classList.toggle("active", !!active);
      }
    },
  };

  window.OS = window.OS || {};
  window.OS.taskbar = taskbar;
})();
