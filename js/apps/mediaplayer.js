/* =========================================================
 * neptuneOS — Media Player
 * Plays chiptune + imported audio stored in the file system.
 * Single instance. Playlist, seek, volume, visualizer.
 * ========================================================= */
(function () {
  "use strict";

  const MUSIC_DIR = "/C:/Users/Guest/Music";
  const AUDIO_EXT = ["wav", "mp3", "ogg", "m4a", "flac", "aac", "webm"];

  let win = null;
  let audio = null;
  let listEl = null;
  let marqueeEl = null;
  let seekEl = null;
  let volEl = null;
  let curEl = null;
  let totEl = null;
  let playBtn = null;
  let canvas = null;
  let playlist = [];
  let currentIndex = -1;
  let analyser = null;
  let rafId = null;

  const app = {
    id: "mediaplayer",
    name: "Media Player",
    icon: "assets/icons/player.svg",
    group: "apps",

    launch(opts) {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Media Player",
        icon: this.icon,
        width: 560,
        height: 460,
        app: "mediaplayer",
        onClose: () => {
          stopAll();
          win = null;
        },
      });

      win.content.innerHTML =
        '<div class="player">' +
        '  <div class="player-visual">' +
        '    <canvas id="player-canvas"></canvas>' +
        '    <div class="player-marquee" id="player-marquee">Ready.</div>' +
        "  </div>" +
        '  <div class="player-side">' +
        '    <div class="player-playlist" id="player-playlist"></div>' +
        '    <div class="player-import">' +
        '      <button class="btn" id="player-import-btn">Import Music&hellip;</button>' +
        '      <input type="file" id="player-file" accept="audio/*" multiple hidden>' +
        "    </div>" +
        "  </div>" +
        '  <div class="player-controls">' +
        '    <div class="player-seekrow"><span id="player-cur">0:00</span>' +
        '      <input type="range" id="player-seek" min="0" max="1000" value="0">' +
        '      <span id="player-total">0:00</span></div>' +
        '    <div class="player-btns">' +
        '      <button class="btn" data-pc="prev" title="Previous">|&laquo;</button>' +
        '      <button class="btn playbtn" id="player-playbtn" data-pc="play" title="Play / Pause">&#9654;</button>' +
        '      <button class="btn" data-pc="stop" title="Stop">&#9632;</button>' +
        '      <button class="btn" data-pc="next" title="Next">&raquo;|</button>' +
        '      <span class="vol-wrap"><label>Vol</label><input type="range" id="player-vol" min="0" max="1" step="0.05" value="1"></span>' +
        "    </div>" +
        "  </div>" +
        "</div>";

      audio = document.createElement("audio");
      audio.preload = "metadata";
      win.content.appendChild(audio);

      listEl = win.content.querySelector("#player-playlist");
      marqueeEl = win.content.querySelector("#player-marquee");
      seekEl = win.content.querySelector("#player-seek");
      volEl = win.content.querySelector("#player-vol");
      curEl = win.content.querySelector("#player-cur");
      totEl = win.content.querySelector("#player-total");
      playBtn = win.content.querySelector("#player-playbtn");
      canvas = win.content.querySelector("#player-canvas");

      win.content.querySelectorAll("[data-pc]").forEach((b) => {
        b.addEventListener("click", () => {
          const act = b.dataset.pc;
          if (act === "play") togglePlay();
          else if (act === "stop") stopAll();
          else if (act === "next") skip(1);
          else if (act === "prev") skip(-1);
        });
      });

      seekEl.addEventListener("input", () => {
        if (audio && audio.duration) audio.currentTime = (seekEl.value / 1000) * audio.duration;
      });

      volEl.addEventListener("input", () => { if (audio) audio.volume = Number(volEl.value); });

      win.content.querySelector("#player-import-btn").addEventListener("click", () => {
        win.content.querySelector("#player-file").click();
      });
      win.content.querySelector("#player-file").addEventListener("change", importFiles);

      audio.addEventListener("timeupdate", updateSeek);
      audio.addEventListener("loadedmetadata", () => {
        totEl.textContent = fmtTime(audio.duration);
        seekEl.max = 1000;
      });
      audio.addEventListener("ended", () => skip(1));
      audio.addEventListener("play", () => {
        playBtn.innerHTML = "&#10074;&#10074;";
        marqueeEl.textContent = "PLAYING \u2014 " + (currentTrack() ? currentTrack().name : "");
        startVisualizer();
      });
      audio.addEventListener("pause", () => {
        playBtn.innerHTML = "&#9654;";
        stopVisualizer();
      });

      scan();
      if (opts && opts.path) playPath(opts.path);
      return win;
    },
  };

  /* ---------- playlist ---------- */
  function scan() {
    playlist = OS.fs.listRecursive(MUSIC_DIR)
      .filter((f) => f.type === "file" && AUDIO_EXT.includes(f.name.split(".").pop().toLowerCase()))
      .map((f) => ({ path: f.path, name: f.name, url: OS.fs.read(f.path) }))
      .filter((t) => t.url && t.url.startsWith("data:audio"));
    render();
  }

  function render() {
    listEl.innerHTML = "";
    if (!playlist.length) {
      listEl.innerHTML = '<div class="explorer-empty">No music yet. Click <b>Import Music</b> to add songs.</div>';
      return;
    }
    playlist.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "player-track" + (i === currentIndex ? " active" : "");
      el.dataset.idx = i;
      el.innerHTML =
        '<span class="pt-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="pt-name">' + OS.esc(t.name.replace(/\.[a-z0-9]+$/i, "")) + "</span>" +
        '<span class="pt-type">' + OS.esc(t.name.split(".").pop().toUpperCase()) + "</span>";
      el.addEventListener("dblclick", () => playIndex(i));
      listEl.appendChild(el);
    });
  }

  function highlight() {
    listEl.querySelectorAll(".player-track").forEach((el, i) => {
      el.classList.toggle("active", i === currentIndex);
    });
    const act = listEl.querySelector(".player-track.active");
    if (act) act.scrollIntoView({ block: "nearest" });
  }

  function currentTrack() {
    return playlist[currentIndex];
  }

  function playIndex(i) {
    if (i < 0 || i >= playlist.length) return;
    currentIndex = i;
    const t = playlist[i];
    audio.src = t.url;
    audio.volume = Number(volEl.value);
    audio.play();
    win.setTitle("Now Playing \u2014 " + t.name + " \u2014 Media Player");
    highlight();
  }

  function playPath(path) {
    const norm = OS.fs.normalize(path);
    const idx = playlist.findIndex((t) => t.path === norm);
    if (idx !== -1) playIndex(idx);
    else {
      const url = OS.fs.read(norm);
      if (url && url.startsWith("data:audio")) {
        currentIndex = -1;
        audio.src = url;
        audio.play();
        const name = norm.split("/").pop();
        marqueeEl.textContent = "PLAYING \u2014 " + name;
        win.setTitle("Now Playing \u2014 " + name + " \u2014 Media Player");
      }
    }
  }

  function togglePlay() {
    if (audio.src) {
      audio.paused ? audio.play() : audio.pause();
    } else if (playlist.length) {
      playIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }

  function skip(dir) {
    if (!playlist.length) return;
    const next = (currentIndex + dir + playlist.length) % playlist.length;
    playIndex(next);
  }

  function stopAll() {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    currentIndex = -1;
    marqueeEl.textContent = "Stopped.";
    playBtn.innerHTML = "&#9654;";
    win && win.setTitle("Media Player");
    seekEl.value = 0;
    curEl.textContent = "0:00";
    totEl.textContent = "0:00";
    stopVisualizer();
    highlight();
  }

  function updateSeek() {
    if (!audio || !audio.duration) return;
    seekEl.value = Math.round((audio.currentTime / audio.duration) * 1000);
    curEl.textContent = fmtTime(audio.currentTime);
  }

  function fmtTime(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  }

  /* ---------- import ---------- */
  function importFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    files.forEach((file) => {
      if (file.size > 2.5 * 1024 * 1024) {
        OS.message("Media Player", "\u201C" + file.name + "\u201D is over 2.5 MB. Keep imports small so they fit in browser storage.", "warn");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let name = file.name.replace(/[\\/:"*?<>|]/g, "_");
        const dir = MUSIC_DIR;
        let path = dir + "/" + name;
        if (OS.fs.exists(path)) {
          const dot = name.lastIndexOf(".");
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          name = stem + " (imported)" + ext;
          path = dir + "/" + name;
        }
        OS.fs.write(path, reader.result);
        scan();
        OS.message("Media Player", "\u201C" + name + "\u201D added to your Music folder.", "info");
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- visualizer ---------- */
  function ensureAnalyser() {
    if (analyser || !audio) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) { /* keep animated fallback below */ }
  }

  function startVisualizer() {
    ensureAnalyser();
    cancelAnimationFrame(rafId);
    drawLoop();
  }

  function stopVisualizer() {
    cancelAnimationFrame(rafId);
    drawIdle();
  }

  function drawLoop() {
    rafId = requestAnimationFrame(drawLoop);
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#0b0f1e";
    ctx.fillRect(0, 0, w, h);

    const bins = 40;
    let data;
    if (analyser) {
      data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
    }
    const bw = w / bins;
    for (let i = 0; i < bins; i++) {
      let v;
      if (data) v = data[Math.floor((i / bins) * analyser.frequencyBinCount)] / 255;
      else v = 0.15 + 0.2 * Math.abs(Math.sin(Date.now() / 300 + i * 0.7));
      const bh = Math.max(3, v * h * 0.9);
      const x = i * bw;
      const g = ctx.createLinearGradient(0, h, 0, h - bh);
      g.addColorStop(0, "#2f5fd4");
      g.addColorStop(1, "#6fa1ff");
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, h - bh, bw - 2, bh);
    }
    ctx.fillStyle = "#9fc2ff";
    ctx.font = "10px monospace";
    ctx.fillText("N\u25B8P · neptuneOS AUDIO", 6, h - 6);
  }

  function drawIdle() {
    cancelAnimationFrame(rafId);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0f1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#9fc2ff";
    ctx.font = "10px monospace";
    ctx.fillText("N\u25B8P · neptuneOS AUDIO", 6, canvas.height - 6);
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.mediaplayer = app;
})();
