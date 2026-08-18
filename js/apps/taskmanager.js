/* =========================================================
 * NeptuneOS — Task Manager
 * Windows XP-style Task Manager with Processes, Performance,
 * and Networking tabs. Canvas-based real-time graphs.
 * ========================================================= */
(function () {
  "use strict";

  let win = null;
  let timer = null;
  let activeTab = "processes";
  let selectedRow = null;

  const PROCESS_NAMES = [
    "explorer.exe", "taskmgr.exe", "svchost.exe", "csrss.exe",
    "winlogon.exe", "lsass.exe", "services.exe", "lsass.exe",
    "rundll32.exe", "cmd.exe", "notepad.exe", "calc.exe",
    "mspaint.exe", "mshearts.exe", "sol.exe", "winmine.exe",
    "iexplore.exe", "wmploc.exe", "mstsc.exe", "dialer.exe",
    "regedit.exe", "write.exe", "charmap.exe", "clipbrd.exe",
    "osk.exe", "narrator.exe", "magnify.exe", "control.exe",
  ];

  function fakePID() {
    return Math.floor(Math.random() * 900) + 100;
  }

  function fakeCPU() {
    return (Math.random() * 25 + 0.1).toFixed(1);
  }

  function fakeMem() {
    return (Math.random() * 128 + 2).toFixed(1);
  }

  const app = {
    id: "taskmanager",
    name: "Task Manager",
    icon: "assets/icons/taskmanager.svg",
    group: "system",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "NeptuneOS Task Manager",
        icon: this.icon,
        width: 500,
        height: 420,
        resizable: false,
        app: "taskmanager",
        onClose: () => { stopTimer(); win = null; selectedRow = null; },
      });

      renderShell();
      selectTab("processes");
      startTimer();
    },
  };

  /* ── Shell HTML ─────────────────────────────────────────── */

  function renderShell() {
    win.content.innerHTML =
      '<div style="font-family:Tahoma,sans-serif;font-size:11px;background:#ece9d8;height:100%;display:flex;flex-direction:column;margin:0;padding:0;user-select:none;overflow:hidden;">' +
      '  <div id="tm-menu" style="background:#ece9d8;border-bottom:1px solid #aca899;padding:2px 4px;display:flex;gap:2px;">' +
      '    <div class="tm-menu-item" data-menu="file" style="padding:2px 8px;cursor:default;position:relative;">' +
      '      File' +
      '      <div class="tm-menu-dropdown" id="tm-file-menu" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #aca899;box-shadow:2px 2px 4px rgba(0,0,0,.3);z-index:999;min-width:140px;">' +
      '        <div class="tm-menu-dd-item" id="tm-file-exit" style="padding:4px 24px;cursor:default;">Exit</div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div id="tm-tabs" style="background:#ece9d8;padding:4px 4px 0;display:flex;gap:0;border-bottom:1px solid #aca899;">' +
      '    <button class="tm-tab" data-tab="processes" style="padding:4px 14px;border:1px solid #aca899;border-bottom:none;background:#ece9d8;cursor:default;margin-right:-1px;border-radius:3px 3px 0 0;font-size:11px;font-family:Tahoma,sans-serif;">Processes</button>' +
      '    <button class="tm-tab" data-tab="performance" style="padding:4px 14px;border:1px solid #aca899;border-bottom:none;background:#d6d2c2;cursor:default;margin-right:-1px;border-radius:3px 3px 0 0;font-size:11px;font-family:Tahoma,sans-serif;">Performance</button>' +
      '    <button class="tm-tab" data-tab="networking" style="padding:4px 14px;border:1px solid #aca899;border-bottom:none;background:#d6d2c2;cursor:default;border-radius:3px 3px 0 0;font-size:11px;font-family:Tahoma,sans-serif;">Networking</button>' +
      '  </div>' +
      '  <div id="tm-body" style="flex:1;overflow:hidden;background:#fff;border-left:1px solid #aca899;border-right:1px solid #aca899;border-bottom:1px solid #aca899;"></div>' +
      '  <div id="tm-footer" style="background:#ece9d8;border-top:1px solid #aca899;padding:4px 8px;display:flex;justify-content:flex-end;gap:6px;">' +
      '    <button id="tm-end-task" class="tm-btn" style="padding:3px 16px;font-size:11px;font-family:Tahoma,sans-serif;background:#ece9d8;border:1px solid #aca899;cursor:default;">End Task</button>' +
      '  </div>' +
      '</div>';

    win.content.querySelectorAll(".tm-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        selectTab(tab.dataset.tab);
      });
    });

    win.content.querySelector("#tm-end-task").addEventListener("click", endTask);

    var menuToggle = win.content.querySelector('[data-menu="file"]');
    var fileMenu = win.content.querySelector("#tm-file-menu");
    var menuOpen = false;

    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      menuOpen = !menuOpen;
      fileMenu.style.display = menuOpen ? "block" : "none";
    });

    document.addEventListener("click", function () {
      menuOpen = false;
      fileMenu.style.display = "none";
    });

    win.content.querySelector("#tm-file-exit").addEventListener("click", function () {
      win.close();
    });
  }

  /* ── Tab switching ──────────────────────────────────────── */

  function selectTab(tab) {
    activeTab = tab;
    selectedRow = null;

    win.content.querySelectorAll(".tm-tab").forEach(function (el) {
      var isActive = el.dataset.tab === tab;
      el.style.background = isActive ? "#fff" : "#d6d2c2";
      el.style.fontWeight = isActive ? "bold" : "normal";
      el.style.borderBottom = isActive ? "1px solid #fff" : "";
    });

    renderTabBody();
  }

  /* ── Render tab body ────────────────────────────────────── */

  function renderTabBody() {
    var body = win.content.querySelector("#tm-body");
    if (!body) return;

    if (activeTab === "processes") renderProcesses(body);
    else if (activeTab === "performance") renderPerformance(body);
    else if (activeTab === "networking") renderNetworking(body);
  }

  /* ── Processes tab ──────────────────────────────────────── */

  function renderProcesses(body) {
    var windows = OS.wm.windows || [];
    var rows = [];

    rows.push(
      '<table style="width:100%;border-collapse:collapse;font-size:11px;font-family:Tahoma,sans-serif;">' +
      '<thead><tr style="background:#ece9d8;border-bottom:1px solid #aca899;">' +
      '<th style="text-align:left;padding:3px 6px;border-right:1px solid #aca899;">Image Name</th>' +
      '<th style="text-align:right;padding:3px 6px;border-right:1px solid #aca899;width:50px;">PID</th>' +
      '<th style="text-align:right;padding:3px 6px;border-right:1px solid #aca899;width:60px;">CPU</th>' +
      '<th style="text-align:right;padding:3px 6px;border-right:1px solid #aca899;width:80px;">Mem Usage</th>' +
      '<th style="text-align:center;padding:3px 4px;width:40px;"></th>' +
      '</tr></thead><tbody>'
    );

    /* Show OS system processes first */
    var sysProcs = ["System Idle Process", "System", "svchost.exe", "csrss.exe", "winlogon.exe", "lsass.exe"];
    for (var s = 0; s < sysProcs.length; s++) {
      rows.push(
        '<tr class="tm-row" data-type="sys" style="border-bottom:1px solid #e0ddd1;cursor:default;">' +
        '<td style="padding:2px 6px;">' + esc(sysProcs[s]) + '</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + fakePID() + '</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + (Math.random() * 2).toFixed(1) + '</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + (Math.random() * 8 + 0.2).toFixed(1) + ' K</td>' +
        '<td></td>' +
        '</tr>'
      );
    }

    /* Show open windows as processes */
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i];
      var procName = PROCESS_NAMES[i % PROCESS_NAMES.length];
      if (w.app === "taskmanager") procName = "taskmgr.exe";
      var mem = (Math.random() * 48 + 4).toFixed(1);
      var cpu = (Math.random() * 15 + 0.5).toFixed(1);

      rows.push(
        '<tr class="tm-row tm-row-win" data-win-id="' + w.id + '" style="border-bottom:1px solid #e0ddd1;cursor:default;">' +
        '<td style="padding:2px 6px;">' + esc(procName) + '  (' + esc(w.title) + ')</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + fakePID() + '</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + cpu + '</td>' +
        '<td style="text-align:right;padding:2px 6px;">' + mem + ' K</td>' +
        '<td style="text-align:center;"><button class="tm-close-btn" data-win-id="' + w.id + '" style="background:none;border:none;cursor:pointer;font-size:13px;color:#888;padding:0 2px;" title="Close">&times;</button></td>' +
        '</tr>'
      );
    }

    rows.push("</tbody></table>");
    body.innerHTML = rows.join("");

    /* Row selection */
    var trs = body.querySelectorAll(".tm-row");
    trs.forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest(".tm-close-btn")) return;
        trs.forEach(function (r) { r.style.background = ""; });
        tr.style.background = "#316ac5";
        tr.style.color = "#fff";
        selectedRow = tr;
      });
    });

    /* Close buttons */
    body.querySelectorAll(".tm-close-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wid = btn.dataset.winId;
        var target = (OS.wm.windows || []).find(function (w) { return w.id === wid; });
        if (target) target.close();
        setTimeout(function () { renderTabBody(); }, 250);
      });
    });
  }

  /* ── Performance tab ────────────────────────────────────── */

  var cpuCanvas, ramCanvas, cpuCtx, ramCtx;

  function renderPerformance(body) {
    body.innerHTML =
      '<div style="padding:8px;font-family:Tahoma,sans-serif;font-size:11px;">' +
      '  <div style="display:flex;gap:12px;flex-wrap:wrap;">' +
      '    <div style="flex:1;min-width:200px;">' +
      '      <div style="margin-bottom:4px;"><b>CPU Usage:</b> <span id="tm-cpu-val">0%</span></div>' +
      '      <canvas id="tm-cpu-graph" width="400" height="200" style="border:1px solid #808080;display:block;"></canvas>' +
      '      <div style="margin-top:2px;color:#666;">History (last 60 samples)</div>' +
      '    </div>' +
      '    <div style="flex:1;min-width:200px;">' +
      '      <div style="margin-bottom:4px;"><b>Memory Usage:</b> <span id="tm-ram-val">0%</span></div>' +
      '      <canvas id="tm-ram-graph" width="400" height="200" style="border:1px solid #808080;display:block;"></canvas>' +
      '      <div style="margin-top:2px;color:#666;">Total: ' + OS.hardware.getTotalRAM() + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div style="margin-top:10px;padding:6px;background:#f0f0e8;border:1px solid #ccc;display:flex;gap:24px;">' +
      '    <div><b>Kernel Memory:</b><br>640 KB total</div>' +
      '    <div><b>System:</b><br>NeptuneOS 5.1 Build 2600</div>' +
      '    <div><b>Handles:</b> <span id="tm-handles">' + ((OS.wm.windows || []).length * 127 + 3420) + '</span></div>' +
      '    <div><b>Threads:</b> <span id="tm-threads">' + ((OS.wm.windows || []).length * 8 + 64) + '</span></div>' +
      '  </div>' +
      '</div>';

    cpuCanvas = body.querySelector("#tm-cpu-graph");
    ramCanvas = body.querySelector("#tm-ram-graph");
    cpuCtx = cpuCanvas.getContext("2d");
    ramCtx = ramCanvas.getContext("2d");

    drawGraphs();
  }

  function drawGraphs() {
    if (!cpuCtx || !ramCtx) return;
    drawLineGraph(cpuCtx, cpuCanvas.width, cpuCanvas.height, OS.hardware.getCPUHistory(), "CPU");
    drawLineGraph(ramCtx, ramCanvas.width, ramCanvas.height, OS.hardware.getRAMHistory(), "RAM");

    var cpuVal = bodyEl("#tm-cpu-val");
    var ramVal = bodyEl("#tm-ram-val");
    if (cpuVal) cpuVal.textContent = OS.hardware.getCPU().toFixed(1) + "%";
    if (ramVal) ramVal.textContent = OS.hardware.getRAM().toFixed(1) + "%  (" + OS.hardware.getUsedRAM() + " / " + OS.hardware.getTotalRAM() + ")";

    var handles = bodyEl("#tm-handles");
    var threads = bodyEl("#tm-threads");
    if (handles) handles.textContent = ((OS.wm.windows || []).length * 127 + 3420);
    if (threads) threads.textContent = ((OS.wm.windows || []).length * 8 + 64);
  }

  function drawLineGraph(ctx, w, h, data, label) {
    /* Black background */
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    /* Grid lines */
    ctx.strokeStyle = "#1a3a1a";
    ctx.lineWidth = 1;
    for (var gy = 0; gy <= 4; gy++) {
      var yy = (gy / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }

    /* Scale labels */
    ctx.fillStyle = "#0a6a0a";
    ctx.font = "10px Tahoma, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (var si = 0; si <= 4; si++) {
      ctx.fillText((100 - si * 25) + "%", 2, (si / 4) * h);
    }

    if (!data || data.length < 2) return;

    var stepX = w / (data.length - 1);

    /* Green fill under the line */
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (var fi = 0; fi < data.length; fi++) {
      var fx = fi * stepX;
      var fy = h - (data[fi] / 100) * h;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo((data.length - 1) * stepX, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,200,0,0.1)";
    ctx.fill();

    /* Green line */
    ctx.beginPath();
    ctx.moveTo(0, h - (data[0] / 100) * h);
    for (var li = 1; li < data.length; li++) {
      ctx.lineTo(li * stepX, h - (data[li] / 100) * h);
    }
    ctx.strokeStyle = "#00cc00";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Right edge highlight */
    var lastVal = data[data.length - 1];
    var lastX = (data.length - 1) * stepX;
    var lastY = h - (lastVal / 100) * h;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff00";
    ctx.fill();
  }

  /* ── Networking tab ─────────────────────────────────────── */

  function renderNetworking(body) {
    body.innerHTML =
      '<div style="padding:8px;font-family:Tahoma,sans-serif;font-size:11px;">' +
      '  <div style="margin-bottom:6px;"><b>Network Activity</b></div>' +
      '  <canvas id="tm-net-graph" width="400" height="200" style="border:1px solid #808080;display:block;"></canvas>' +
      '  <div style="margin-top:8px;display:flex;gap:16px;">' +
      '    <div><b>Current:</b> <span id="tm-net-val">0%</span></div>' +
      '    <div><b>Adapter:</b> NeptuneOS Virtual NIC</div>' +
      '    <div><b>Link Speed:</b> 100 Mbps</div>' +
      '  </div>' +
      '  <div style="margin-top:8px;padding:6px;background:#f0f0e8;border:1px solid #ccc;">' +
      '    <div><b>Sent:</b> <span id="tm-net-sent">0</span> KB</div>' +
      '    <div><b>Received:</b> <span id="tm-net-recv">0</span> KB</div>' +
      '  </div>' +
      '</div>';
  }

  function drawNetworking() {
    var body = win.content.querySelector("#tm-body");
    if (!body || activeTab !== "networking") return;

    var canvas = body.querySelector("#tm-net-graph");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;

    var netVal = OS.hardware.getNetwork();

    /* Black background */
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    /* Grid */
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 1;
    for (var gy = 0; gy <= 4; gy++) {
      var yy = (gy / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }

    /* Vertical bar representing current activity */
    var barW = w * 0.35;
    var barH = (netVal / 100) * h;
    var barX = (w - barW) / 2;
    var barY = h - barH;

    /* Gradient bar */
    var grad = ctx.createLinearGradient(barX, h, barX, barY);
    grad.addColorStop(0, "#003300");
    grad.addColorStop(0.5, "#009900");
    grad.addColorStop(1, "#00ff00");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);

    /* Bar outline */
    ctx.strokeStyle = "#00cc00";
    ctx.strokeRect(barX, barY, barW, barH);

    /* Peak markers */
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 1;
    for (var pi = 1; pi < 4; pi++) {
      var py = (pi / 4) * h;
      ctx.beginPath();
      ctx.moveTo(barX, py);
      ctx.lineTo(barX + barW, py);
      ctx.stroke();
    }

    /* Value text */
    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 14px Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(netVal.toFixed(1) + "%", w / 2, h / 2);

    var valEl = body.querySelector("#tm-net-val");
    if (valEl) valEl.textContent = netVal.toFixed(1) + "%";

    var sentEl = body.querySelector("#tm-net-sent");
    var recvEl = body.querySelector("#tm-net-recv");
    if (sentEl) sentEl.textContent = Math.floor(Math.random() * 5000 + 100);
    if (recvEl) recvEl.textContent = Math.floor(Math.random() * 12000 + 200);
  }

  /* ── End Task ───────────────────────────────────────────── */

  function endTask() {
    if (!selectedRow) return;
    var wid = selectedRow.dataset.winId;
    if (!wid) return;

    var target = (OS.wm.windows || []).find(function (w) { return w.id === wid; });
    if (target) {
      target.close();
      selectedRow = null;
      setTimeout(function () { renderTabBody(); }, 250);
    }
  }

  /* ── Timer ──────────────────────────────────────────────── */

  function startTimer() {
    stopTimer();
    tick();
    timer = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function tick() {
    if (!win || !win.el.isConnected) { stopTimer(); return; }
    if (activeTab === "processes") renderTabBody();
    else if (activeTab === "performance") drawGraphs();
    else if (activeTab === "networking") drawNetworking();
  }

  /* ── Helpers ────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function bodyEl(sel) {
    if (!win || !win.content) return null;
    return win.content.querySelector(sel);
  }

  /* ── Register ───────────────────────────────────────────── */

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.taskmanager = app;
})();
