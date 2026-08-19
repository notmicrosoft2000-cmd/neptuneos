/* =========================================================
 * NeptuneOS — 2048
 * Classic 2048 sliding-tile puzzle with animations,
 * touch support, score tracking, and visual polish.
 * ========================================================= */
(function () {
  "use strict";

  const HS_KEY = "neptuneos.2048.highscore";
  const SIZE = 4;
  const CELL = 90;
  const GAP = 10;
  const RADIUS = 8;
  const BOARD_PX = SIZE * CELL + (SIZE - 1) * GAP;

  const TILE_COLORS = {
    2:    { bg: "#eee4da", fg: "#776e65" },
    4:    { bg: "#ede0c8", fg: "#776e65" },
    8:    { bg: "#f2b179", fg: "#f9f6f2" },
    16:   { bg: "#f59563", fg: "#f9f6f2" },
    32:   { bg: "#f67c5f", fg: "#f9f6f2" },
    64:   { bg: "#f65e3b", fg: "#f9f6f2" },
    128:  { bg: "#edcf72", fg: "#f9f6f2" },
    256:  { bg: "#edcc61", fg: "#f9f6f2" },
    512:  { bg: "#edc850", fg: "#f9f6f2" },
    1024: { bg: "#edc53f", fg: "#f9f6f2" },
    2048: { bg: "#edc22e", fg: "#f9f6f2" },
  };
  const SUPER_COLOR = { bg: "#3c3a32", fg: "#f9f6f2" };

  let win = null;
  let boardEl = null, scoreEl = null, bestEl = null;
  let overlayEl = null, overlayTitle = null, overlayScore = null;
  let board = [], score = 0, highScore = 0;
  let won = false, over = false, paused = false, keepPlaying = false;
  let animating = false;
  let tileContainer = null;
  let activeTiles = [];

  function playSound(name) {
    try {
      if (OS.sfx && OS.sfx[name]) OS.sfx[name]();
    } catch (_) {}
  }

  const app = {
    id: "game2048",
    name: "2048",
    icon: "assets/icons/game2048.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "2048",
        icon: this.icon,
        width: 460,
        height: 540,
        resizable: false,
        app: "game2048",
        onClose: () => {
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("touchstart", onTouchStart);
          document.removeEventListener("touchend", onTouchEnd);
          win = null;
        },
      });

      win.content.innerHTML =
        '<div class="game-wrap" style="background:#faf8ef;align-items:center;justify-content:center;position:relative;">' +
        '  <div class="game-status" style="width:100%;background:#bbada0;border-bottom:none;">' +
        '    <span style="font-size:18px;font-weight:bold;color:#fff;">2048</span>' +
        '    <span style="display:flex;gap:12px;">' +
        '      <span id="g2048-score-box" style="background:#bb4a9b;border-radius:4px;padding:4px 12px;">Score: <b id="g2048-score">0</b></span>' +
        '      <span id="g2048-best-box" style="background:#bb4a9b;border-radius:4px;padding:4px 12px;">Best: <b id="g2048-best">0</b></span>' +
        '    </span>' +
        '  </div>' +
        '  <div style="padding:12px 0 4px;width:100%;text-align:center;">' +
        '    <div id="g2048-board" style="position:relative;width:' + BOARD_PX + 'px;height:' + BOARD_PX + 'px;background:#bbada0;border-radius:' + RADIUS + 'px;margin:0 auto;"></div>' +
        '  </div>' +
        '  <div id="g2048-msg" style="font-size:11px;color:#776e65;padding:6px 0 4px;">Arrow keys / WASD: move \u00b7 P/Esc: pause \u00b7 R: restart</div>' +
        '  <div id="g2048-overlay" style="position:absolute;inset:0;z-index:10;border-radius:' + RADIUS + 'px;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(238,228,218,0.73);">' +
        '    <div id="g2048-overlay-title" style="font-size:48px;font-weight:bold;color:#776e65;"></div>' +
        '    <div id="g2048-overlay-score" style="font-size:20px;color:#776e65;margin:8px 0 16px;"></div>' +
        '    <button id="g2048-overlay-btn" style="font-size:16px;font-weight:bold;padding:8px 24px;border:none;border-radius:4px;background:#8f7a66;color:#f9f6f2;cursor:pointer;">New Game</button>' +
        '  </div>' +
        '</div>';

      boardEl = win.content.querySelector("#g2048-board");
      scoreEl = win.content.querySelector("#g2048-score");
      bestEl = win.content.querySelector("#g2048-best");
      overlayEl = win.content.querySelector("#g2048-overlay");
      overlayTitle = win.content.querySelector("#g2048-overlay-title");
      overlayScore = win.content.querySelector("#g2048-overlay-score");
      const overlayBtn = win.content.querySelector("#g2048-overlay-btn");
      overlayBtn.addEventListener("click", function () {
        if (won && !over) {
          keepPlaying = true;
          hideOverlay();
          updateMsg("Arrow keys / WASD: move \u00b7 P/Esc: pause \u00b7 R: restart");
        } else {
          reset();
        }
      });

      highScore = parseInt(localStorage.getItem(HS_KEY) || "0", 10);
      bestEl.textContent = highScore;

      document.addEventListener("keydown", onKey);
      document.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchend", onTouchEnd, { passive: true });
      initBoard();
      reset();
    },
  };

  /* ========== board init ========== */

  function initBoard() {
    for (let r = 0; r < SIZE; r++) {
      board[r] = [];
      for (let c = 0; c < SIZE; c++) {
        board[r][c] = 0;
      }
    }
    tileContainer = document.createElement("div");
    tileContainer.style.cssText = "position:absolute;inset:0;";
    boardEl.appendChild(tileContainer);
  }

  /* ========== reset ========== */

  function reset() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        board[r][c] = 0;
    score = 0;
    won = false;
    over = false;
    paused = false;
    keepPlaying = false;
    animating = false;
    scoreEl.textContent = "0";
    overlayEl.style.display = "none";
    clearTiles();
    addRandomTile();
    addRandomTile();
    renderTiles();
    updateMsg("Arrow keys / WASD: move \u00b7 P/Esc: pause \u00b7 R: restart");
  }

  /* ========== tile management ========== */

  function clearTiles() {
    activeTiles.forEach(function (t) { if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el); });
    activeTiles = [];
  }

  function addRandomTile() {
    var empty = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (board[r][c] === 0) empty.push({ r: r, c: c });
    if (!empty.length) return null;
    var spot = empty[Math.floor(Math.random() * empty.length)];
    var val = Math.random() < 0.9 ? 2 : 4;
    board[spot.r][spot.c] = val;
    return { r: spot.r, c: spot.c, val: val, isNew: true };
  }

  function tilePos(r, c) {
    return { x: c * (CELL + GAP), y: r * (CELL + GAP) };
  }

  function getTileColor(val) {
    return TILE_COLORS[val] || SUPER_COLOR;
  }

  function getFontSize(val) {
    if (val < 100) return 32;
    if (val < 1000) return 26;
    return 22;
  }

  function createTileEl(val) {
    var el = document.createElement("div");
    var col = getTileColor(val);
    el.style.cssText =
      "position:absolute;width:" + CELL + "px;height:" + CELL + "px;" +
      "border-radius:" + RADIUS + "px;display:flex;align-items:center;justify-content:center;" +
      "font-weight:bold;font-family:Arial,sans-serif;transition:left 0.12s ease,top 0.12s ease,transform 0.12s ease;" +
      "background:" + col.bg + ";color:" + col.fg + ";font-size:" + getFontSize(val) + "px;";
    el.textContent = val;
    return el;
  }

  function renderTiles(newTilePos, mergedPositions) {
    clearTiles();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) continue;
        var pos = tilePos(r, c);
        var el = createTileEl(board[r][c]);
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";

        var isNew = newTilePos && newTilePos.r === r && newTilePos.c === c;
        var isMerged = mergedPositions && mergedPositions.indexOf(r + "," + c) !== -1;

        if (isNew) {
          el.style.transform = "scale(0)";
          requestAnimationFrame(function (e) {
            return function () { e.style.transform = "scale(1)"; };
          }(el));
        }
        if (isMerged) {
          el.style.transform = "scale(1.15)";
          requestAnimationFrame(function (e) {
            return function () { e.style.transform = "scale(1)"; };
          }(el));
        }

        tileContainer.appendChild(el);
        activeTiles.push({ r: r, c: c, val: board[r][c], el: el });
      }
    }
  }

  /* ========== slide logic ========== */

  function slideRow(row) {
    var filtered = row.filter(function (v) { return v !== 0; });
    var merged = [];
    var mergeScore = 0;
    var mergedIndices = [];
    for (var i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        mergeScore += filtered[i];
        mergedIndices.push(i);
        filtered.splice(i + 1, 1);
      }
    }
    while (filtered.length < SIZE) filtered.push(0);
    return { result: filtered, mergeScore: mergeScore, mergedIndices: mergedIndices };
  }

  function move(direction) {
    if (animating || over || paused) return;
    if (won && !keepPlaying) return;

    var moved = false;
    var totalMerge = 0;
    var mergedPositions = [];

    if (direction === "left") {
      for (var r = 0; r < SIZE; r++) {
        var orig = board[r].slice();
        var res = slideRow(board[r]);
        board[r] = res.result;
        totalMerge += res.mergeScore;
        if (!moved && orig.join(",") !== board[r].join(",")) moved = true;
        for (var i = 0; i < res.mergedIndices.length; i++)
          mergedPositions.push(r + "," + res.mergedIndices[i]);
      }
    } else if (direction === "right") {
      for (var r = 0; r < SIZE; r++) {
        var orig = board[r].slice().reverse();
        var res = slideRow(orig);
        board[r] = res.result.reverse();
        totalMerge += res.mergeScore;
        var flipped = [];
        for (var i = 0; i < res.mergedIndices.length; i++)
          flipped.push(SIZE - 1 - res.mergedIndices[i]);
        if (!moved && orig.join(",") !== res.result.join(",")) moved = true;
        for (var i = 0; i < flipped.length; i++)
          mergedPositions.push(r + "," + flipped[i]);
      }
    } else if (direction === "up") {
      for (var c = 0; c < SIZE; c++) {
        var col = [];
        for (var r = 0; r < SIZE; r++) col.push(board[r][c]);
        var orig = col.slice();
        var res = slideRow(col);
        totalMerge += res.mergeScore;
        for (var r = 0; r < SIZE; r++) board[r][c] = res.result[r];
        if (!moved && orig.join(",") !== res.result.join(",")) moved = true;
        for (var i = 0; i < res.mergedIndices.length; i++)
          mergedPositions.push(res.mergedIndices[i] + "," + c);
      }
    } else if (direction === "down") {
      for (var c = 0; c < SIZE; c++) {
        var col = [];
        for (var r = SIZE - 1; r >= 0; r--) col.push(board[r][c]);
        var orig = col.slice();
        var res = slideRow(col);
        totalMerge += res.mergeScore;
        var rev = res.result.reverse();
        for (var r = 0; r < SIZE; r++) board[r][c] = rev[r];
        if (!moved && orig.join(",") !== res.result.join(",")) moved = true;
        for (var i = 0; i < res.mergedIndices.length; i++)
          mergedPositions.push((SIZE - 1 - res.mergedIndices[i]) + "," + c);
      }
    }

    if (!moved) return;

    if (totalMerge > 0) playSound("blip");
    score += totalMerge;
    scoreEl.textContent = score;

    var newTile = addRandomTile();
    renderTiles(newTile, mergedPositions);

    if (score > highScore) {
      highScore = score;
      bestEl.textContent = highScore;
      try { localStorage.setItem(HS_KEY, String(highScore)); } catch (_) {}
    }

    if (!won && !keepPlaying) checkWin();
    if (!hasMoves()) {
      over = true;
      if (!won) {
        setTimeout(function () {
          showOverlay("Game Over!", "Score: " + score);
        }, 300);
      }
    }
  }

  function checkWin() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (board[r][c] === 2048) {
          won = true;
          setTimeout(function () {
            showOverlay("You Win!", "Score: " + score + " \u2014 Continue playing?");
          }, 300);
          return;
        }
  }

  function hasMoves() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      }
    return false;
  }

  /* ========== overlay ========== */

  function showOverlay(title, scoreText) {
    overlayTitle.textContent = title;
    overlayScore.textContent = scoreText;
    var btn = win.content.querySelector("#g2048-overlay-btn");
    btn.textContent = won ? "Keep Playing" : "New Game";
    overlayEl.style.display = "flex";
  }

  function hideOverlay() {
    overlayEl.style.display = "none";
  }

  /* ========== pause ========== */

  function updateMsg(text) {
    var msgEl = win.content.querySelector("#g2048-msg");
    if (msgEl) msgEl.textContent = text;
  }

  function togglePause() {
    if (over) return;
    paused = !paused;
    if (paused) {
      updateMsg("Paused \u2014 P/Esc to resume");
      boardEl.style.opacity = "0.5";
    } else {
      updateMsg("Arrow keys / WASD: move \u00b7 P/Esc: pause \u00b7 R: restart");
      boardEl.style.opacity = "1";
    }
  }

  /* ========== keyboard ========== */

  var KEY_MAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right",
  };

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    var k = e.key;

    if (over && (k === "r" || k === "R")) { e.preventDefault(); reset(); return; }
    if (won && overlayEl.style.display === "flex") {
      if (k === "r" || k === "R") { e.preventDefault(); reset(); return; }
    }
    if (k === "p" || k === "P" || k === "Escape") { e.preventDefault(); togglePause(); return; }
    if (k === "r" || k === "R") { e.preventDefault(); reset(); return; }

    var dir = KEY_MAP[k];
    if (dir) {
      e.preventDefault();
      if (paused) return;
      move(dir);
    }
  }

  /* ========== touch / swipe ========== */

  var touchStartX = 0, touchStartY = 0, touching = false;

  function onTouchStart(e) {
    if (!win || win !== OS.wm.active) return;
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touching = true;
  }

  function onTouchEnd(e) {
    if (!touching) return;
    touching = false;
    if (paused || over) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }

  /* ---------- registration ---------- */

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.game2048 = app;
})();
