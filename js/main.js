/* =========================================================
 * neptuneOS — Main bootstrap
 * Registers desktop shortcuts, initializes core, boots.
 * ========================================================= */
(function () {
  "use strict";

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};

  OS.brand = {
    product: "NeptuneOS",
    version: "1.0",
    build: "2600",
    copyright: "Copyright \u00a9 2026 Neptune Productions",
    company: "Neptune Productions",
  };

  function registerDesktopShortcuts() {
    const d = OS.desktop;

    d.addItem({
      id: "mycomputer", label: "My Computer",
      icon: "assets/icons/computer.svg",
      launch: () => OS.apps.explorer.launch(),
    });

    d.addItem({
      id: "documents", label: "My Documents",
      icon: "assets/icons/folder.svg",
      launch: () => OS.apps.explorer.launch({ path: "/C:/Users/Guest/Documents" }),
    });

    d.addItem({
      id: "recycle", label: "Recycle Bin",
      icon: "assets/icons/recycle.svg",
      launch: () => OS.apps.recycle.launch(),
    });

    d.addItem({
      id: "terminal", label: "MS-DOS Prompt",
      icon: "assets/icons/terminal.svg",
      launch: () => OS.apps.terminal.launch(),
    });

    d.addItem({
      id: "notepad", label: "Notepad",
      icon: "assets/icons/notepad.svg",
      launch: () => OS.apps.notepad.launch(),
    });

    d.addItem({
      id: "paint", label: "Paint",
      icon: "assets/icons/paint.svg",
      launch: () => OS.apps.paint.launch(),
    });

    d.addItem({
      id: "calculator", label: "Calculator",
      icon: "assets/icons/calc.svg",
      launch: () => OS.apps.calculator.launch(),
    });

    d.addItem({
      id: "mediaplayer", label: "Media Player",
      icon: "assets/icons/player.svg",
      launch: () => OS.apps.mediaplayer.launch(),
    });

    d.addItem({
      id: "settings", label: "Control Panel",
      icon: "assets/icons/settings.svg",
      launch: () => OS.apps.settings.launch(),
    });

    d.addItem({
      id: "snake", label: "Snake",
      icon: "assets/icons/snake.svg",
      launch: () => OS.apps.snake.launch(),
    });

    d.addItem({
      id: "pacman", label: "Pacman",
      icon: "assets/icons/pacman.svg",
      launch: () => OS.apps.pacman.launch(),
    });

    d.addItem({
      id: "browser", label: "Browser",
      icon: "assets/icons/browser.svg",
      launch: () => OS.apps.browser.launch(),
    });
  }

  function boot() {
    OS.fs.init();
    OS.wav.seed();
    OS.desktop.init();
    OS.desktop.applyWallpaper();
    registerDesktopShortcuts();
    OS.startmenu.init();
    OS.taskbar.init();
    OS.sfx.init();
    OS.fullscreen.init();
    if (OS.dock) OS.dock.init();

    /* Auto-show dock in tablet mode */
    if (OS.tablet && OS.tablet.isEnabled()) {
      document.body.classList.add("tablet-mode");
      if (OS.dock) OS.dock.show();
    }

    const bootScreen = document.getElementById("boot-screen");
    const bootFill = bootScreen.querySelector(".boot-bar-fill");
    const hideBoot = () => {
      bootScreen.classList.add("hidden");
      setTimeout(() => bootScreen.remove(), 600);
    };
    bootFill.addEventListener("animationend", hideBoot);

    /* Failsafe: never trap the user on the boot screen */
    setTimeout(hideBoot, 8000);
  }

  window.addEventListener("load", boot);

  /* Debug handle for testing / the console */
  window.__retroos = OS;
})();
