/* =========================================================
 * NeptuneOS — Snake
 * Classic grid snake. Arrow keys to steer, Space to pause,
 * R to restart. Keyboard controls work while the window is
 * the active OS window.
 * ========================================================= */
(function () {
  "use strict";

  const COLS = 24, ROWS = 20, CELL = 16;
  const BASE_SPEED = 130, MIN_SPEED = 60;

  let win = null;
  let canvas = null, ctx = null;
  let scoreEl = null, msgEl = null;
  let timer = null;
  let snake = [], dir = { x: 1, y: 0 }, queue = [];
  let food = null, score = 0;
  let running = false, paused = false, over = false;

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
        width: 416,
        height: 390,
        resizable: false,
        app: "snake",
        onClose: () => { stopTimer(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="snake-score">Score: 0</span>' +
        '    <span id="snake-msg">Arrow keys to move &middot; Space to pause &middot; R to restart</span>' +
        "  </div>" +
        '  <canvas id="snake-canvas" width="' + (COLS * CELL) + '" height="' + (ROWS * CELL) + '"></canvas>' +
        "</div>";

      canvas = win.content.querySelector("#snake-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#snake-score");
      msgEl = win.content.querySelector("#snake-msg");

      reset();
      draw();
      document.addEventListener("keydown", onKey);
    },

    onWindowClose() {
      document.removeEventListener("keydown", onKey);
    },
  };

  function onKey(e) {
    if (!win || win !== OS.wm.active || win.minimized) return;
    const k = e.key;
    if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
      e.preventDefault();
      const d = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }[k];
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (d.x !== -last.x || d.y !== -last.y) {
        if (queue.length < 2) queue.push(d);
      }
    } else if (k === " " || k === "p" || k === "P") {
      e.preventDefault();
      if (over) { reset(); }
      else if (running) pause();
      else start();
    } else if (k === "r" || k === "R") {
      e.preventDefault();
      reset();
    }
  }

  function reset() {
    stopTimer();
    snake = [];
    for (let i = 0; i < 3; i++) snake.push({ x: 5 - i, y: Math.floor(ROWS / 2) });
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    paused = false;
    over = false;
    placeFood();
    scoreEl.textContent = "Score: 0";
    msgEl.textContent = "Arrow keys to move \u00b7 Space to pause \u00b7 R to restart";
    start();
  }

  function start() {
    if (over) return;
    if (timer) return;
    paused = false;
    msgEl.textContent = pausedMsg();
    const speed = Math.max(MIN_SPEED, BASE_SPEED - score * 3);
    timer = setInterval(tick, speed);
  }

  function pause() {
    paused = true;
    if (timer) { clearInterval(timer); timer = null; }
    msgEl.textContent = "Paused \u2014 Space to resume";
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function pausedMsg() {
    return paused ? "Paused \u2014 Space to resume" : "Arrow keys to move \u00b7 Space to pause \u00b7 R to restart";
  }

  function placeFood() {
    const empty = [];
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) empty.push({ x, y });
      }
    }
    if (!empty.length) { over = true; return; }
    food = empty[Math.floor(Math.random() * empty.length)];
  }

  function tick() {
    if (over || paused) return;
    if (queue.length) dir = queue.shift();

    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || snake.some((s) => s.x === nx && s.y === ny)) {
      gameOver();
      return;
    }

    snake.unshift({ x: nx, y: ny });
    if (food && nx === food.x && ny === food.y) {
      score += 10;
      scoreEl.textContent = "Score: " + score;
      OS.sfx && OS.sfx.blip && OS.sfx.blip();
      placeFood();
      restartTimerIfSpeedChanged();
    } else {
      snake.pop();
    }
    draw();
  }

  function restartTimerIfSpeedChanged() {
    const speed = Math.max(MIN_SPEED, BASE_SPEED - score * 3);
    stopTimer();
    timer = setInterval(tick, speed);
  }

  function gameOver() {
    over = true;
    stopTimer();
    msgEl.textContent = "Game over \u2014 press R to restart";
    draw();
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    if (food) {
      ctx.fillStyle = "#d93838";
      roundRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 4);
      ctx.fill();
    }

    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? "#7ddb4a" : "#4a9e2f";
      roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
    }

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 26px Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", (COLS * CELL) / 2, (ROWS * CELL) / 2 - 10);
      ctx.font = "13px Tahoma, sans-serif";
      ctx.fillText("Score " + score + " \u2014 press R to restart", (COLS * CELL) / 2, (ROWS * CELL) / 2 + 20);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.snake = app;
})();
