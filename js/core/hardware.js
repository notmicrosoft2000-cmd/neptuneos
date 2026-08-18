window.OS = window.OS || {};

window.OS.hardware = (function () {
  const HISTORY_LENGTH = 60;
  const UPDATE_INTERVAL = 2000;

  const BASE = {
    cpu: 15,
    ram: 40,
    gpu: 5,
    network: 2,
  };

  const FLUCTUATION = {
    cpu: 5,
    ram: 2,
    gpu: 3,
    network: 5,
  };

  const PER_WINDOW = {
    cpu: 3,
    ram: 5,
  };

  const PER_GAME = {
    cpu: 15,
    gpu: 20,
  };

  const TOTAL_RAM = 640;

  let cpu = BASE.cpu;
  let ram = BASE.ram;
  let gpu = BASE.gpu;
  let network = BASE.network;

  const cpuHistory = [];
  const ramHistory = [];

  let loopHandle = null;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function fluctuate(current, base, range) {
    const next = current + (Math.random() * 2 - 1) * range;
    return clamp(next, base - range, 100);
  }

  function countOpenWindows() {
    if (window.OS && window.OS.windowManager) {
      const wm = window.OS.windowManager;
      if (typeof wm.getWindowCount === "function") {
        return wm.getWindowCount();
      }
      if (wm.windows && typeof wm.windows.length === "number") {
        return wm.windows.length;
      }
    }
    return 0;
  }

  function countRunningGames() {
    if (window.OS && window.OS.processManager) {
      const pm = window.OS.processManager;
      if (typeof pm.getGameCount === "function") {
        return pm.getGameCount();
      }
    }
    if (window.OS && window.OS.processList) {
      let count = 0;
      const list = window.OS.processList;
      const names = Array.isArray(list) ? list : [];
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (
          typeof name === "string" &&
          (name.indexOf("game") !== -1 ||
            name.indexOf("Game") !== -1 ||
            name.indexOf("tetris") !== -1 ||
            name.indexOf("Tetris") !== -1 ||
            name.indexOf("mine") !== -1 ||
            name.indexOf("Mine") !== -1)
        ) {
          count++;
        }
      }
      return count;
    }
    return 0;
  }

  function update() {
    const openWindows = countOpenWindows();
    const runningGames = countRunningGames();

    const windowPenalty = openWindows * PER_WINDOW.cpu;
    const windowRamPenalty = openWindows * PER_WINDOW.ram;
    const gameCpuPenalty = runningGames * PER_GAME.cpu;
    const gameGpuPenalty = runningGames * PER_GAME.gpu;

    cpu = fluctuate(BASE.cpu, 0, FLUCTUATION.cpu) + windowPenalty + gameCpuPenalty;
    ram = fluctuate(BASE.ram, 0, FLUCTUATION.ram) + windowRamPenalty;
    gpu = fluctuate(BASE.gpu, 0, FLUCTUATION.gpu) + gameGpuPenalty;
    network = fluctuate(BASE.network, 0, FLUCTUATION.network);

    cpu = clamp(Math.round(cpu * 10) / 10, 0, 100);
    ram = clamp(Math.round(ram * 10) / 10, 0, 100);
    gpu = clamp(Math.round(gpu * 10) / 10, 0, 100);
    network = clamp(Math.round(network * 10) / 10, 0, 100);

    cpuHistory.push(cpu);
    if (cpuHistory.length > HISTORY_LENGTH) {
      cpuHistory.shift();
    }

    ramHistory.push(ram);
    if (ramHistory.length > HISTORY_LENGTH) {
      ramHistory.shift();
    }

    if (cpu > 80) {
      document.body.classList.add("high-load");
    } else {
      document.body.classList.remove("high-load");
    }
  }

  function getCPU() {
    return cpu;
  }

  function getRAM() {
    return ram;
  }

  function getGPU() {
    return gpu;
  }

  function getNetwork() {
    return network;
  }

  function getCPUHistory() {
    return cpuHistory.slice();
  }

  function getRAMHistory() {
    return ramHistory.slice();
  }

  function getTotalRAM() {
    return "640 KB";
  }

  function getUsedRAM() {
    const used = Math.round(TOTAL_RAM * (ram / 100));
    return used + " KB";
  }

  function init() {
    update();
    loopHandle = setInterval(update, UPDATE_INTERVAL);
  }

  function destroy() {
    if (loopHandle !== null) {
      clearInterval(loopHandle);
      loopHandle = null;
    }
    document.body.classList.remove("high-load");
  }

  return {
    getCPU: getCPU,
    getRAM: getRAM,
    getGPU: getGPU,
    getNetwork: getNetwork,
    getCPUHistory: getCPUHistory,
    getRAMHistory: getRAMHistory,
    getTotalRAM: getTotalRAM,
    getUsedRAM: getUsedRAM,
    init: init,
    destroy: destroy,
  };
})();
