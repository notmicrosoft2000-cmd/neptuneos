/* =========================================================
 * NeptuneOS — System Info (neofetch-style)
 * Beautiful system overview with ASCII art, specs, uptime.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var refreshInterval = null;

  function getUptime() {
    var ms = Date.now() - (window._bootTime || Date.now());
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h + "h " + (m % 60) + "m " + (s % 60) + "s";
  }

  function getMemoryInfo() {
    var used = 0;
    if (OS.hardware && OS.hardware.status) {
      var st = OS.hardware.status();
      used = Math.round(st.ramPercent || 0);
    }
    return { used: used, total: "1 GB" };
  }

  function render() {
    var c = win.content.querySelector("#si-content");
    if (!c) return;
    var mem = getMemoryInfo();
    var winCount = OS.wm ? OS.wm.windows.length : 0;
    var cpuPct = 0;
    if (OS.hardware && OS.hardware.status) {
      cpuPct = Math.round(OS.hardware.status().cpu || 0);
    }

    c.innerHTML =
      '<div class="si-layout">' +
      '<div class="si-art">' +
      '<pre class="si-ascii">' +
      '    _nnnn_        \n' +
      '   dGGGGMMb       \n' +
      '  @p~qp~~qMb      \n' +
      '  M|@||@) M|      \n' +
      '  @,----.JM|      \n' +
      ' JS^\\__/  qKL     \n' +
      'dZP        qKRb   \n' +
      'dZP          qKKb \n' +
      'fZP            SMMb\n' +
      'HZM            MMMM\n' +
      'FqM            MMMM\n' +
      '__| \\/        |\\dS\'qML\n' +
      '|    `.       | \'\' \\Zq\n' +
      '_ )     `.__._,\'    __)\n' +
      '// \\            |\n' +
      '</pre>' +
      '</div>' +
      '<div class="si-info">' +
      '<div class="si-user">guest@neptuneos</div>' +
      '<div class="si-sep">-------------</div>' +
      '<div class="si-row"><span class="si-label">OS</span> NeptuneOS 1.0 (Build 2600)</div>' +
      '<div class="si-row"><span class="si-label">Kernel</span> NeptuneDOS 13.02</div>' +
      '<div class="si-row"><span class="si-label">Shell</span> neptunedos / neptunai</div>' +
      '<div class="si-row"><span class="si-label">Uptime</span> ' + getUptime() + '</div>' +
      '<div class="si-row"><span class="si-label">CPU</span> ' + cpuPct + '% usage (' + (navigator.hardwareConcurrency || "?") + ' cores)</div>' +
      '<div class="si-row"><span class="si-label">Memory</span> ' + mem.used + '% of ' + mem.total + '</div>' +
      '<div class="si-row"><span class="si-label">Resolution</span> ' + window.innerWidth + 'x' + window.innerHeight + '</div>' +
      '<div class="si-row"><span class="si-label">Platform</span> ' + navigator.platform + '</div>' +
      '<div class="si-row"><span class="si-label">Language</span> ' + navigator.language + '</div>' +
      '<div class="si-row"><span class="si-label">Windows</span> ' + winCount + ' open</div>' +
      '<div class="si-row"><span class="si-label">Theme</span> Windows XP Luna / Aero</div>' +
      '</div>' +
      '</div>' +
      '<div class="si-colors">' +
      '<span class="si-block" style="background:#1e1e2e;"></span>' +
      '<span class="si-block" style="background:#f38ba8;"></span>' +
      '<span class="si-block" style="background:#a6e3a1;"></span>' +
      '<span class="si-block" style="background:#f9e2af;"></span>' +
      '<span class="si-block" style="background:#89b4fa;"></span>' +
      '<span class="si-block" style="background:#cba6f7;"></span>' +
      '<span class="si-block" style="background:#94e2d5;"></span>' +
      '<span class="si-block" style="background:#cdd6f4;"></span>' +
      '</div>';
  }

  var app = {
    id: "sysinfo",
    name: "System Info",
    icon: "assets/icons/sysinfo.svg",
    group: "system",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          "#si-content{padding:16px;overflow:auto;height:100%;}" +
          ".si-layout{display:flex;gap:24px;align-items:flex-start;}" +
          ".si-ascii{font-family:Consolas,monospace;font-size:11px;line-height:1.15;color:#89b4fa;margin:0;white-space:pre;}" +
          ".si-info{flex:1;font-size:13px;}" +
          ".si-user{font-size:16px;font-weight:700;color:#89b4fa;margin-bottom:2px;}" +
          ".si-sep{margin-bottom:8px;opacity:0.4;}" +
          ".si-row{margin-bottom:3px;}" +
          ".si-label{color:#cba6f7;font-weight:600;display:inline-block;min-width:100px;}" +
          ".si-colors{display:flex;gap:4px;margin-top:16px;justify-content:center;}" +
          ".si-block{width:24px;height:14px;border-radius:3px;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "System Info",
        icon: this.icon,
        width: 480,
        height: 380,
        resizable: true,
        app: "sysinfo",
        onClose: function () { win = null; clearInterval(refreshInterval); },
      });

      win.content.innerHTML = '<div id="si-content" style="height:100%;overflow:auto;"></div>';
      render();
      refreshInterval = setInterval(function () {
        if (!win || !win.el.isConnected) { clearInterval(refreshInterval); return; }
        render();
      }, 2000);
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.sysinfo = app;
})();
