/* =========================================================
 * NeptuneOS — Pacman
 * Arcade Pacman on a procedurally generated maze. Arrow keys
 * to steer, Space to pause, R to restart. Keyboard controls
 * work while the window is the active OS window.
 * ========================================================= */
(function () {
  "use strict";

  const W = 19, H = 19, CELL = 16;
  const TICK = 115, FRIGHT_TICKS = 10, HOME_TICKS = 6;

  let win = null;
  let canvas = null, ctx = null;
  let scoreEl = null, livesEl = null, msgEl = null;
  let timer = null;

  let open = new Set();
  let dots = new Set();
  let pellets = new Set();
  let dotsLeft = 0;
  let pac = null;
  let ghosts = [];
  let score = 0, lives = 3, fright = 0;
  let paused = false, over = false, won = false;
  let deathTimer = 0;
  let keyQ = [];

  const PINK = "#ffb8de", CYAN = "#00f2ff", ORANGE = "#ffb852", RED = "#ff2b2b";

  const app = {
    id: "pacman",
    name: "Pacman",
    icon: "assets/icons/pacman.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Pacman",
        icon: this.icon,
        width: 384,
        height: 462,
        resizable: false,
        app: "pacman",
        onClose: () => { stopTimer(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="pac-score">Score: 0</span>' +
        '    <span id="pac-lives">Lives: 3</span>' +
        "  </div>" +
        '  <canvas id="pac-canvas" width="' + (W * CELL) + '" height="' + (H * CELL) + '"></canvas>' +
        '  <div class="game-status" id="pac-msg">Arrow keys to move &middot; Space to pause &middot; R to restart</div>' +
        "</div>";

      canvas = win.content.querySelector("#pac-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#pac-score");
      livesEl = win.content.querySelector("#pac-lives");
      msgEl = win.content.querySelector("#pac-msg");

      reset();
      document.addEventListener("keydown", onKey);
    },

    onWindowClose() {
      document.removeEventListener("keydown", onKey);
    },
  };

  /* ---------------- maze generation ---------------- */

  const key = (x, y) => x + "," + y;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function carve(cx, cy) {
    open.add(key(cx, cy));
    for (const d of shuffle([{ x: 0, y: -2 }, { x: 0, y: 2 }, { x: -2, y: 0 }, { x: 2, y: 0 }])) {
      const nx = cx + d.x, ny = cy + d.y;
      if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && !open.has(key(nx, ny))) {
        open.add(key(cx + d.x / 2, cy + d.y / 2));
        carve(nx, ny);
      }
    }
  }

  function buildMaze() {
    open = new Set();
    carve(1, 1);

    /* open a handful of extra walls to make loops (fewer dead ends) */
    let extra = 0;
    while (extra < 34) {
      const x = 1 + Math.floor(Math.random() * (W - 2));
      const y = 1 + Math.floor(Math.random() * (H - 2));
      if (open.has(key(x, y))) continue;
      const has = (ox, oy) => open.has(key(x + ox, y + oy));
      if ((has(-1, 0) && has(1, 0)) || (has(0, -1) && has(0, 1))) {
        open.add(key(x, y));
        extra++;
      }
    }
  }

  /* ---------------- game state ---------------- */

  function reset() {
    stopTimer();
    buildMaze();

    dots = new Set(open);
    pellets = new Set();
    const corners = [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]];
    for (const [cx, cy] of corners) {
      dots.delete(key(cx, cy));
      pellets.add(key(cx, cy));
    }
    dots.delete(key(1, 1));
    dotsLeft = dots.size + pellets.size;

    pac = { x: 1, y: 1, dir: { x: 1, y: 0 } };

    const spawn = { x: 9, y: 9 };
    const spawnDirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    ghosts = [
      { ...spawn, dir: spawnDirs[0], color: RED, state: "alive", home: 0 },
      { ...spawn, dir: spawnDirs[1], color: PINK, state: "alive", home: 0 },
      { ...spawn, dir: spawnDirs[2], color: CYAN, state: "alive", home: 0 },
      { ...spawn, dir: spawnDirs[3], color: ORANGE, state: "alive", home: 0 },
    ];

    score = 0;
    lives = 3;
    fright = 0;
    deathTimer = 0;
    paused = false;
    over = false;
    won = false;
    keyQ = [];
    updateHud();
    msgEl.textContent = "Arrow keys to move \u00b7 Space to pause \u00b7 R to restart";
    start();
  }

  function start() {
    if (over || won) return;
    if (timer) return;
    paused = false;
    timer = setInterval(tick, TICK);
  }

  function pause() {
    paused = true;
    stopTimer();
    msgEl.textContent = "Paused \u2014 Space to resume";
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function updateHud() {
    scoreEl.textContent = "Score: " + score;
    livesEl.textContent = "Lives: " + lives;
  }

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    const k = e.key;
    if (k.startsWith("Arrow")) {
      e.preventDefault();
      const d = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }[k];
      keyQ.push(d);
      if (keyQ.length > 2) keyQ.shift();
    } else if (k === " " || k === "p" || k === "P") {
      e.preventDefault();
      if (over || won) { reset(); }
      else if (paused) start();
      else pause();
    } else if (k === "r" || k === "R") {
      e.preventDefault();
      reset();
    }
  }

  /* ---------------- movement ---------------- */

  function openNeighbors(pos) {
    const out = [];
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const nx = pos.x + d.x, ny = pos.y + d.y;
      if (open.has(key(nx, ny))) out.push(d);
    }
    return out;
  }

  function moveEntity(pos, want) {
    const nx = pos.x + want.x, ny = pos.y + want.y;
    if (open.has(key(nx, ny))) {
      pos.x = nx; pos.y = ny; pos.dir = want;
      return true;
    }
    return false;
  }

  function tick() {
    if (paused || over || won) return;
    if (deathTimer > 0) {
      deathTimer--;
      if (deathTimer === 0) respawnAfterDeath();
      return;
    }

    /* pacman */
    let turned = false;
    while (keyQ.length) {
      const want = keyQ.shift();
      if (moveEntity(pac, want)) { turned = true; break; }
    }
    if (!turned) moveEntity(pac, pac.dir);

    /* dots */
    if (dots.delete(key(pac.x, pac.y))) {
      score += 10; dotsLeft--; updateHud();
    } else if (pellets.delete(key(pac.x, pac.y))) {
      score += 50; dotsLeft--; fright = FRIGHT_TICKS; updateHud();
    }

    if (fright > 0) fright--;

    /* ghosts */
    for (const g of ghosts) {
      if (g.state === "home") {
        g.home--;
        if (g.home <= 0) { g.state = "alive"; continue; }
        moveEntity(g, g.dir);
        continue;
      }
      const want = ghostDir(g);
      moveEntity(g, want);

      if (g.x === pac.x && g.y === pac.y) {
        if (fright > 0 && g.state === "alive") {
          g.state = "home"; g.home = HOME_TICKS;
          score += 200; updateHud();
        } else if (g.state === "alive") {
          death();
          return;
        }
      }
    }

    if (dotsLeft <= 0) {
      won = true;
      stopTimer();
      msgEl.textContent = "You cleared the maze \u2014 score " + score + " \u00b7 R to play again";
    }
    draw();
  }

  function ghostDir(g) {
    const opts = openNeighbors(g).filter((d) => !(d.x === -g.dir.x && d.y === -g.dir.y));
    const pool = opts.length ? opts : openNeighbors(g);
    const ddx = pac.x - g.x, ddy = pac.y - g.y;
    const dist = (d) => (d.x - ddx) * (d.x - ddx) + (d.y - ddy) * (d.y - ddy);
    if (fright > 0) {
      return pool[pool.map(dist).reduce((mi, v, i, a) => v > a[mi] ? i : mi, 0)] || g.dir;
    }
    if (Math.random() < 0.3) return pool[Math.floor(Math.random() * pool.length)];
    return pool[pool.map(dist).reduce((mi, v, i, a) => v < a[mi] ? i : mi, 0)] || g.dir;
  }

  function death() {
    lives--;
    updateHud();
    if (lives <= 0) {
      over = true;
      stopTimer();
      msgEl.textContent = "Game over \u2014 score " + score + " \u00b7 press R to restart";
      draw();
      return;
    }
    deathTimer = 4;
    fright = 0;
    msgEl.textContent = "Try again \u2014 Space to continue";
    draw();
  }

  function respawnAfterDeath() {
    pac.x = 1; pac.y = 1; pac.dir = { x: 1, y: 0 };
    for (const g of ghosts) { g.x = 9; g.y = 9; g.state = "alive"; g.home = 0; }
    keyQ = [];
    msgEl.textContent = "Arrow keys to move \u00b7 Space to pause \u00b7 R to restart";
    start();
  }

  /* ---------------- drawing ---------------- */

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W * CELL, H * CELL);

    ctx.fillStyle = "#0b3bd9";
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        if (open.has(key(x, y))) continue;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    ctx.fillStyle = "#ffd900";
    for (const k of dots) {
      const [x, y] = k.split(",").map(Number);
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const k of pellets) {
      const [x, y] = k.split(",").map(Number);
      const pulse = 4.6 + Math.sin(Date.now() / 160) * 1.2;
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGhosts();
    drawPac();
  }

  function drawPac() {
    if (deathTimer > 0 && !over) {
      /* pacman blink while respawning */
      ctx.globalAlpha = 0.35;
    }
    const cx = pac.x * CELL + CELL / 2;
    const cy = pac.y * CELL + CELL / 2;
    const ang = Math.atan2(pac.dir.y, pac.dir.x);
    const mouth = 0.34 + Math.sin(Date.now() / 90) * 0.2;
    ctx.fillStyle = "#ffd900";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, CELL / 2 - 1, ang + mouth, ang - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGhosts() {
    for (const g of ghosts) {
      const cx = g.x * CELL + CELL / 2;
      const cy = g.y * CELL + CELL / 2;
      const r = CELL / 2 - 1;

      if (g.state === "home") {
        /* eyes only */
        drawGhostEyes(cx, cy, g.dir, 1);
        continue;
      }

      const body = fright > 0 ? "#1625ff" : g.color;
      const frightened = fright > 0 && fright % 4 < 2; /* blink near the end */
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy - 1, r, Math.PI, 0);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx + r * 0.5, cy + r - 2);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.5, cy + r - 2);
      ctx.lineTo(cx - r, cy + r);
      ctx.lineTo(cx - r, cy - 1);
      ctx.closePath();
      ctx.fill();

      if (frightened) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(cx - 2, cy - 2, 2, 3);
        ctx.fillRect(cx + 1, cy - 2, 2, 3);
      } else {
        drawGhostEyes(cx, cy, g.dir, 0);
      }
    }
  }

  function drawGhostEyes(cx, cy, dir, scale) {
    const dx = dir.x * 2, dy = dir.y * 2;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 3 + dx * scale, cy - 2 + dy * scale, 3.6, 0, Math.PI * 2);
    ctx.arc(cx + 3 + dx * scale, cy - 2 + dy * scale, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1733a8";
    ctx.beginPath();
    ctx.arc(cx - 3 + dx * 2, cy - 2 + dy * 2, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 3 + dx * 2, cy - 2 + dy * 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.pacman = app;
})();
