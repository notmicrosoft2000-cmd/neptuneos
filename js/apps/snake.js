/* =========================================================
 * NeptuneOS — Snake (Rewrite)
 * Grid snake with WASD/Arrow controls, speed scaling,
 * high scores, pause, visual polish, and sound effects.
 * ========================================================= */
(function () {
  "use strict";

  const HS_KEY = "neptuneos.snake.highscore";
  const COLS = 28, ROWS = 20, CELL = 20;
  const BASE_SPEED = 140, MIN_SPEED = 55, SPEED_STEP = 8;
  const FOOD_PER_LEVEL = 5;
  const POINTS_PER_FOOD = 10;

  let win = null, canvas = null, ctx = null;
  let scoreEl = null, msgEl = null;
  let timer = null, raf = null;
  let snake = [], dir = { x: 1, y: 0 }, queue = [];
  let food = null, score = 0, highScore = 0;
  let running = false, paused = false, over = false;
  let particles = [];
  let lastTick = 0, tickAccum = 0;
  let snakeTrail = [];

  function playSound(name) {
    try {
      if (OS.sfx && OS.sfx[name]) OS.sfx[name]();
    } catch (_) { /* no audio available */ }
  }

  const app = {
    id: "snake",
    name: "Snake",
    icon: "assets/icons/snake.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Snake",
        icon: this.icon,
        width: 580,
        height: 430,
        resizable: true,
        app: "snake",
        onClose: () => { stop(); document.removeEventListener("keydown", onKey); if (snakeRO) snakeRO.disconnect(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="snake-score">Score: 0</span>' +
        '    <span id="snake-msg">Arrow keys / WASD to move &middot; P/Esc to pause &middot; R to restart</span>' +
        '  </div>' +
        '  <canvas id="snake-canvas"></canvas>' +
        '</div>';

      canvas = win.content.querySelector("#snake-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#snake-score");
      msgEl = win.content.querySelector("#snake-msg");

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

      highScore = parseInt(localStorage.getItem(HS_KEY) || "0", 10);

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("keydown", onKey);

      /* Re-scale when window container changes size (maximize/restore) */
      var snakeRO = new ResizeObserver(() => { resize(); });
      if (win.el) snakeRO.observe(win.el);

      reset();
    },

    onWindowClose() {
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKey);
      stop();
    },
  };

  /* ---------- layout ---------- */

  function resize() {
    if (!win || !canvas) return;
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth || 560;
    const h = wrap.clientHeight || 380;
    const scale = Math.max(1, Math.floor(Math.min(w / (COLS * CELL), h / (ROWS * CELL))));
    const cw = COLS * CELL * scale;
    const ch = ROWS * CELL * scale;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    canvas._scale = scale;
    draw();
  }

  /* ---------- controls ---------- */

  const DIR_MAP = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
    a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
  };

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    const k = e.key;

    const d = DIR_MAP[k];
    if (d) {
      e.preventDefault();
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (!(d.x === -last.x && d.y === -last.y)) {
        if (queue.length < 3) queue.push(d);
      }
      if (!running && !over) start();
      return;
    }

    if (k === "p" || k === "P" || k === "Escape") {
      e.preventDefault();
      if (over) reset();
      else if (running) pause();
      else if (!running && !over) start();
      return;
    }

    if (k === "r" || k === "R") {
      e.preventDefault();
      reset();
    }
  }

  /* ---------- game logic ---------- */

  function reset() {
    stop();
    particles = [];
    snakeTrail = [];
    snake = [];
    for (let i = 0; i < 4; i++) snake.push({ x: 6 - i, y: Math.floor(ROWS / 2) });
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    paused = false;
    over = false;
    placeFood();
    scoreEl.textContent = "Score: 0";
    msgEl.textContent = "Arrow keys / WASD to move \u00b7 P/Esc to pause \u00b7 R to restart";
    start();
    draw();
  }

  function start() {
    if (over) return;
    paused = false;
    running = true;
    msgEl.textContent = "Arrow keys / WASD to move \u00b7 P/Esc to pause \u00b7 R to restart";
    lastTick = performance.now();
    tickAccum = 0;
    loop();
  }

  function pause() {
    if (!running) return;
    paused = true;
    running = false;
    msgEl.textContent = "Paused \u2014 P/Esc to resume";
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    draw();
  }

  function stop() {
    running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function tick() {
    if (over || paused) return;
    if (queue.length) dir = queue.shift();

    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    /* wrap around edges */
    const wx = (nx + COLS) % COLS;
    const wy = (ny + ROWS) % ROWS;

    /* self collision */
    if (snake.some(s => s.x === wx && s.y === wy)) {
      die();
      return;
    }

    snake.unshift({ x: wx, y: wy });

    if (food && wx === food.x && wy === food.y) {
      score += POINTS_PER_FOOD;
      scoreEl.textContent = "Score: " + score;
      playSound("blip");
      spawnParticles(food.x, food.y);
      placeFood();
      updateSpeed();
    } else {
      snake.pop();
    }
  }

  function currentSpeed() {
    const level = Math.floor(score / (POINTS_PER_FOOD * FOOD_PER_LEVEL));
    return Math.max(MIN_SPEED, BASE_SPEED - level * SPEED_STEP);
  }

  function updateSpeed() {
    /* no-op during rAF loop; speed is read each tick */
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!ts) ts = performance.now();
    const dt = ts - lastTick;
    lastTick = ts;
    tickAccum += dt;
    while (tickAccum >= currentSpeed()) {
      tickAccum -= currentSpeed();
      tick();
      if (over || paused) return;
    }
    draw();
  }

  function die() {
    over = true;
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    playSound("beepNow");
    if (score > highScore) {
      highScore = score;
      try { localStorage.setItem(HS_KEY, String(highScore)); } catch (_) {}
    }
    msgEl.textContent = "Game Over \u2014 press R to restart";
    draw();
  }

  /* ---------- food ---------- */

  function placeFood() {
    const occupied = new Set(snake.map(s => s.x + "," + s.y));
    const empty = [];
    for (let x = 0; x < COLS; x++)
      for (let y = 0; y < ROWS; y++)
        if (!occupied.has(x + "," + y)) empty.push({ x, y });
    if (!empty.length) { over = true; return; }
    food = empty[Math.floor(Math.random() * empty.length)];
  }

  /* ---------- particles ---------- */

  function spawnParticles(cx, cy) {
    const s = canvas._scale || 1;
    const px = (cx + 0.5) * CELL * s;
    const py = (cy + 0.5) * CELL * s;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 0.003;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  /* ---------- drawing ---------- */

  let lastFrame = 0;

  function draw() {
    if (!ctx) return;
    const s = canvas._scale || 1;
    const W = COLS * CELL * s;
    const H = ROWS * CELL * s;

    /* background */
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    /* subtle grid */
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL * s + 0.5, 0);
      ctx.lineTo(x * CELL * s + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL * s + 0.5);
      ctx.lineTo(W, y * CELL * s + 0.5);
      ctx.stroke();
    }

    /* food glow */
    if (food) {
      const fx = (food.x + 0.5) * CELL * s;
      const fy = (food.y + 0.5) * CELL * s;
      const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, CELL * s * 1.5);
      glow.addColorStop(0, "rgba(255,60,60,0.35)");
      glow.addColorStop(1, "rgba(255,60,60,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(fx - CELL * s * 1.5, fy - CELL * s * 1.5, CELL * s * 3, CELL * s * 3);

      const pad = Math.max(1, 2 * s);
      ctx.fillStyle = "#ff3c3c";
      roundedRect(food.x * CELL * s + pad, food.y * CELL * s + pad,
        CELL * s - pad * 2, CELL * s - pad * 2, 4 * s);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(fx - 2 * s, fy - 2 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    /* snake body */
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const t = i / Math.max(1, snake.length - 1);
      const r = Math.round(58 + (120 - 58) * (1 - t));
      const g = Math.round(200 + (220 - 200) * (1 - t));
      const b = Math.round(48 + (80 - 48) * (1 - t));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = Math.max(1, (i === 0 ? 1 : 2) * s);
      roundedRect(seg.x * CELL * s + pad, seg.y * CELL * s + pad,
        CELL * s - pad * 2, CELL * s - pad * 2, 5 * s);
      ctx.fill();

      if (i === 0) {
        /* head highlight */
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        roundedRect(seg.x * CELL * s + pad + 2 * s, seg.y * CELL * s + pad + 2 * s,
          CELL * s - pad * 2 - 6 * s, CELL * s - pad * 2 - 6 * s, 3 * s);
        ctx.fill();

        /* eyes */
        const eyeSize = Math.max(1.5, 2.5 * s);
        const cx = (seg.x + 0.5) * CELL * s;
        const cy = (seg.y + 0.5) * CELL * s;
        const offset = 3 * s;
        const ex = dir.x * offset;
        const ey = dir.y * offset;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx - offset * 0.3 + ex, cy - offset * 0.3 + ey, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + offset * 0.3 + ex, cy + offset * 0.3 + ey, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(cx - offset * 0.3 + ex * 1.2, cy - offset * 0.3 + ey * 1.2, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + offset * 0.3 + ex * 1.2, cy + offset * 0.3 + ey * 1.2, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* particles */
    const now = performance.now();
    const dt = now - (lastFrame || now);
    lastFrame = now;
    updateParticles(dt);
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = "#ff6644";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* game over overlay */
    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#ff4444";
      ctx.font = "bold " + (28 * s) + "px Tahoma, sans-serif";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 20 * s);

      ctx.fillStyle = "#fff";
      ctx.font = (14 * s) + "px Tahoma, sans-serif";
      ctx.fillText("Score: " + score + "  |  Best: " + highScore, W / 2, H / 2 + 10 * s);

      ctx.fillStyle = "#aaa";
      ctx.font = (12 * s) + "px Tahoma, sans-serif";
      ctx.fillText("Press R to restart", W / 2, H / 2 + 35 * s);
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- registration ---------- */

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.snake = app;
})();
