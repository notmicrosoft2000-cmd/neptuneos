/* =========================================================
 * NeptuneOS — Solitaire (Klondike)
 * Classic Windows XP Klondike solitaire. Draw 1, score
 * tracking, double-click to auto-move, drag-and-drop.
 * ========================================================= */
(function () {
  "use strict";

  const CARD_W = 65, CARD_H = 90;
  const SUITS = ["spade", "heart", "diamond", "club"];
  const SUIT_SYMBOL = { spade: "\u2660", heart: "\u2665", diamond: "\u2666", club: "\u2663" };
  const SUIT_COLOR = { spade: "#000", heart: "#d00", diamond: "#d00", club: "#000" };
  const RANK_NAMES = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const FACE_DOWN_COLOR = "#1a5276";
  const TABLEAU_FACE_UP_OFFSET = 22;

  let win = null;
  let canvas = null, ctx = null;
  let scoreEl = null, msgEl = null;

  let stock = [], waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];

  let score = 0;

  // Layout
  const FOUND_X = [255, 330, 405, 480];
  const STOCK_X = 10, WASTE_X = 85, TOP_Y = 10;
  const TABLEAU_Y = 115;
  let tableauX = [];

  // Drag state
  let drag = null; // { x, y, offX, offY, cards, source, srcCol }
  let animTimer = null;

  const app = {
    id: "solitaire",
    name: "Solitaire",
    icon: "assets/icons/solitaire.svg",
    group: "games",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "Solitaire",
        icon: this.icon,
        width: 720,
        height: 560,
        resizable: false,
        app: "solitaire",
        onClose: () => { stopAnim(); cleanupEvents(); win = null; },
      });

      win.content.innerHTML =
        '<div class="game-wrap">' +
        '  <div class="game-status">' +
        '    <span id="sol-score">Score: 0</span>' +
        '    <span id="sol-msg">Double-click to move to foundation \u00b7 R to new game</span>' +
        '  </div>' +
        '  <canvas id="sol-canvas" width="700" height="490"></canvas>' +
        "</div>";

      canvas = win.content.querySelector("#sol-canvas");
      ctx = canvas.getContext("2d");
      scoreEl = win.content.querySelector("#sol-score");
      msgEl = win.content.querySelector("#sol-msg");

      initLayout();
      setupEvents();
      newGame();
    },

    onWindowClose() {
      cleanupEvents();
      stopAnim();
      win = null;
    },
  };

  /* ---------- Layout ---------- */

  function initLayout() {
    tableauX = [];
    for (let i = 0; i < 7; i++) tableauX.push(10 + i * 95);
  }

  /* ---------- Card helpers ---------- */

  function makeDeck() {
    const d = [];
    for (let s = 0; s < 4; s++)
      for (let r = 1; r <= 13; r++)
        d.push({ suit: SUITS[s], rank: r, faceUp: false });
    return d;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isRed(c) { return c.suit === "heart" || c.suit === "diamond"; }

  /* ---------- Deal ---------- */

  function newGame() {
    stopAnim();
    score = 0;
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    drag = null;

    const deck = shuffle(makeDeck());

    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.pop();
        card.faceUp = row === col;
        tableau[col].push(card);
      }
    }
    stock = deck.splice(0);
    for (const c of stock) c.faceUp = false;

    updateScoreDisplay();
    draw();
  }

  /* ---------- Scoring ---------- */

  function addScore(pts) {
    score = Math.max(0, score + pts);
    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    if (scoreEl) scoreEl.textContent = "Score: " + score;
  }

  /* ---------- Drawing ---------- */

  function draw() {
    ctx.fillStyle = "#0a6b28";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSlotOutlines();
    drawStockWaste();
    drawFoundations();
    drawTableau();
    drawDragCards();
  }

  function drawSlotOutlines() {
    for (let i = 0; i < 7; i++)
      if (tableau[i].length === 0) drawSlotOutline(tableauX[i], TABLEAU_Y);
    if (stock.length === 0) drawSlotOutline(STOCK_X, TOP_Y);
    for (let i = 0; i < 4; i++) drawSlotOutline(FOUND_X[i], TOP_Y);
  }

  function drawSlotOutline(x, y) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    roundRect(x, y, CARD_W, CARD_H, 5);
    ctx.stroke();
    ctx.restore();
  }

  function drawStockWaste() {
    if (stock.length > 0) drawCardFaceDown(STOCK_X, TOP_Y);
    if (waste.length > 0) drawCard(waste[waste.length - 1], WASTE_X, TOP_Y);
  }

  function drawFoundations() {
    for (let i = 0; i < 4; i++) {
      if (foundations[i].length > 0)
        drawCard(foundations[i][foundations[i].length - 1], FOUND_X[i], TOP_Y);
    }
  }

  function drawTableau() {
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      for (let row = 0; row < pile.length; row++) {
        const card = pile[row];
        const y = TABLEAU_Y + row * TABLEAU_FACE_UP_OFFSET;
        if (card.faceUp) drawCard(card, tableauX[col], y);
        else drawCardFaceDown(tableauX[col], y);
      }
    }
  }

  function drawDragCards() {
    if (!drag) return;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    for (let i = 0; i < drag.cards.length; i++)
      drawCard(drag.cards[i], drag.x, drag.y + i * TABLEAU_FACE_UP_OFFSET);
    ctx.restore();
  }

  /* ---------- Card rendering ---------- */

  function drawCardFaceDown(x, y) {
    ctx.save();
    roundRect(x, y, CARD_W, CARD_H, 5);
    ctx.fillStyle = FACE_DOWN_COLOR;
    ctx.fill();
    ctx.strokeStyle = "#0d3b66";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Diagonal line pattern
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -CARD_H; i < CARD_W + CARD_H; i += 8) {
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + CARD_H, y + CARD_H);
    }
    ctx.stroke();

    // Inner border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    roundRect(x + 4, y + 4, CARD_W - 8, CARD_H - 8, 3);
    ctx.stroke();
    ctx.restore();
  }

  function drawCard(card, x, y) {
    ctx.save();
    roundRect(x, y, CARD_W, CARD_H, 5);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    const color = SUIT_COLOR[card.suit];
    const sym = SUIT_SYMBOL[card.suit];
    const label = RANK_NAMES[card.rank];

    ctx.fillStyle = color;

    // Top-left rank + suit
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 12px Tahoma, sans-serif";
    ctx.fillText(label, x + 4, y + 4);
    ctx.font = "11px serif";
    ctx.fillText(sym, x + 4, y + 17);

    // Center
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (card.rank >= 10) {
      ctx.font = "bold 28px serif";
      ctx.fillText(sym, x + CARD_W / 2, y + CARD_H / 2);
    } else {
      ctx.font = "bold 22px serif";
      ctx.fillText(sym, x + CARD_W / 2, y + CARD_H / 2 - 4);
      ctx.font = "bold 16px Tahoma, sans-serif";
      ctx.fillText(label, x + CARD_W / 2, y + CARD_H / 2 + 14);
    }

    // Bottom-right inverted rank + suit
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 12px Tahoma, sans-serif";
    ctx.fillText(label, x + CARD_W - 4, y + CARD_H - 4);
    ctx.font = "11px serif";
    ctx.fillText(sym, x + CARD_W - 4, y + CARD_H - 17);

    ctx.restore();
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

  /* ---------- Hit testing ---------- */

  function cardAt(x, y) {
    // Tableau: check right-to-left, bottom-to-top
    for (let col = 6; col >= 0; col--) {
      const pile = tableau[col];
      for (let row = pile.length - 1; row >= 0; row--) {
        if (!pile[row].faceUp) continue;
        const cx = tableauX[col], cy = TABLEAU_Y + row * TABLEAU_FACE_UP_OFFSET;
        if (x >= cx && x <= cx + CARD_W && y >= cy && y <= cy + CARD_H)
          return { source: "tableau", col: col, row: row, card: pile[row] };
      }
    }
    // Waste
    if (waste.length > 0 &&
        x >= WASTE_X && x <= WASTE_X + CARD_W && y >= TOP_Y && y <= TOP_Y + CARD_H)
      return { source: "waste", col: -1, row: -1, card: waste[waste.length - 1] };
    // Stock
    if (stock.length > 0 &&
        x >= STOCK_X && x <= STOCK_X + CARD_W && y >= TOP_Y && y <= TOP_Y + CARD_H)
      return { source: "stock", col: -1, row: -1, card: null };
    return null;
  }

  function foundationAt(x, y) {
    for (let i = 0; i < 4; i++)
      if (x >= FOUND_X[i] && x <= FOUND_X[i] + CARD_W && y >= TOP_Y && y <= TOP_Y + CARD_H)
        return i;
    return -1;
  }

  function tableauColAt(x, y) {
    // Return column if x is within any tableau column, regardless of y
    for (let col = 0; col < 7; col++)
      if (x >= tableauX[col] && x <= tableauX[col] + CARD_W)
        return col;
    return -1;
  }

  /* ---------- Move validation ---------- */

  function canPlaceOnFoundation(card, fi) {
    const pile = foundations[fi];
    if (pile.length === 0) return card.rank === 1;
    const top = pile[pile.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  function canPlaceOnTableau(card, col) {
    const pile = tableau[col];
    if (pile.length === 0) return card.rank === 13;
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return isRed(card) !== isRed(top) && card.rank === top.rank - 1;
  }

  /* ---------- Game logic ---------- */

  function drawFromStock() {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      stock = waste.reverse();
      waste = [];
      for (const c of stock) c.faceUp = false;
      addScore(-100);
    } else {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
    }
    draw();
  }

  function tryAutoMoveToFoundation(card) {
    for (let i = 0; i < 4; i++)
      if (canPlaceOnFoundation(card, i)) return i;
    return -1;
  }

  function autoMoveAllToFoundation() {
    let moved = true;
    while (moved) {
      moved = false;
      // Tableau columns
      for (let col = 0; col < 7; col++) {
        const pile = tableau[col];
        if (pile.length === 0) continue;
        const card = pile[pile.length - 1];
        if (!card.faceUp) continue;
        const fi = tryAutoMoveToFoundation(card);
        if (fi >= 0) {
          foundations[fi].push(pile.pop());
          addScore(10);
          if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
            pile[pile.length - 1].faceUp = true;
            addScore(5);
          }
          moved = true;
        }
      }
      // Waste
      if (waste.length > 0) {
        const card = waste[waste.length - 1];
        const fi = tryAutoMoveToFoundation(card);
        if (fi >= 0) {
          foundations[fi].push(waste.pop());
          addScore(10);
          moved = true;
        }
      }
    }
    // Win check
    let total = 0;
    for (let i = 0; i < 4; i++) total += foundations[i].length;
    if (total === 52) {
      if (msgEl) msgEl.textContent = "You win! Press R for a new game";
      triggerWinAnimation();
    }
  }

  function triggerWinAnimation() {
    stopAnim();
    let phase = 0;
    animTimer = setInterval(() => {
      phase++;
      draw();
      ctx.save();
      ctx.globalAlpha = Math.min(1, phase / 10) * 0.85;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 40px Tahoma, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("You Win!", canvas.width / 2, canvas.height / 2);
      ctx.restore();
      if (phase > 25) stopAnim();
    }, 100);
  }

  function stopAnim() {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
  }

  /* ---------- Drag handling ---------- */

  function onDown(e) {
    if (!win || !win.el.isConnected) return;
    if (e.button !== 0) return;
    const pt = canvasCoords(e);
    const hit = cardAt(pt.x, pt.y);

    if (!hit) return;

    if (hit.source === "stock") {
      drawFromStock();
      return;
    }

    if (!hit.card || !hit.card.faceUp) return;

    let cards = [];
    let offX, offY;

    if (hit.source === "waste") {
      cards = [waste.pop()];
      offX = pt.x - WASTE_X;
      offY = pt.y - TOP_Y;
    } else {
      const pile = tableau[hit.col];
      cards = pile.splice(hit.row);
      offX = pt.x - tableauX[hit.col];
      offY = pt.y - (TABLEAU_Y + hit.row * TABLEAU_FACE_UP_OFFSET);
    }

    drag = {
      x: pt.x - offX,
      y: pt.y - offY,
      offX: offX,
      offY: offY,
      cards: cards,
      source: hit.source,
      srcCol: hit.col,
    };

    draw();
  }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    const pt = canvasCoords(e);
    drag.x = pt.x - drag.offX;
    drag.y = pt.y - drag.offY;
    draw();
  }

  function onUp(e) {
    if (!drag) return;
    const pt = canvasCoords(e);
    const cards = drag.cards;
    const src = drag.source;
    const srcCol = drag.srcCol;

    drag = null;

    let placed = false;

    // Single card → try foundation
    if (cards.length === 1) {
      const fi = foundationAt(pt.x, pt.y);
      if (fi >= 0 && canPlaceOnFoundation(cards[0], fi)) {
        foundations[fi].push(cards[0]);
        addScore(10);
        placed = true;
        flipTopCard(src, srcCol);
      }
    }

    // Try tableau
    if (!placed) {
      const col = tableauColAt(pt.x, pt.y);
      if (col >= 0 && canPlaceOnTableau(cards[0], col)) {
        for (const c of cards) tableau[col].push(c);
        placed = true;
        flipTopCard(src, srcCol);
      }
    }

    // Snap back
    if (!placed) {
      if (src === "waste") waste.push(cards[0]);
      else if (src === "tableau") for (const c of cards) tableau[srcCol].push(c);
    }

    autoMoveAllToFoundation();
    draw();
  }

  function flipTopCard(source, srcCol) {
    if (source === "tableau") {
      const pile = tableau[srcCol];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        addScore(5);
      }
    }
  }

  function onDblClick(e) {
    if (drag) return;
    const pt = canvasCoords(e);
    const hit = cardAt(pt.x, pt.y);
    if (!hit || !hit.card || !hit.card.faceUp) return;

    const fi = tryAutoMoveToFoundation(hit.card);
    if (fi < 0) return;

    if (hit.source === "waste") {
      foundations[fi].push(waste.pop());
      addScore(10);
    } else if (hit.source === "tableau") {
      const pile = tableau[hit.col];
      foundations[fi].push(pile.pop());
      addScore(10);
      flipTopCard("tableau", hit.col);
    }

    autoMoveAllToFoundation();
    draw();
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  /* ---------- Event management ---------- */

  function onKeyDown(e) {
    if (!win || win !== OS.wm.active || (win && win.minimized)) return;
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      newGame();
    }
  }

  function setupEvents() {
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("dblclick", onDblClick);
    document.addEventListener("keydown", onKeyDown);
  }

  function cleanupEvents() {
    if (canvas) {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("dblclick", onDblClick);
    }
    document.removeEventListener("keydown", onKeyDown);
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.solitaire = app;
})();
