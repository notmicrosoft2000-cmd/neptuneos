/* =========================================================
 * neptuneOS — Hardware Simulation (Real Resource Model)
 * CPU/RAM actually affect system performance.
 * High load → slow animations, lag spikes.
 * Critical load → BSOD crash → NeptuneOS Recovery.
 * ========================================================= */
(function () {
  "use strict";

  var HISTORY_LEN = 60;
  var TICK_MS = 1500;
  var TOTAL_RAM_KB = 640;

  /* Base resource costs */
  var COST = {
    shell:      { cpu: 8,  ram: 80  },
    perWindow:  { cpu: 2,  ram: 18  },
    browser:    { cpu: 6,  ram: 30  },
    game:       { cpu: 12, ram: 25  },
    emulator:   { cpu: 15, ram: 40  },
  };

  var cpu = 12, ram = 80, gpu = 5, net = 2;
  var cpuHist = [], ramHist = [];
  var loopHandle = null;
  var bsodActive = false;
  var recoveryActive = false;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function getWindowCount() {
    if (OS.wm && OS.wm.windows) return OS.wm.windows.length;
    return 0;
  }

  function classifyWindows() {
    var counts = { browser: 0, game: 0, emulator: 0, other: 0 };
    if (!OS.wm || !OS.wm.windows) return counts;
    OS.wm.windows.forEach(function (w) {
      var app = w.app || "";
      if (app === "browser") counts.browser++;
      else if (["snake","pacman","tetris","minesweeper","solitaire","game2048"].indexOf(app) !== -1) counts.game++;
      else if (app === "terminal") counts.emulator++;
      else counts.other++;
    });
    return counts;
  }

  function update() {
    if (bsodActive || recoveryActive) return;

    var cls = classifyWindows();
    var wc = getWindowCount();

    var baseCpu = COST.shell.cpu;
    var baseRam = COST.shell.ram;

    baseCpu += cls.browser * COST.browser.cpu;
    baseCpu += cls.game * COST.game.cpu;
    baseCpu += cls.emulator * COST.emulator.cpu;
    baseCpu += cls.other * COST.perWindow.cpu;

    baseRam += cls.browser * COST.browser.ram;
    baseRam += cls.game * COST.game.ram;
    baseRam += cls.emulator * COST.emulator.ram;
    baseRam += cls.other * COST.perWindow.ram;

    /* Fluctuation */
    var cpuNoise = (Math.random() * 6 - 3);
    var ramNoise = (Math.random() * 4 - 2);

    cpu = clamp(Math.round((baseCpu + cpuNoise) * 10) / 10, 0, 100);
    ram = clamp(Math.round((baseRam + ramNoise) * 10) / 10, 0, 100);
    gpu = clamp(5 + cls.game * 18 + (Math.random() * 4 - 2), 0, 100);
    net = clamp(2 + (Math.random() * 6 - 3), 0, 100);

    cpuHist.push(cpu);
    if (cpuHist.length > HISTORY_LEN) cpuHist.shift();
    ramHist.push(ram);
    if (ramHist.length > HISTORY_LEN) ramHist.shift();

    /* Apply perf degradation classes */
    var body = document.body;
    body.classList.remove("high-load", "critical-load");

    if (cpu > 90 || ram > 92) {
      body.classList.add("critical-load");
      if (Math.random() < 0.08 && wc >= 5) triggerBSOD();
    } else if (cpu > 72 || ram > 78) {
      body.classList.add("high-load");
    }
  }

  /* ---- BSOD ---- */
  function triggerBSOD() {
    if (bsodActive || recoveryActive) return;
    bsodActive = true;
    if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }

    var bsod = document.createElement("div");
    bsod.id = "bsod-screen";
    bsod.innerHTML =
      "<h1>A problem has been detected and NeptuneOS has been shut down to prevent damage to your computer.</h1>" +
      "<pre>STOP: 0x0000007E (0xC0000005, 0xF78D25CC, 0xC0000050, 0xC0000000)\n\n" +
      "KERNEL_MODE_EXCEPTION_NOT_HANDLED\n\n" +
      "If this is the first time you've seen this stop error screen,\n" +
      "restart your computer. If this screen appears again, follow\n" +
      "these steps:\n\n" +
      "Check to make sure any new hardware or software is properly installed.\n" +
      "If this is a new installation, ask your hardware or software\n" +
      "manufacturer for any NeptuneOS updates you might need.\n\n" +
      "If problems continue, disable or remove any newly installed hardware\n" +
      "or software. Disable BIOS memory options such as caching or shadowing.\n" +
      "If you need to use Safe Mode to remove or disable components, restart\n" +
      "your computer, press F8 to select Advanced Startup Options, and then\n" +
      "select Safe Mode.</pre>" +
      "<div class='bsod-code'>Technical Information:\n\n" +
      "0xF78D25CC - 0x0000007E - 0xC0000005 - KERNEL_DATA_INPAGE_ERROR</div>";

    document.body.appendChild(bsod);

    /* After 4 seconds, transition to recovery */
    setTimeout(function () {
      bsod.remove();
      showRecovery();
    }, 4000);
  }

  /* ---- NeptuneOS Recovery ---- */
  function showRecovery() {
    recoveryActive = true;

    var rec = document.createElement("div");
    rec.id = "recovery-screen";
    rec.innerHTML =
      "<img src='assets/icons/neptuneos.svg' style='width:64px;height:64px;opacity:0.9;' alt=''>" +
      "<h2>NeptuneOS Recovery</h2>" +
      "<p>Your system encountered a critical error and needs to recover.<br>" +
      "Checking system integrity...</p>" +
      "<div class='recovery-bar'><div class='recovery-fill' id='recovery-fill'></div></div>" +
      "<p id='recovery-status' style='font-size:11px;color:#889;margin-top:8px;'>Initializing recovery environment...</p>";

    document.body.appendChild(rec);

    var fill = rec.querySelector("#recovery-fill");
    var status = rec.querySelector("#recovery-status");
    var pct = 0;

    var steps = [
      { p: 15, t: "Checking file system integrity..." },
      { p: 30, t: "Scanning for corrupted system files..." },
      { p: 45, t: "Restoring NeptuneOS kernel..." },
      { p: 60, t: "Rebuilding process table..." },
      { p: 75, t: "Resetting hardware simulation..." },
      { p: 88, t: "Clearing stale window state..." },
      { p: 100, t: "System recovered. Restarting desktop..." },
    ];
    var stepIdx = 0;

    var recLoop = setInterval(function () {
      if (stepIdx >= steps.length) {
        clearInterval(recLoop);
        setTimeout(function () {
          rec.remove();
          recoveryActive = false;
          bsodActive = false;
          restartDesktop();
        }, 800);
        return;
      }
      var s = steps[stepIdx];
      pct = s.p;
      fill.style.width = pct + "%";
      status.textContent = s.t;
      stepIdx++;
    }, 600);
  }

  function restartDesktop() {
    /* Close all windows */
    if (OS.wm && OS.wm.windows) {
      var wins = OS.wm.windows.slice();
      wins.forEach(function (w) { try { w.close(); } catch (_) {} });
    }

    /* Reset resource counters */
    cpu = 12; ram = 80; gpu = 5; net = 2;
    cpuHist.length = 0;
    ramHist.length = 0;

    document.body.classList.remove("high-load", "critical-load");

    /* Restart main loop */
    loopHandle = setInterval(update, TICK_MS);

    /* Show a recovery notification */
    if (OS.message) {
      OS.message("NeptuneOS Recovery", "System recovered from a critical error. All open windows were closed to free resources.", "info");
    }
  }

  function init() {
    update();
    loopHandle = setInterval(update, TICK_MS);
  }

  function destroy() {
    if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }
    document.body.classList.remove("high-load", "critical-load");
  }

  window.OS = window.OS || {};
  OS.hardware = {
    getCPU: function () { return cpu; },
    getRAM: function () { return ram; },
    getGPU: function () { return gpu; },
    getNetwork: function () { return net; },
    getCPUHistory: function () { return cpuHist.slice(); },
    getRAMHistory: function () { return ramHist.slice(); },
    getTotalRAM: function () { return "640 KB"; },
    getUsedRAM: function () { return Math.round(TOTAL_RAM_KB * (ram / 100)) + " KB"; },
    isHighLoad: function () { return cpu > 72 || ram > 78; },
    isCritical: function () { return cpu > 90 || ram > 92; },
    init: init,
    destroy: destroy,
  };
})();
