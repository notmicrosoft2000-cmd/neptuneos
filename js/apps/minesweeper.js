/* =========================================================
 * NeptuneOS — Minesweeper
 * Classic Minesweeper with Beginner/Expert/Intermediate,
 * smooth canvas rendering, high scores, and polish.
 * ========================================================= */
(function () {
  "use strict";

  const DIFFICULTIES = {
    beginner:     { cols: 9,  rows: 9,  mines: 10, label: "Beginner" },
    intermediate: { cols: 16, rows: 16, mines: 40, label: "Intermediate" },
    expert:       { cols: 30, rows: 16, mines: 99, label: "Expert" },
  };
  const CELL = 28;
  const LS_KEY = "neptuneos.minesweeper.scores";

  let win = null;
  let canvas = null, ctx = null;
  let minesEl = null, timerEl = null, faceBtn = null;
  let timerHandle = null;

  let diff = DIFFICULTIES.beginner;
  let diffKey = "beginner";
  let board = [], revealed = [], flagged = [];
  let gameOver = false, gameWon = false;
  let firstClick = false, timerVal = 0, flagCount = 0;

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
        width: diff.cols * CELL + 26,
        height: diff.rows * CELL + 110,
        resizable: false,
        app: "minesweeper",
        onClose: () => { stopTimer(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap" style="background:#c0c0c0;border-color:#808080 #fff #fff #808080">' +
        '  <div class="ms-menu-bar">' +
        '    <span class="ms-menu" data-menu="game">Game</span>' +
        '    <span class="ms-menu" data-menu="help">Help</span>' +
        '  </div>' +
        '  <div class="ms-status">' +
        '    <div class="ms-counter" id="ms-mines">010</div>' +
        '    <div class="ms-face-wrap"><canvas id="ms-face" width="26" height="26"></canvas></div>' +
        '    <div class="ms-counter" id="ms-timer">000</div>' +
        '  </div>' +
        '  <div class="ms-grid-wrap"><canvas id="ms-canvas"></canvas></div>' +
        '  <div class="ms-diff-bar">' +
        '    <button class="ms-diff-btn" data-diff="beginner">Beginner</button>' +
        '    <button class="ms-diff-btn" data-diff="intermediate">Intermediate</button>' +
        '    <button class="ms-diff-btn" data-diff="expert">Expert</button>' +
        '  </div>' +
        '</div>';

      canvas = win.content.querySelector("#ms-canvas");
      ctx = canvas.getContext("2d");
      faceBtn = win.content.querySelector("#ms-face");
      minesEl = win.content.querySelector("#ms-mines");
      timerEl = win.content.querySelector("#ms-timer");

      win.content.querySelectorAll(".ms-diff-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          diffKey = btn.dataset.diff;
          diff = DIFFICULTIES[diffKey];
          win.resize(diff.cols * CELL + 26, diff.rows * CELL + 110);
          resetGame();
        });
      });

      faceBtn.addEventListener("click", function () { resetGame(); });

      drawFace(faceBtn.getContext("2d"), "happy");
      resetGame();
    },

    onWindowClose() {
      stopTimer();
      win = null;
    },
  };

  function resetGame() {
    stopTimer();
    board = []; revealed = []; flagged = [];
    gameOver = false; gameWon = false; firstClick = false;
    timerVal = 0; flagCount = 0;

    for (var r = 0; r < diff.rows; r++) {
      board[r] = []; revealed[r] = []; flagged[r] = [];
      for (var c = 0; c < diff.cols; c++) {
        board[r][c] = 0;
        revealed[r][c] = false;
        flagged[r][c] = false;
      }
    }

    minesEl.textContent = String(diff.mines).padStart(3, "0");
    timerEl.textContent = "000";
    drawFace(faceBtn.getContext("2d"), "happy");
    resizeCanvas();
    drawBoard();
  }

  function placeMines(safeR, safeC) {
    var placed = 0;
    while (placed < diff.mines) {
      var r = Math.floor(Math.random() * diff.rows);
      var c = Math.floor(Math.random() * diff.cols);
      if (board[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }
    for (var r2 = 0; r2 < diff.rows; r2++) {
      for (var c2 = 0; c2 < diff.cols; c2++) {
        if (board[r2][c2] === -1) continue;
        var count = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var nr = r2 + dr, nc = c2 + dc;
            if (nr >= 0 && nr < diff.rows && nc >= 0 && nc < diff.cols && board[nr][nc] === -1) count++;
          }
        }
        board[r2][c2] = count;
      }
    }
  }

  function onLeftClick(e) {
    if (gameOver || gameWon) return;
    var pos = cellFromEvent(e);
    if (pos.r < 0 || pos.c < 0) return;
    if (flagged[pos.r][pos.c] || revealed[pos.r][pos.c]) return;

    if (!firstClick) {
      firstClick = true;
      placeMines(pos.r, pos.c);
      startTimer();
    }

    if (board[pos.r][pos.c] === -1) {
      loseGame(pos.r, pos.c);
      return;
    }
    floodReveal(pos.r, pos.c);
    checkWin();
    drawBoard();
  }

  function onRightClick(e) {
    e.preventDefault();
    if (gameOver || gameWon) return;
    var pos = cellFromEvent(e);
    if (pos.r < 0 || pos.c < 0) return;
    if (revealed[pos.r][pos.c]) return;

    if (flagged[pos.r][pos.c]) {
      flagged[pos.r][pos.c] = false;
      flagCount--;
    } else {
      flagged[pos.r][pos.c] = true;
      flagCount++;
    }
    minesEl.textContent = String(diff.mines - flagCount).padStart(3, "0");
    drawBoard();
  }

  function floodReveal(r, c) {
    if (r < 0 || r >= diff.rows || c < 0 || c >= diff.cols) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          floodReveal(r + dr, c + dc);
        }
      }
    }
  }

  function loseGame(hitR, hitC) {
    gameOver = true;
    stopTimer();
    for (var r = 0; r < diff.rows; r++) {
      for (var c = 0; c < diff.cols; c++) {
        revealed[r][c] = true;
      }
    }
    board[hitR][hitC] = -2;
    drawFace(faceBtn.getContext("2d"), "dead");
    drawBoard();
  }

  function checkWin() {
    var unrevealed = 0;
    for (var r = 0; r < diff.rows; r++) {
      for (var c = 0; c < diff.cols; c++) {
        if (!revealed[r][c]) unrevealed++;
      }
    }
    if (unrevealed === diff.mines) {
      gameWon = true;
      stopTimer();
      for (var r2 = 0; r2 < diff.rows; r2++) {
        for (var c2 = 0; c2 < diff.cols; c2++) {
          if (board[r2][c2] === -1) flagged[r2][c2] = true;
        }
      }
      flagCount = diff.mines;
      minesEl.textContent = "000";
      drawFace(faceBtn.getContext("2d"), "cool");
      drawBoard();
      saveScore(diffKey, timerVal);
    }
  }

  function saveScore(dk, time) {
    try {
      var scores = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (!scores[dk] || time < scores[dk]) {
        scores[dk] = time;
        localStorage.setItem(LS_KEY, JSON.stringify(scores));
      }
    } catch (e) {}
  }

  function startTimer() {
    timerVal = 0;
    timerEl.textContent = "000";
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(function () {
      timerVal++;
      if (timerVal > 999) timerVal = 999;
      timerEl.textContent = String(timerVal).padStart(3, "0");
    }, 1000);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  function cellFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
  }

  function resizeCanvas() {
    canvas.width = diff.cols * CELL;
    canvas.height = diff.rows * CELL;
  }

  function drawBoard() {
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var r = 0; r < diff.rows; r++) {
      for (var c = 0; c < diff.cols; c++) {
        var x = c * CELL, y = r * CELL;
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
      ctx.fillStyle = val === -2 ? "#ff4444" : "#c0c0c0";
      ctx.fillRect(x, y, CELL, CELL);
      drawMine(x, y, val === -2);
    } else if (val > 0) {
      var colors = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];
      ctx.fillStyle = colors[val] || "#000";
      ctx.font = "bold 16px Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), x + CELL / 2, y + CELL / 2 + 1);
    }
  }

  function drawMine(x, y, isHit) {
    var cx = x + CELL / 2, cy = y + CELL / 2;
    ctx.fillStyle = "#000";
    var spikes = [[0, -8], [0, 8], [-8, 0], [8, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]];
    for (var i = 0; i < spikes.length; i++) {
      ctx.fillRect(cx + spikes[i][0] - 1, cy + spikes[i][1] - 1, 3, 3);
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
    var cx = x + CELL / 2, cy = y + CELL / 2;
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

  function drawFace(fc, state) {
    fc.clearRect(0, 0, 26, 26);
    fc.fillStyle = "#ffff00";
    fc.beginPath();
    fc.arc(13, 13, 10, 0, Math.PI * 2);
    fc.fill();
    fc.strokeStyle = "#000";
    fc.lineWidth = 1.5;
    fc.stroke();

    fc.fillStyle = "#000";
    if (state === "dead") {
      fc.font = "bold 10px sans-serif";
      fc.textAlign = "center";
      fc.textBaseline = "middle";
      fc.fillText("\u00d7", 9, 11);
      fc.fillText("\u00d7", 17, 11);
      fc.beginPath();
      fc.arc(13, 18, 4, 0, Math.PI);
      fc.stroke();
    } else if (state === "cool") {
      fc.strokeStyle = "#000";
      fc.lineWidth = 2;
      fc.beginPath();
      fc.moveTo(7, 12);
      fc.lineTo(10, 14);
      fc.lineTo(12, 11);
      fc.moveTo(19, 12);
      fc.lineTo(16, 14);
      fc.lineTo(14, 11);
      fc.stroke();
      fc.beginPath();
      fc.arc(13, 17, 4, 0, Math.PI);
      fc.stroke();
    } else {
      fc.fillRect(9, 10, 2, 3);
      fc.fillRect(15, 10, 2, 3);
      fc.beginPath();
      fc.arc(13, 15, 4, 0.1, Math.PI - 0.1);
      fc.stroke();
    }
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.minesweeper = app;
})();
