/* =========================================================
 * NeptuneOS — Tetris
 * Classic Tetris with ghost piece, next preview,
 * scoring, levels, and visual polish.
 * ========================================================= */
(function () {
  "use strict";

  const HS_KEY = "neptuneos.tetris.highscore";
  const COLS = 10, ROWS = 20, CELL = 28;

  const SHAPES = {
    I: { blocks: [[0,0],[1,0],[2,0],[3,0]], color: "#00f0f0" },
    O: { blocks: [[0,0],[1,0],[0,1],[1,1]], color: "#f0f000" },
    T: { blocks: [[0,0],[1,0],[2,0],[1,1]], color: "#a000f0" },
    S: { blocks: [[1,0],[2,0],[0,1],[1,1]], color: "#00f000" },
    Z: { blocks: [[0,0],[1,0],[1,1],[2,1]], color: "#f00000" },
    J: { blocks: [[0,0],[1,0],[2,0],[0,1]], color: "#0000f0" },
    L: { blocks: [[0,0],[1,0],[2,0],[2,1]], color: "#f0a000" },
  };
  const SHAPE_KEYS = Object.keys(SHAPES);

  const LINE_SCORES = [0, 100, 300, 500, 800];
  const LINES_PER_LEVEL = 10;
  const BASE_DROP_MS = 800;
  const MIN_DROP_MS = 80;
  const DROP_SPEED_STEP = 70;
  const SOFT_DROP_MS = 50;

  let win = null, canvas = null, ctx = null;
  let scoreEl = null, levelEl = null, linesEl = null;
  let raf = null;
  let board = [], current = null, nextPiece = null;
  let score = 0, level = 1, linesCleared = 0, highScore = 0;
  let running = false, paused = false, over = false;
  let lastDrop = 0, dropAccum = 0;
  let softDropping = false;
  let flashRows = [], flashTimer = 0, flashing = false;

  function playSound(name) {
    try {
      if (OS.sfx && OS.sfx[name]) OS.sfx[name]();
    } catch (_) {}
  }

  const app = {
    id: "tetris",
    name: "Tetris",
    icon: "assets/icons/tetris.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Tetris",
        icon: this.icon,
        width: 520,
        height: 580,
        resizable: true,
        app: "tetris",
        onClose: () => { stop(); document.removeEventListener("keydown", onKey); if (tetrisRO) tetrisRO.disconnect(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="tetris-score">Score: 0</span>' +
        '    <span id="tetris-level">Level: 1</span>' +
        '    <span id="tetris-lines">Lines: 0</span>' +
        '  </div>' +
        '  <div style="display:flex;gap:8px;flex:1;min-height:0;">' +
        '    <canvas id="tetris-canvas"></canvas>' +
        '    <div id="tetris-sidebar" style="display:flex;flex-direction:column;gap:8px;min-width:100px;">' +
        '      <div style="font-size:11px;color:#aaa;text-align:center;">NEXT</div>' +
        '      <canvas id="tetris-next" width="100" height="100" style="background:#111;border:1px solid #333;border-radius:4px;"></canvas>' +
        '      <div id="tetris-msg" style="font-size:10px;color:#888;text-align:center;margin-top:auto;">Arrows/WASD: move\nSpace: hard drop\nP/Esc: pause\nR: restart</div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      canvas = win.content.querySelector("#tetris-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#tetris-score");
      levelEl = win.content.querySelector("#tetris-level");
      linesEl = win.content.querySelector("#tetris-lines");

      /* Touch D-Pad */
      if (OS.createDPad) {
        OS.createDPad({
          parent: win.content.querySelector(".game-wrap"),
          onDir: function (dir) {
            var map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
            if (map[dir]) onKey({ key: map[dir], preventDefault: function () {} });
          },
          actions: [
            { id: "space", label: "DROP" },
            { id: "pause", label: "P" },
            { id: "restart", label: "R" },
          ],
          onAction: function (a) {
            if (a === "space") onKey({ key: " ", preventDefault: function () {} });
            else if (a === "pause") onKey({ key: "p", preventDefault: function () {} });
            else if (a === "restart") onKey({ key: "r", preventDefault: function () {} });
          },
          compact: true,
        });
      }

      highScore = parseInt(localStorage.getItem(HS_KEY) || "0", 10);

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("keydown", onKey);

      var tetrisRO = new ResizeObserver(() => { resize(); });
      if (win.el) tetrisRO.observe(win.el);

      reset();
    },
  };

  /* ---------- layout ---------- */

  function resize() {
    if (!win || !canvas) return;
    const wrap = canvas.parentElement;
    const availW = (wrap.clientWidth || 500) - 116;
    const availH = wrap.clientHeight || 520;
    const scaleX = availW / (COLS * CELL);
    const scaleY = availH / (ROWS * CELL);
    const s = Math.max(1, Math.min(scaleX, scaleY));
    const cw = Math.floor(COLS * CELL * s);
    const ch = Math.floor(ROWS * CELL * s);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    canvas._scale = s;
    draw();
  }

  /* ---------- controls ---------- */

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    const k = e.key;

    if (over) {
      if (k === "r" || k === "R") { e.preventDefault(); reset(); }
      return;
    }

    if (k === "p" || k === "P" || k === "Escape") {
      e.preventDefault();
      if (paused) resume(); else pause();
      return;
    }

    if (k === "r" || k === "R") { e.preventDefault(); reset(); return; }

    if (!running) return;

    if (k === "ArrowLeft" || k === "a" || k === "A") {
      e.preventDefault(); move(-1, 0);
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      e.preventDefault(); move(1, 0);
    } else if (k === "ArrowDown" || k === "s" || k === "S") {
      e.preventDefault(); softDropping = true;
    } else if (k === "ArrowUp" || k === "w" || k === "W") {
      e.preventDefault(); rotate(1);
    } else if (k === " ") {
      e.preventDefault(); hardDrop();
    }
  }

  function onKeyRelease(e) {
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      softDropping = false;
    }
  }
  document.addEventListener("keyup", onKeyRelease);

  /* ---------- game logic ---------- */

  function reset() {
    stop();
    board = [];
    for (let y = 0; y < ROWS; y++) {
      board.push(new Array(COLS).fill(null));
    }
    score = 0; level = 1; linesCleared = 0;
    paused = false; over = false; flashing = false;
    flashRows = [];
    scoreEl.textContent = "Score: 0";
    levelEl.textContent = "Level: 1";
    linesEl.textContent = "Lines: 0";
    nextPiece = randomPiece();
    spawnPiece();
    start();
  }

  function start() {
    if (over) return;
    paused = false;
    running = true;
    lastDrop = performance.now();
    dropAccum = 0;
    loop();
  }

  function pause() {
    if (!running) return;
    paused = true;
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    draw();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    running = true;
    lastDrop = performance.now();
    dropAccum = 0;
    loop();
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function randomPiece() {
    const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    return { key: key, blocks: SHAPES[key].blocks.map(b => [b[0], b[1]]), color: SHAPES[key].color };
  }

  function spawnPiece() {
    current = nextPiece || randomPiece();
    nextPiece = randomPiece();
    current.x = 3;
    current.y = 0;
    current.rotation = 0;
    if (!isValid(current.blocks, current.x, current.y)) {
      gameOver();
    }
  }

  function getBlocks(piece, px, py) {
    return piece.blocks.map(b => [b[0] + px, b[1] + py]);
  }

  function isValid(blocks, px, py) {
    for (const [bx, by] of blocks) {
      const nx = bx + px, ny = by + py;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
    return true;
  }

  function move(dx, dy) {
    if (!current) return false;
    if (isValid(current.blocks, current.x + dx, current.y + dy)) {
      current.x += dx;
      current.y += dy;
      return true;
    }
    return false;
  }

  function rotate(dir) {
    if (!current || current.key === "O") return;
    const newBlocks = current.blocks.map(([bx, by]) => {
      if (dir === 1) return [-by, bx];
      return [by, -bx];
    });
    const minX = Math.min(...newBlocks.map(b => b[0]));
    const minY = Math.min(...newBlocks.map(b => b[1]));
    const normalized = newBlocks.map(b => [b[0] - minX, b[1] - minY]);
    const oldBlocks = current.blocks;
    current.blocks = normalized;
    if (!isValid(current.blocks, current.x, current.y)) {
      const kicks = [[-1,0],[1,0],[0,-1],[-2,0],[2,0]];
      let kicked = false;
      for (const [kx, ky] of kicks) {
        if (isValid(current.blocks, current.x + kx, current.y + ky)) {
          current.x += kx; current.y += ky; kicked = true; break;
        }
      }
      if (!kicked) current.blocks = oldBlocks;
    }
  }

  function hardDrop() {
    if (!current) return;
    let dropped = 0;
    while (isValid(current.blocks, current.x, current.y + 1)) {
      current.y++; dropped++;
    }
    score += dropped * 2;
    scoreEl.textContent = "Score: " + score;
    lockPiece();
  }

  function ghostY() {
    if (!current) return 0;
    let gy = current.y;
    while (isValid(current.blocks, current.x, gy + 1)) gy++;
    return gy;
  }

  function lockPiece() {
    if (!current) return;
    const blocks = getBlocks(current.blocks, current.x, current.y);
    for (const [bx, by] of blocks) {
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        board[by][bx] = current.color;
      }
    }
    checkLines();
  }

  function checkLines() {
    const full = [];
    for (let y = 0; y < ROWS; y++) {
      if (board[y].every(c => c !== null)) full.push(y);
    }
    if (full.length) {
      flashRows = full;
      flashTimer = 0;
      flashing = true;
      playSound("blip");
    } else {
      spawnPiece();
    }
  }

  function removeLines(rows) {
    for (const y of rows.sort((a, b) => b - a)) {
      board.splice(y, 1);
      board.unshift(new Array(COLS).fill(null));
    }
    const n = rows.length;
    linesCleared += n;
    level = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
    score += LINE_SCORES[n] * level;
    scoreEl.textContent = "Score: " + score;
    levelEl.textContent = "Level: " + level;
    linesEl.textContent = "Lines: " + linesCleared;
  }

  function dropInterval() {
    return Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * DROP_SPEED_STEP);
  }

  function gameOver() {
    over = true;
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    playSound("beepNow");
    if (score > highScore) {
      highScore = score;
      try { localStorage.setItem(HS_KEY, String(highScore)); } catch (_) {}
    }
    draw();
  }

  /* ---------- loop ---------- */

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!ts) ts = performance.now();

    if (flashing) {
      flashTimer += ts - (lastDrop || ts);
      if (flashTimer > 250) {
        flashing = false;
        removeLines(flashRows);
        flashRows = [];
        spawnPiece();
      }
      lastDrop = ts;
      draw();
      return;
    }

    const dt = ts - lastDrop;
    lastDrop = ts;
    dropAccum += dt;
    const interval = softDropping ? SOFT_DROP_MS : dropInterval();
    while (dropAccum >= interval) {
      dropAccum -= interval;
      if (!move(0, 1)) {
        lockPiece();
        if (over) return;
        dropAccum = 0;
        break;
      }
      if (softDropping) { score += 1; scoreEl.textContent = "Score: " + score; }
    }
    draw();
  }

  /* ---------- drawing ---------- */

  function draw() {
    if (!ctx) return;
    const s = canvas._scale || 1;
    const W = COLS * CELL * s;
    const H = ROWS * CELL * s;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
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

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          if (flashing && flashRows.includes(y)) {
            const flash = Math.sin(flashTimer * 0.02) > 0;
            ctx.fillStyle = flash ? "#ffffff" : board[y][x];
          } else {
            ctx.fillStyle = board[y][x];
          }
          drawCell(x, y, s, 1);
        }
      }
    }

    if (current && !over) {
      const gy = ghostY();
      if (gy !== current.y) {
        const ghostBlocks = getBlocks(current.blocks, current.x, gy);
        for (const [bx, by] of ghostBlocks) {
          if (by >= 0) {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(bx * CELL * s + 1, by * CELL * s + 1, CELL * s - 2, CELL * s - 2);
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx * CELL * s + 1.5, by * CELL * s + 1.5, CELL * s - 3, CELL * s - 3);
          }
        }
      }
      const blocks = getBlocks(current.blocks, current.x, current.y);
      ctx.fillStyle = current.color;
      for (const [bx, by] of blocks) {
        if (by >= 0) drawCell(bx, by, s, 1);
      }
    }

    drawNext(s);

    if (paused && !over) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + (24 * s) + "px Tahoma, sans-serif";
      ctx.fillText("PAUSED", W / 2, H / 2);
      ctx.font = (12 * s) + "px Tahoma, sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText("P / Esc to resume", W / 2, H / 2 + 28 * s);
    }

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff4444";
      ctx.font = "bold " + (28 * s) + "px Tahoma, sans-serif";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 24 * s);
      ctx.fillStyle = "#fff";
      ctx.font = (14 * s) + "px Tahoma, sans-serif";
      ctx.fillText("Score: " + score, W / 2, H / 2 + 4 * s);
      ctx.fillText("Best: " + highScore, W / 2, H / 2 + 22 * s);
      ctx.fillStyle = "#aaa";
      ctx.font = (12 * s) + "px Tahoma, sans-serif";
      ctx.fillText("Press R to restart", W / 2, H / 2 + 46 * s);
    }
  }

  function drawCell(x, y, s, pad) {
    const p = pad * s;
    const cx = x * CELL * s + p;
    const cy = y * CELL * s + p;
    const cw = CELL * s - p * 2;
    const ch = CELL * s - p * 2;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(cx, cy, cw, ch * 0.35);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(cx, cy + ch * 0.65, cw, ch * 0.35);
  }

  function drawNext(s) {
    const nextCanvas = win && win.content.querySelector("#tetris-next");
    if (!nextCanvas) return;
    const nctx = nextCanvas.getContext("2d");
    const nw = nextCanvas.width, nh = nextCanvas.height;
    nctx.fillStyle = "#111";
    nctx.fillRect(0, 0, nw, nh);
    if (!nextPiece) return;
    const blocks = nextPiece.blocks;
    const minX = Math.min(...blocks.map(b => b[0]));
    const maxX = Math.max(...blocks.map(b => b[0]));
    const minY = Math.min(...blocks.map(b => b[1]));
    const maxY = Math.max(...blocks.map(b => b[1]));
    const pw = maxX - minX + 1;
    const ph = maxY - minY + 1;
    const cs = Math.min((nw - 16) / pw, (nh - 16) / ph);
    const ox = (nw - pw * cs) / 2 - minX * cs;
    const oy = (nh - ph * cs) / 2 - minY * cs;
    nctx.fillStyle = nextPiece.color;
    for (const [bx, by] of blocks) {
      const cx = ox + bx * cs + 1;
      const cy = oy + by * cs + 1;
      nctx.fillRect(cx, cy, cs - 2, cs - 2);
      nctx.fillStyle = "rgba(255,255,255,0.15)";
      nctx.fillRect(cx, cy, cs - 2, (cs - 2) * 0.35);
      nctx.fillStyle = nextPiece.color;
    }
  }

  /* ---------- registration ---------- */

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.tetris = app;
})();
