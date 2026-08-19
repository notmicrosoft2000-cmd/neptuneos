/* =========================================================
 * NeptuneOS — Pac-Man
 * Classic Pac-Man on a randomly generated maze with 4
 * uniquely-behaved ghosts, power pellets, increasing speed,
 * high-score persistence, and responsive canvas rendering.
 * ========================================================= */
(function () {
  "use strict";

  const CELL = 20;
  const BASE_TICK = 110;
  const FRIGHT_DURATION = 480;
  const GHOST_HOME_TICKS = 8;

  let win = null;
  let canvas = null, ctx = null;
  let scoreEl = null, livesEl = null, msgEl = null;
  let raf = null;
  let lastTime = 0, accumulator = 0;

  let mazeW = 21, mazeH = 23;
  let open = new Set();
  let dots = new Set();
  let pellets = new Set();
  let totalDots = 0;
  let pac = null;
  let ghosts = [];
  let score = 0, lives = 3;
  let frightTimer = 0;
  let paused = false, over = false, won = false;
  let deathTimer = 0;
  let keyQueue = [];
  let animFrame = 0;

  const RED = "#ff2b2b";
  const PINK = "#ffb8de";
  const CYAN = "#00f2ff";
  const ORANGE = "#ffb852";

  function getHighScore() {
    try { return parseInt(localStorage.getItem("neptuneos.pacman.highscore")) || 0; }
    catch { return 0; }
  }
  function setHighScore(v) {
    try { localStorage.setItem("neptuneos.pacman.highscore", String(v)); } catch {}
  }

  const app = {
    id: "pacman",
    name: "Pac-Man",
    icon: "assets/icons/pacman.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      win = OS.wm.createWindow({
        title: "Pac-Man",
        icon: this.icon,
        width: mazeW * CELL + 16,
        height: mazeH * CELL + 64,
        resizable: false,
        app: "pacman",
        onClose: () => { stop(); win = null; },
      });
      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="pac-title">Pac-Man</span>' +
        '    <span id="pac-score">Score: 0</span>' +
        '    <span id="pac-hi">Hi: 0</span>' +
        '    <span id="pac-lives"></span>' +
        "  </div>" +
        '  <canvas id="pac-canvas"></canvas>' +
        '  <div class="game-status" id="pac-msg">Arrow keys / WASD to move &middot; P/Esc to pause &middot; R to restart</div>' +
        "</div>";

      canvas = win.content.querySelector("#pac-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#pac-score");
      livesEl = win.content.querySelector("#pac-lives");
      msgEl = win.content.querySelector("#pac-msg");

      /* Touch D-Pad */
      if (OS.createDPad) {
        OS.createDPad({
          parent: win.content.querySelector(".game-wrap"),
          onDir: function (dir) {
            var map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
            if (map[dir]) onKey({ key: map[dir], preventDefault: function () {} });
          },
          actions: [
            { id: "pause", label: "P" },
            { id: "restart", label: "R" },
          ],
          onAction: function (a) {
            if (a === "pause") onKey({ key: "p", preventDefault: function () {} });
            else if (a === "restart") onKey({ key: "r", preventDefault: function () {} });
          },
        });
      }

      resizeCanvas();
      reset();
      document.addEventListener("keydown", onKey);
    },
  };

  function resizeCanvas() {
    canvas.width = mazeW * CELL;
    canvas.height = mazeH * CELL;
  }

  /* ---------------- maze generation (rooms + corridors) ---------------- */

  function K(x, y) { return x + y * 1000; }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function carve(cx, cy) {
    open.add(K(cx, cy));
    const dirs = shuffle([
      { x: 0, y: -2 }, { x: 0, y: 2 }, { x: -2, y: 0 }, { x: 2, y: 0 },
    ]);
    for (const d of dirs) {
      const nx = cx + d.x, ny = cy + d.y;
      if (nx > 0 && ny > 0 && nx < mazeW - 1 && ny < mazeH - 1 && !open.has(K(nx, ny))) {
        open.add(K(cx + d.x / 2, cy + d.y / 2));
        carve(nx, ny);
      }
    }
  }

  function buildMaze() {
    open = new Set();
    carve(1, 1);

    const rooms = [];
    const roomCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < roomCount; i++) {
      const rw = 3 + Math.floor(Math.random() * 3) * 2;
      const rh = 3 + Math.floor(Math.random() * 3) * 2;
      const rx = 1 + Math.floor(Math.random() * ((mazeW - rw - 2) / 2)) * 2;
      const ry = 1 + Math.floor(Math.random() * ((mazeH - rh - 2) / 2)) * 2;
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (let dx = 0; dx < rw; dx++) {
        for (let dy = 0; dy < rh; dy++) {
          if (rx + dx < mazeW && ry + dy < mazeH) open.add(K(rx + dx, ry + dy));
        }
      }
    }

    let extra = 0;
    while (extra < Math.floor(mazeW * mazeH * 0.12)) {
      const x = 1 + Math.floor(Math.random() * (mazeW - 2));
      const y = 1 + Math.floor(Math.random() * (mazeH - 2));
      if (open.has(K(x, y))) continue;
      const has = (ox, oy) => open.has(K(x + ox, y + oy));
      if ((has(-1, 0) && has(1, 0)) || (has(0, -1) && has(0, 1))) {
        open.add(K(x, y));
        extra++;
      }
    }
  }

  /* ---------------- game state ---------------- */

  function reset() {
    stop();
    buildMaze();
    dots = new Set(open);
    pellets = new Set();

    const corners = [[1, 1], [mazeW - 2, 1], [1, mazeH - 2], [mazeW - 2, mazeH - 2]];
    for (const [cx, cy] of corners) {
      if (!open.has(K(cx, cy))) continue;
      dots.delete(K(cx, cy));
      pellets.add(K(cx, cy));
    }

    totalDots = dots.size + pellets.size;
    pac = { x: 1, y: 1, dir: { x: 1, y: 0 }, nextDir: null };

    const sx = Math.floor(mazeW / 2);
    const sy = Math.floor(mazeH / 2);
    ghosts = [
      { x: sx, y: sy, dir: { x: 1, y: 0 }, color: RED, type: "chase", state: "home", homeTimer: 0 },
      { x: sx, y: sy, dir: { x: -1, y: 0 }, color: PINK, type: "ambush", state: "home", homeTimer: GHOST_HOME_TICKS },
      { x: sx, y: sy, dir: { x: 0, y: -1 }, color: CYAN, type: "fast", state: "home", homeTimer: GHOST_HOME_TICKS * 2 },
      { x: sx, y: sy, dir: { x: 0, y: 1 }, color: ORANGE, type: "wander", state: "home", homeTimer: GHOST_HOME_TICKS * 3 },
    ];

    score = 0;
    lives = 3;
    frightTimer = 0;
    deathTimer = 0;
    paused = false;
    over = false;
    won = false;
    keyQueue = [];
    animFrame = 0;
    updateHud();
    msgEl.textContent = "Arrow keys / WASD to move \u00b7 P/Esc to pause \u00b7 R to restart";
    start();
  }

  function start() {
    if (over || won) return;
    if (raf) return;
    paused = false;
    lastTime = performance.now();
    accumulator = 0;
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    paused = true;
    stop();
    msgEl.textContent = "Paused \u2014 P/Esc to resume";
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function updateHud() {
    scoreEl.textContent = "Score: " + score;
    const hs = Math.max(score, getHighScore());
    win.content.querySelector("#pac-hi").textContent = "Hi: " + hs;
    let icons = "";
    for (let i = 0; i < lives; i++) icons += "\u{1F7E2}";
    livesEl.textContent = icons;
  }

  function getTick() {
    const reduction = Math.floor(score / 500) * 5;
    return Math.max(BASE_TICK - reduction, 50);
  }

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    const k = e.key;
    const dirMap = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
      A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
    };
    if (dirMap[k]) {
      e.preventDefault();
      pac.nextDir = dirMap[k];
      if (keyQueue.length < 3) keyQueue.push(dirMap[k]);
    } else if (k === "p" || k === "P" || k === "Escape") {
      e.preventDefault();
      if (over || won) reset();
      else if (paused) start();
      else pause();
    } else if (k === "r" || k === "R") {
      e.preventDefault();
      reset();
    }
  }

  /* ---------------- main loop ---------------- */

  function loop(now) {
    if (!win || paused || over || won) { raf = null; draw(); return; }
    const dt = now - lastTime;
    lastTime = now;
    accumulator += dt;
    const tick = getTick();
    while (accumulator >= tick) {
      accumulator -= tick;
      tickOnce();
      animFrame++;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function tickOnce() {
    if (deathTimer > 0) { deathTimer--; if (deathTimer === 0) respawnAfterDeath(); return; }

    if (pac.nextDir) {
      if (tryMove(pac, pac.nextDir)) { pac.dir = pac.nextDir; pac.nextDir = null; }
    }
    tryMove(pac, pac.dir);

    const pk = K(pac.x, pac.y);
    if (dots.delete(pk)) { score += 10; totalDots--; updateHud(); }
    else if (pellets.delete(pk)) { score += 50; totalDots--; frightTimer = FRIGHT_DURATION; updateHud(); }

    if (frightTimer > 0) frightTimer--;

    for (const g of ghosts) {
      if (g.state === "home") {
        g.homeTimer--;
        if (g.homeTimer <= 0) { g.state = "alive"; continue; }
        bounceInHome(g);
        continue;
      }
      const want = ghostDir(g);
      tryMove(g, want);

      if (g.x === pac.x && g.y === pac.y) {
        if (frightTimer > 0 && g.state === "alive") {
          g.state = "home"; g.homeTimer = GHOST_HOME_TICKS;
          score += 200; updateHud();
        } else if (g.state === "alive") {
          death(); return;
        }
      }
    }

    if (totalDots <= 0) {
      won = true; stop();
      const hs = Math.max(score, getHighScore());
      setHighScore(hs);
      msgEl.textContent = "You win! Score: " + score + " \u00b7 R to play again";
    }
  }

  function bounceInHome(g) {
    const opts = openNeighbors(g);
    if (opts.length) {
      const d = opts[Math.floor(Math.random() * opts.length)];
      tryMove(g, d);
    }
  }

  /* ---------------- movement ---------------- */

  function openNeighbors(pos) {
    const out = [];
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      if (open.has(K(pos.x + d.x, pos.y + d.y))) out.push(d);
    }
    return out;
  }

  function tryMove(entity, want) {
    const nx = entity.x + want.x, ny = entity.y + want.y;
    if (open.has(K(nx, ny))) { entity.x = nx; entity.y = ny; entity.dir = want; return true; }
    return false;
  }

  /* ---------------- ghost AI ---------------- */

  function ghostDir(g) {
    const opts = openNeighbors(g).filter(d => !(d.x === -g.dir.x && d.y === -g.dir.y));
    const pool = opts.length ? opts : openNeighbors(g);

    if (frightTimer > 0) {
      return pool[Math.floor(Math.random() * pool.length)] || g.dir;
    }

    let targets;
    switch (g.type) {
      case "chase":
        targets = pool.map(d => ({
          d, score: (pac.x - (g.x + d.x)) ** 2 + (pac.y - (g.y + d.y)) ** 2,
        }));
        targets.sort((a, b) => a.score - b.score);
        return targets[0].d;

      case "ambush": {
        const tx = pac.x + pac.dir.x * 4;
        const ty = pac.y + pac.dir.y * 4;
        targets = pool.map(d => ({
          d, score: (tx - (g.x + d.x)) ** 2 + (ty - (g.y + d.y)) ** 2,
        }));
        targets.sort((a, b) => a.score - b.score);
        return targets[0].d;
      }

      case "fast":
        if (Math.random() < 0.4) return pool[Math.floor(Math.random() * pool.length)] || g.dir;
        targets = pool.map(d => ({
          d, score: (pac.x - (g.x + d.x)) ** 2 + (pac.y - (g.y + d.y)) ** 2,
        }));
        targets.sort((a, b) => a.score - b.score);
        return targets[0].d;

      case "wander":
      default:
        if (Math.random() < 0.6) return pool[Math.floor(Math.random() * pool.length)] || g.dir;
        targets = pool.map(d => ({
          d, score: (pac.x - (g.x + d.x)) ** 2 + (pac.y - (g.y + d.y)) ** 2,
        }));
        targets.sort((a, b) => a.score - b.score);
        return targets[0].d;
    }
  }

  function death() {
    lives--;
    updateHud();
    if (lives <= 0) {
      over = true; stop();
      const hs = Math.max(score, getHighScore());
      setHighScore(hs);
      draw();
      msgEl.textContent = "Game Over \u2014 Score: " + score + " \u00b7 Best: " + hs + " \u00b7 R to restart";
      return;
    }
    deathTimer = 40;
    frightTimer = 0;
    draw();
  }

  function respawnAfterDeath() {
    pac.x = 1; pac.y = 1; pac.dir = { x: 1, y: 0 }; pac.nextDir = null;
    const sx = Math.floor(mazeW / 2), sy = Math.floor(mazeH / 2);
    for (const g of ghosts) { g.x = sx; g.y = sy; g.state = "home"; g.homeTimer = GHOST_HOME_TICKS; }
    keyQueue = [];
    start();
  }

  /* ---------------- drawing ---------------- */

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a1a4e";
    for (let x = 0; x < mazeW; x++) {
      for (let y = 0; y < mazeH; y++) {
        if (!open.has(K(x, y))) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    ctx.fillStyle = "#ffcc00";
    for (const k of dots) {
      const x = k % 1000, y = Math.floor(k / 1000);
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const k of pellets) {
      const x = k % 1000, y = Math.floor(k / 1000);
      const pulse = 4.8 + Math.sin(performance.now() / 200) * 1.2;
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const g of ghosts) drawGhost(g);
    drawPac();

    if (deathTimer > 0) {
      ctx.fillStyle = "rgba(255,0,0," + (0.3 + 0.1 * Math.sin(performance.now() / 80)) + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff2b2b";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = "#ffcc00";
      ctx.font = "18px monospace";
      ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 15);
      const hs = Math.max(score, getHighScore());
      ctx.fillStyle = "#00f2ff";
      ctx.fillText("Best: " + hs, canvas.width / 2, canvas.height / 2 + 40);
      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 70);
    }

    if (won) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = "#ffcc00";
      ctx.font = "18px monospace";
      ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText("Press R to play again", canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  function drawPac() {
    if (deathTimer > 0) {
      const phase = (40 - deathTimer) / 40;
      ctx.save();
      ctx.globalAlpha = 1 - phase;
      const cx = pac.x * CELL + CELL / 2;
      const cy = pac.y * CELL + CELL / 2;
      const openAngle = Math.PI * phase;
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, CELL / 2 - 1, openAngle, Math.PI * 2 - openAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    const cx = pac.x * CELL + CELL / 2;
    const cy = pac.y * CELL + CELL / 2;
    const ang = Math.atan2(pac.dir.y, pac.dir.x);
    const mouth = 0.3 + Math.sin(performance.now() / 80) * 0.2;
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, CELL / 2 - 1, ang + mouth, ang - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(g) {
    const cx = g.x * CELL + CELL / 2;
    const cy = g.y * CELL + CELL / 2;
    const r = CELL / 2 - 1;

    if (g.state === "home") {
      drawGhostEyes(cx, cy, g.dir, 1);
      return;
    }

    const frightened = frightTimer > 0;
    const blink = frightened && frightTimer < 120 && animFrame % 8 < 4;
    ctx.fillStyle = blink ? "#fff" : (frightened ? "#1625ff" : g.color);

    ctx.beginPath();
    ctx.arc(cx, cy - 1, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + r);
    const wave = Math.sin(performance.now() / 100) * 2;
    ctx.lineTo(cx + r * 0.5, cy + r - 2 + wave);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.5, cy + r - 2 - wave);
    ctx.lineTo(cx - r, cy + r);
    ctx.lineTo(cx - r, cy - 1);
    ctx.closePath();
    ctx.fill();

    if (frightened) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx - 2.5, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 2.5, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawGhostEyes(cx, cy, g.dir, 0);
    }
  }

  function drawGhostEyes(cx, cy, dir, scale) {
    const dx = dir.x * 2 * scale, dy = dir.y * 2 * scale;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 3 + dx, cy - 2 + dy, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 3 + dx, cy - 2 + dy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1733a8";
    ctx.beginPath();
    ctx.arc(cx - 3 + dx * 1.4, cy - 2 + dy * 1.4, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 3 + dx * 1.4, cy - 2 + dy * 1.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.pacman = app;
})();
