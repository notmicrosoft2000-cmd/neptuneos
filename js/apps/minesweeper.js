/* =========================================================
 * NeptuneOS — Minesweeper
 * Classic Windows XP Minesweeper clone. 9×9 beginner grid,
 * 10 mines. Left-click to reveal, right-click to flag.
 * ========================================================= */
(function () {
  "use strict";

  const COLS = 9, ROWS = 9, MINES = 10;
  const CELL = 28;

  let win = null;
  let canvas = null, ctx = null;
  let minesEl = null, timerEl = null, faceBtn = null;
  let timerHandle = null;

  let board = [];
  let revealed = [];
  let flagged = [];
  let gameOver = false;
  let gameWon = false;
  let firstClick = false;
  let timerVal = 0;
  let flagCount = 0;

  const app = {
    id: "minesweeper",
    name: "Minesweeper",
    icon: "assets/icons/minesweeper.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Minesweeper",
        icon: this.icon,
        width: COLS * CELL + 26,
        height: ROWS * CELL + 110,
        resizable: false,
        app: "minesweeper",
        onClose: () => { stopTimer(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap" style="background:#c0c0c0;border-color:#808080 #fff #fff #808080">' +
        '  <div class="ms-status">' +
        '    <div class="ms-counter" id="ms-mines">010</div>' +
        '    <div class="ms-face-wrap"><canvas id="ms-face" width="26" height="26"></canvas></div>' +
        '    <div class="ms-counter" id="ms-timer">000</div>' +
        '  </div>' +
        '  <div class="ms-grid-wrap"><canvas id="ms-canvas"></canvas></div>' +
        '</div>';

      canvas = win.content.querySelector("#ms-canvas");
      ctx = canvas.getContext("2d");
      faceBtn = win.content.querySelector("#ms-face");
      minesEl = win.content.querySelector("#ms-mines");
      timerEl = win.content.querySelector("#ms-timer");

      const faceCtx = faceBtn.getContext("2d");
      drawFace(faceCtx, "happy");

      canvas.addEventListener("click", onLeftClick);
      canvas.addEventListener("contextmenu", onRightClick);
      faceBtn.addEventListener("click", () => resetGame());

      resetGame();
    },

    onWindowClose() {
      stopTimer();
      if (canvas) {
        canvas.removeEventListener("click", onLeftClick);
        canvas.removeEventListener("contextmenu", onRightClick);
      }
      if (faceBtn) faceBtn.removeEventListener("click", resetGame);
      win = null;
    },
  };

  function resetGame() {
    stopTimer();
    board = [];
    revealed = [];
    flagged = [];
    gameOver = false;
    gameWon = false;
    firstClick = false;
    timerVal = 0;
    flagCount = 0;

    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      revealed[r] = [];
      flagged[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = 0;
        revealed[r][c] = false;
        flagged[r][c] = false;
      }
    }

    minesEl.textContent = "010";
    timerEl.textContent = "000";
    const faceCtx = faceBtn.getContext("2d");
    drawFace(faceCtx, "happy");
    resizeCanvas();
    drawBoard();
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === -1) count++;
          }
        }
        board[r][c] = count;
      }
    }
  }

  function onLeftClick(e) {
    if (gameOver || gameWon) return;
    const { r, c } = cellFromEvent(e);
    if (r < 0 || c < 0) return;
    if (flagged[r][c] || revealed[r][c]) return;

    if (!firstClick) {
      firstClick = true;
      placeMines(r, c);
      startTimer();
    }

    if (board[r][c] === -1) {
      loseGame(r, c);
      return;
    }

    floodReveal(r, c);
    checkWin();
    drawBoard();
  }

  function onRightClick(e) {
    e.preventDefault();
    if (gameOver || gameWon) return;
    const { r, c } = cellFromEvent(e);
    if (r < 0 || c < 0) return;
    if (revealed[r][c]) return;

    if (flagged[r][c]) {
      flagged[r][c] = false;
      flagCount--;
    } else {
      flagged[r][c] = true;
      flagCount++;
    }
    minesEl.textContent = String(MINES - flagCount).padStart(3, "0");
    drawBoard();
  }

  function floodReveal(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          floodReveal(r + dr, c + dc);
        }
      }
    }
  }

  function loseGame(hitR, hitC) {
    gameOver = true;
    stopTimer();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        revealed[r][c] = true;
      }
    }
    board[hitR][hitC] = -2;
    const faceCtx = faceBtn.getContext("2d");
    drawFace(faceCtx, "dead");
    drawBoard();
  }

  function checkWin() {
    let unrevealed = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!revealed[r][c]) unrevealed++;
      }
    }
    if (unrevealed === MINES) {
      gameWon = true;
      stopTimer();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c] === -1) flagged[r][c] = true;
        }
      }
      flagCount = MINES;
      minesEl.textContent = "000";
      const faceCtx = faceBtn.getContext("2d");
      drawFace(faceCtx, "cool");
      drawBoard();
    }
  }

  function startTimer() {
    timerVal = 0;
    timerEl.textContent = "000";
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      timerVal++;
      if (timerVal > 999) timerVal = 999;
      timerEl.textContent = String(timerVal).padStart(3, "0");
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
  }

  function resizeCanvas() {
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
  }

  function drawBoard() {
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        if (!revealed[r][c]) {
          drawUnrevealedCell(x, y);
          if (flagged[r][c]) drawFlag(x, y);
        } else {
          drawRevealedCell(x, y, board[r][c]);
        }
      }
    }
  }

  function drawUnrevealedCell(x, y) {
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + CELL, y + 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + 1, y + CELL);
    ctx.stroke();
    ctx.strokeStyle = "#808080";
    ctx.beginPath();
    ctx.moveTo(x + CELL - 1, y + CELL);
    ctx.lineTo(x + CELL - 1, y + CELL - 1);
    ctx.lineTo(x, y + CELL - 1);
    ctx.stroke();
  }

  function drawRevealedCell(x, y, val) {
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);

    if (val === -1 || val === -2) {
      ctx.fillStyle = val === -2 ? "#ff0000" : "#c0c0c0";
      ctx.fillRect(x, y, CELL, CELL);
      drawMine(x, y, val === -2);
    } else if (val > 0) {
      const colors = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];
      ctx.fillStyle = colors[val] || "#000";
      ctx.font = "bold 16px Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), x + CELL / 2, y + CELL / 2 + 1);
    }
  }

  function drawMine(x, y, isHit) {
    const cx = x + CELL / 2, cy = y + CELL / 2;
    ctx.fillStyle = "#000";
    const spikes = [[0, -8], [0, 8], [-8, 0], [8, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]];
    for (const [dx, dy] of spikes) {
      ctx.fillRect(cx + dx - 1, cy + dy - 1, 3, 3);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 2, cy - 2, 2, 2);
    if (isHit) {
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + CELL, y + CELL);
      ctx.moveTo(x + CELL, y);
      ctx.lineTo(x, y + CELL);
      ctx.stroke();
    }
  }

  function drawFlag(x, y) {
    const cx = x + CELL / 2, cy = y + CELL / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(cx - 1, cy - 6, 2, 14);
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy - 6);
    ctx.lineTo(cx + 8, cy - 2);
    ctx.lineTo(cx + 1, cy + 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.fillRect(cx - 4, cy + 7, 10, 3);
  }

  function drawFace(state) {
    const s = 26, h = s / 2;
    const c = state === "dead" ? faceBtn.getContext("2d") : ctx;

    const fc = faceBtn.getContext("2d");
    fc.fillStyle = "#ffff00";
    fc.beginPath();
    fc.arc(h, h, 10, 0, Math.PI * 2);
    fc.fill();
    fc.strokeStyle = "#000";
    fc.lineWidth = 1.5;
    fc.stroke();

    fc.fillStyle = "#000";
    if (state === "dead") {
      fc.font = "bold 10px sans-serif";
      fc.textAlign = "center";
      fc.textBaseline = "middle";
      fc.fillText("X", h - 4, h - 2);
      fc.fillText("X", h + 4, h - 2);
      fc.beginPath();
      fc.arc(h, h + 5, 4, 0, Math.PI);
      fc.stroke();
    } else if (state === "cool") {
      fc.strokeStyle = "#000";
      fc.lineWidth = 2;
      fc.beginPath();
      fc.moveTo(h - 6, h - 1);
      fc.lineTo(h - 3, h + 1);
      fc.lineTo(h - 1, h - 2);
      fc.moveTo(h + 6, h - 1);
      fc.lineTo(h + 3, h + 1);
      fc.lineTo(h + 1, h - 2);
      fc.stroke();
      fc.beginPath();
      fc.arc(h, h + 4, 4, 0, Math.PI);
      fc.stroke();
    } else {
      fc.fillRect(h - 4, h - 3, 2, 3);
      fc.fillRect(h + 2, h - 3, 2, 3);
      fc.beginPath();
      fc.arc(h, h + 2, 4, 0.1, Math.PI - 0.1);
      fc.stroke();
    }
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.minesweeper = app;
})();
