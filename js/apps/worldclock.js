/* =========================================================
 * NeptuneOS — World Clock
 * Multiple timezones, stopwatch, countdown timer.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var mode = "clock";
  var swInterval = null;
  var swRunning = false;
  var swElapsed = 0;
  var swStart = 0;
  var tmInterval = null;
  var tmTarget = 0;

  var ZONES = [
    { label: "New York", tz: "America/New_York" },
    { label: "London", tz: "Europe/London" },
    { label: "Paris", tz: "Europe/Paris" },
    { label: "Tokyo", tz: "Asia/Tokyo" },
    { label: "Sydney", tz: "Australia/Sydney" },
    { label: "Mumbai", tz: "Asia/Kolkata" },
    { label: "Dubai", tz: "Asia/Dubai" },
    { label: "Los Angeles", tz: "America/Los_Angeles" },
    { label: "Chicago", tz: "America/Chicago" },
    { label: "São Paulo", tz: "America/Sao_Paulo" },
    { label: "Beijing", tz: "Asia/Shanghai" },
    { label: "Moscow", tz: "Europe/Moscow" },
  ];

  function fmtTime(date, tz) {
    try {
      return date.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch (e) { return "--:--:--"; }
  }

  function fmtDate(date, tz) {
    try {
      return date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
    } catch (e) { return ""; }
  }

  function nowStr() {
    return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }

  function renderClockMode() {
    var c = win.content.querySelector("#wc-content");
    if (!c) return;
    var now = new Date();
    var html = '<div class="wc-clock-grid">';
    ZONES.forEach(function (z) {
      html += '<div class="wc-clock-card">' +
        '<div class="wc-clock-label">' + z.label + '</div>' +
        '<div class="wc-clock-time">' + fmtTime(now, z.tz) + '</div>' +
        '<div class="wc-clock-date">' + fmtDate(now, z.tz) + '</div>' +
        '</div>';
    });
    html += '</div>';
    c.innerHTML = html;
  }

  function renderStopwatchMode() {
    var c = win.content.querySelector("#wc-content");
    if (!c) return;
    var ms = swRunning ? swElapsed + (Date.now() - swStart) : swElapsed;
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var cs = Math.floor((ms % 1000) / 10);
    var display = (h > 0 ? h + ":" : "") +
      (h > 0 ? String(m).padStart(2, "0") : String(m)) + ":" +
      String(s).padStart(2, "0") + "." +
      String(cs).padStart(2, "0");

    c.innerHTML = '<div class="wc-stopwatch">' +
      '<div class="wc-sw-time">' + display + '</div>' +
      '<div class="wc-sw-btns">' +
      '<button class="btn wc-sw-toggle">' + (swRunning ? "Pause" : "Start") + '</button>' +
      '<button class="btn wc-sw-reset">Reset</button>' +
      '</div>' +
      '</div>';

    c.querySelector(".wc-sw-toggle").addEventListener("click", function () {
      if (swRunning) {
        swElapsed += Date.now() - swStart;
        swRunning = false;
        clearInterval(swInterval);
      } else {
        swStart = Date.now();
        swRunning = true;
        swInterval = setInterval(renderStopwatchMode, 50);
      }
      renderStopwatchMode();
    });

    c.querySelector(".wc-sw-reset").addEventListener("click", function () {
      swRunning = false;
      swElapsed = 0;
      clearInterval(swInterval);
      renderStopwatchMode();
    });
  }

  function renderTimerMode() {
    var c = win.content.querySelector("#wc-content");
    if (!c) return;
    var remaining = Math.max(0, tmTarget - Date.now());
    var h = Math.floor(remaining / 3600000);
    var m = Math.floor((remaining % 3600000) / 60000);
    var s = Math.floor((remaining % 60000) / 1000);
    var display = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    var running = tmTarget > 0 && remaining > 0;

    c.innerHTML = '<div class="wc-stopwatch">' +
      '<div class="wc-sw-time' + (remaining <= 0 && tmTarget > 0 ? " wc-done" : "") + '">' + display + '</div>' +
      '<div class="wc-tm-set" style="margin-bottom:12px;">' +
      '<label style="font-size:12px;opacity:0.7;">Set minutes:</label> ' +
      '<input type="number" id="wc-tm-min" value="5" min="1" max="999" style="width:50px;padding:3px 6px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;background:rgba(255,255,255,0.06);color:inherit;font-size:13px;"> ' +
      '</div>' +
      '<div class="wc-sw-btns">' +
      '<button class="btn wc-tm-toggle">' + (running ? "Stop" : "Start") + '</button>' +
      '<button class="btn wc-tm-reset">Reset</button>' +
      '</div>' +
      '</div>';

    c.querySelector(".wc-tm-toggle").addEventListener("click", function () {
      if (running) {
        clearInterval(tmInterval);
        tmTarget = 0;
        renderTimerMode();
      } else {
        var mins = parseInt(c.querySelector("#wc-tm-min").value) || 5;
        tmTarget = Date.now() + mins * 60000;
        tmInterval = setInterval(function () {
          if (Date.now() >= tmTarget) {
            clearInterval(tmInterval);
            if (OS.sfx) OS.sfx.notify();
            OS.message && OS.message("Timer", "Time's up!", "info");
          }
          renderTimerMode();
        }, 200);
        renderTimerMode();
      }
    });

    c.querySelector(".wc-tm-reset").addEventListener("click", function () {
      clearInterval(tmInterval);
      tmTarget = 0;
      renderTimerMode();
    });
  }

  function render() {
    if (mode === "clock") renderClockMode();
    else if (mode === "stopwatch") renderStopwatchMode();
    else if (mode === "timer") renderTimerMode();
  }

  function setMode(m) {
    mode = m;
    win.content.querySelectorAll(".wc-mode-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === m);
    });
    render();
  }

  var app = {
    id: "worldclock",
    name: "World Clock",
    icon: "assets/icons/worldclock.svg",
    group: "apps",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          ".wc-clock-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;padding:12px;}" +
          ".wc-clock-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;text-align:center;transition:border-color 0.2s;}" +
          ".wc-clock-card:hover{border-color:rgba(100,180,255,0.4);}" +
          ".wc-clock-label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;margin-bottom:6px;}" +
          ".wc-clock-time{font-size:22px;font-weight:bold;font-family:'Consolas',monospace;letter-spacing:1px;}" +
          ".wc-clock-date{font-size:11px;opacity:0.5;margin-top:4px;}" +
          ".wc-mode-bar{display:flex;gap:4px;padding:6px 12px;border-bottom:1px solid rgba(255,255,255,0.06);}" +
          ".wc-mode-btn{padding:4px 12px;font-size:12px;border:1px solid rgba(255,255,255,0.12);border-radius:4px;background:transparent;color:inherit;cursor:pointer;transition:background 0.15s;}" +
          ".wc-mode-btn:hover{background:rgba(255,255,255,0.06);}" +
          ".wc-mode-btn.active{background:rgba(100,180,255,0.2);border-color:rgba(100,180,255,0.4);}" +
          ".wc-stopwatch{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;}" +
          ".wc-sw-time{font-size:48px;font-weight:bold;font-family:'Consolas',monospace;margin-bottom:24px;letter-spacing:2px;}" +
          ".wc-sw-time.wc-done{color:#f38ba8;animation:wc-pulse 0.6s infinite alternate;}" +
          "@keyframes wc-pulse{from{opacity:1;}to{opacity:0.4;}}" +
          ".wc-sw-btns{display:flex;gap:8px;}" +
          ".wc-sw-btns .btn{padding:8px 24px;font-size:13px;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "World Clock",
        icon: this.icon,
        width: 520,
        height: 440,
        resizable: true,
        app: "worldclock",
        onClose: function () {
          win = null;
          clearInterval(swInterval);
          clearInterval(tmInterval);
          swRunning = false;
        },
      });

      win.content.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;">' +
        '  <div class="wc-mode-bar">' +
        '    <button class="wc-mode-btn active" data-mode="clock">Clocks</button>' +
        '    <button class="wc-mode-btn" data-mode="stopwatch">Stopwatch</button>' +
        '    <button class="wc-mode-btn" data-mode="timer">Timer</button>' +
        '  </div>' +
        '  <div id="wc-content" style="flex:1;overflow:auto;"></div>' +
        '</div>';

      win.content.querySelectorAll(".wc-mode-btn").forEach(function (b) {
        b.addEventListener("click", function () { setMode(b.dataset.mode); });
      });

      var clockInterval = setInterval(function () {
        if (!win || !win.el.isConnected) { clearInterval(clockInterval); return; }
        if (mode === "clock") renderClockMode();
      }, 1000);

      render();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.worldclock = app;
})();
