/* =========================================================
 * NeptuneOS — Sudoku
 * Generate valid puzzles, 3 difficulties, timer.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var puzzle = [];
  var solution = [];
  var playerBoard = [];
  var selectedCell = null;
  var difficulty = "medium";
  var timer = 0;
  var timerInterval = null;
  var gameOver = false;

  function generateSolution() {
    var grid = [];
    for (var i = 0; i < 9; i++) { grid.push([]); for (var j = 0; j < 9; j++) grid[i].push(0); }
    function isValid(g, r, c, n) {
      for (var i = 0; i < 9; i++) { if (g[r][i] === n || g[i][c] === n) return false; }
      var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (var i = br; i < br + 3; i++) for (var j = bc; j < bc + 3; j++) if (g[i][j] === n) return false;
      return true;
    }
    function fill(g) {
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
        if (g[r][c] === 0) {
          var nums = [1,2,3,4,5,6,7,8,9];
          for (var i = nums.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = nums[i]; nums[i] = nums[j]; nums[j] = t; }
          for (var k = 0; k < 9; k++) {
            if (isValid(g, r, c, nums[k])) { g[r][c] = nums[k]; if (fill(g)) return true; g[r][c] = 0; }
          }
          return false;
        }
      }
      return true;
    }
    fill(grid);
    return grid;
  }

  function generatePuzzle(diff) {
    solution = generateSolution();
    var remove = diff === "easy" ? 30 : diff === "medium" ? 45 : 55;
    puzzle = solution.map(function (row) { return row.slice(); });
    var cells = [];
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) cells.push([r, c]);
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    for (var k = 0; k < remove && k < cells.length; k++) puzzle[cells[k][0]][cells[k][1]] = 0;
    playerBoard = puzzle.map(function (row) { return row.slice(); });
  }

  function checkWin() {
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (playerBoard[r][c] !== solution[r][c]) return false;
    return true;
  }

  function countErrors() {
    var e = 0;
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (playerBoard[r][c] !== 0 && playerBoard[r][c] !== solution[r][c]) e++;
    return e;
  }

  function render() {
    if (!win || !win.content) return;
    var boardEl = win.content.querySelector("#su-board");
    if (!boardEl) return;
    var html = "";
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var given = puzzle[r][c] !== 0;
        var sel = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
        var err = playerBoard[r][c] !== 0 && playerBoard[r][c] !== solution[r][c];
        var cls = "su-cell" + (given ? " given" : "") + (sel ? " selected" : "") + (err ? " error" : "");
        var val = playerBoard[r][c] || "";
        html += '<div class="' + cls + '" data-r="' + r + '" data-c="' + c + '">' + (val || "") + '</div>';
      }
    }
    boardEl.innerHTML = html;

    var statusEl = win.content.querySelector("#su-status");
    if (statusEl) {
      var errs = countErrors();
      statusEl.textContent = "Errors: " + errs + (gameOver ? " — Complete!" : "");
    }

    var timerEl = win.content.querySelector("#su-timer");
    if (timerEl) {
      var m = Math.floor(timer / 60);
      var s = timer % 60;
      timerEl.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }
  }

  function newGame(diff) {
    difficulty = diff;
    gameOver = false;
    timer = 0;
    clearInterval(timerInterval);
    selectedCell = null;
    generatePuzzle(diff);
    timerInterval = setInterval(function () {
      if (!gameOver) { timer++; render(); }
    }, 1000);
    render();
  }

  function handleKey(e) {
    if (gameOver || !selectedCell) return;
    var r = selectedCell[0], c = selectedCell[1];
    var num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      if (puzzle[r][c] !== 0) return;
      playerBoard[r][c] = num;
      render();
      if (checkWin()) { gameOver = true; clearInterval(timerInterval); render(); OS.sfx && OS.sfx.notify(); }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      if (puzzle[r][c] !== 0) return;
      playerBoard[r][c] = 0;
      render();
    }
  }

  var app = {
    id: "sudoku",
    name: "Sudoku",
    icon: "assets/icons/sudoku.svg",
    group: "games",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          ".su-wrap{display:flex;flex-direction:column;align-items:center;padding:12px;height:100%;overflow:auto;}" +
          ".su-bar{display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;justify-content:center;}" +
          ".su-bar .btn{font-size:11px;padding:3px 10px;}" +
          ".su-bar .btn.active{background:rgba(100,180,255,0.25)!important;border-color:rgba(100,180,255,0.4)!important;}" +
          "#su-board{display:grid;grid-template-columns:repeat(9,1fr);width:min(360px,100%);aspect-ratio:1;gap:0;border:2px solid rgba(255,255,255,0.2);border-radius:4px;overflow:hidden;}" +
          ".su-cell{display:flex;align-items:center;justify-content:center;aspect-ratio:1;font-size:18px;font-weight:600;cursor:pointer;border:0.5px solid rgba(255,255,255,0.08);transition:background 0.1s;user-select:none;}" +
          ".su-cell:nth-child(3n){border-right:2px solid rgba(255,255,255,0.25);}" +
          ".su-cell:nth-child(9n){border-right:none;}" +
          ".su-cell:nth-child(n+19):nth-child(-n+27){border-bottom:2px solid rgba(255,255,255,0.25);}" +
          ".su-cell:nth-child(n+46):nth-child(-n+54){border-bottom:2px solid rgba(255,255,255,0.25);}" +
          ".su-cell.given{background:rgba(255,255,255,0.06);color:#89b4fa;font-weight:700;}" +
          ".su-cell:not(.given){color:#cdd6f4;}" +
          ".su-cell.selected{background:rgba(137,180,250,0.25)!important;}" +
          ".su-cell.error{background:rgba(243,139,168,0.3)!important;color:#f38ba8;}" +
          ".su-cell:hover:not(.given){background:rgba(255,255,255,0.06);}" +
          "#su-status{margin-top:8px;font-size:13px;opacity:0.7;}" +
          "#su-timer{margin-top:4px;font-size:12px;font-family:Consolas,monospace;opacity:0.5;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "Sudoku",
        icon: this.icon,
        width: 420,
        height: 480,
        resizable: true,
        app: "sudoku",
        onClose: function () { win = null; clearInterval(timerInterval); },
      });

      win.content.innerHTML =
        '<div class="su-wrap">' +
        '<div class="su-bar">' +
        '<button class="btn su-diff" data-d="easy">Easy</button>' +
        '<button class="btn su-diff active" data-d="medium">Medium</button>' +
        '<button class="btn su-diff" data-d="hard">Hard</button>' +
        '<button class="btn" id="su-new">New Game</button>' +
        '</div>' +
        '<div id="su-board"></div>' +
        '<div id="su-status">Errors: 0</div>' +
        '<div id="su-timer">00:00</div>' +
        '</div>';

      win.content.querySelectorAll(".su-diff").forEach(function (btn) {
        btn.addEventListener("click", function () {
          win.content.querySelectorAll(".su-diff").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          newGame(btn.dataset.d);
        });
      });

      win.content.querySelector("#su-new").addEventListener("click", function () { newGame(difficulty); });

      win.content.querySelector("#su-board").addEventListener("click", function (e) {
        var cell = e.target.closest(".su-cell");
        if (!cell) return;
        selectedCell = [parseInt(cell.dataset.r), parseInt(cell.dataset.c)];
        render();
      });

      document.addEventListener("keydown", handleKey);

      newGame("medium");
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.sudoku = app;
})();
