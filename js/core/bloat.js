/* =========================================================
 * neptuneOS — System Bloat
 * Installs VFS files and the "Activate" watermark.
 * No popups. No nags. No notifications.
 * ========================================================= */
(function () {
  "use strict";

  const WATERMARK_KEY = "neptuneos.watermark";
  const BLOAT_INSTALLED_KEY = "neptuneos.bloat.installed";

  const BLOATWARE = [
    { name: "Neptune Notes", desc: "Quick note-taking app" },
    { name: "Neptune Weather", desc: "Local weather (permanently 72°F and sunny)" },
    { name: "Neptune Maps", desc: "Turn-by-turn directions to nowhere" },
    { name: "Neptune Calculator Pro", desc: "It adds. That's it." },
  ];

  function installBloat() {
    if (localStorage.getItem(BLOAT_INSTALLED_KEY)) return;
    localStorage.setItem(BLOAT_INSTALLED_KEY, "true");

    const bloatDir = "/C:/Program Files/NeptuneOS";
    OS.fs.mkdir(bloatDir);
    BLOATWARE.forEach((app) => {
      OS.fs.write(bloatDir + "/" + app.name + ".exe", "NeptuneOS system application.");
    });
    OS.fs.write("/C:/Program Files/NeptuneOS/README.txt",
      "Thank you for choosing NeptuneOS!\n\n" +
      "The following applications are included:\n\n" +
      BLOATWARE.map((a) => "  " + a.name + " - " + a.desc).join("\n")
    );
  }

  function showWatermark() {
    if (localStorage.getItem(WATERMARK_KEY) === "off") return;
    if (document.getElementById("activate-watermark")) return;
    const wm = document.createElement("div");
    wm.id = "activate-watermark";
    wm.style.cssText =
      "position:fixed;bottom:36px;right:12px;z-index:970;pointer-events:none;" +
      "color:rgba(255,255,255,0.55);font-size:11px;text-shadow:1px 1px 2px rgba(0,0,0,0.7);" +
      "font-family:Tahoma,sans-serif;line-height:1.4;text-align:right;";
    wm.innerHTML = "NeptuneOS<br>Build 2600<br>Activate NeptuneOS";
    document.body.appendChild(wm);
  }

  const bloat = {
    init() {
      installBloat();
      showWatermark();
    },
  };

  window.OS = window.OS || {};
  window.OS.bloat = bloat;
})();
