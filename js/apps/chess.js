/* =========================================================
 * NeptuneOS — Chess
 * Playable chess with basic AI (minimax + alpha-beta).
 * Drag or click-move, board highlighting, captured pieces.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var board = [];
  var turn = "w";
  var selected = null;
  var legalMoves = [];
  var captured = { w: [], b: [] };
  var gameOver = false;
  var moveHistory = [];
  var castlingRights = { w: { kingSide: true, queenSide: true }, b: { kingSide: true, queenSide: true } };
  var enPassantTarget = null;

  var PIECE_UNICODE = {
    wk: "\u2654", wq: "\u2655", wr: "\u2656", wb: "\u2657", wn: "\u2658", wp: "\u2659",
    bk: "\u265A", bq: "\u265B", br: "\u265C", bb: "\u265D", bn: "\u265E", bp: "\u265F",
  };

  var PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  var INITIAL_BOARD = [
    ["br","bn","bb","bq","bk","bb","bn","br"],
    ["bp","bp","bp","bp","bp","bp","bp","bp"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["wp","wp","wp","wp","wp","wp","wp","wp"],
    ["wr","wn","wb","wq","wk","wb","wn","wr"],
  ];

  function initBoard() {
    board = INITIAL_BOARD.map(function (row) { return row.slice(); });
    turn = "w"; selected = null; legalMoves = [];
    captured = { w: [], b: [] }; gameOver = false;
    moveHistory = []; enPassantTarget = null;
    castlingRights = { w: { kingSide: true, queenSide: true }, b: { kingSide: true, queenSide: true } };
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function pieceColor(p) { return p ? p[0] : null; }
  function pieceType(p) { return p ? p[1] : null; }

  function pseudoMoves(r, c, brd) {
    brd = brd || board;
    var p = brd[r][c];
    if (!p) return [];
    var color = pieceColor(p);
    var type = pieceType(p);
    var moves = [];
    var enemy = color === "w" ? "b" : "w";

    function addIfValid(nr, nc) {
      if (!inBounds(nr, nc)) return false;
      var target = brd[nr][nc];
      if (target && pieceColor(target) === color) return false;
      moves.push([nr, nc]);
      return !target;
    }

    if (type === "p") {
      var dir = color === "w" ? -1 : 1;
      var startRow = color === "w" ? 6 : 1;
      if (inBounds(r + dir, c) && !brd[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !brd[r + dir * 2][c]) moves.push([r + dir * 2, c]);
      }
      [-1, 1].forEach(function (dc) {
        if (inBounds(r + dir, c + dc)) {
          var target = brd[r + dir][c + dc];
          if (target && pieceColor(target) === enemy) moves.push([r + dir, c + dc]);
          if (enPassantTarget && enPassantTarget[0] === r + dir && enPassantTarget[1] === c + dc) {
            moves.push([r + dir, c + dc]);
          }
        }
      });
    } else if (type === "n") {
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(function (d) {
        addIfValid(r + d[0], c + d[1]);
      });
    } else if (type === "b") {
      [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function (d) {
        for (var i = 1; i < 8; i++) { if (!addIfValid(r + d[0]*i, c + d[1]*i)) break; }
      });
    } else if (type === "r") {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(function (d) {
        for (var i = 1; i < 8; i++) { if (!addIfValid(r + d[0]*i, c + d[1]*i)) break; }
      });
    } else if (type === "q") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function (d) {
        for (var i = 1; i < 8; i++) { if (!addIfValid(r + d[0]*i, c + d[1]*i)) break; }
      });
    } else if (type === "k") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function (d) {
        addIfValid(r + d[0], c + d[1]);
      });
      /* Castling */
      var cr = castlingRights[color];
      var row = color === "w" ? 7 : 0;
      if (r === row && c === 4 && !brd[row][4]) {
        if (cr.kingSide && !brd[row][5] && !brd[row][6] && brd[row][7] === color + "r") {
          moves.push([row, 6]);
        }
        if (cr.queenSide && !brd[row][3] && !brd[row][2] && !brd[row][1] && brd[row][0] === color + "r") {
          moves.push([row, 2]);
        }
      }
    }
    return moves;
  }

  function findKing(color, brd) {
    brd = brd || board;
    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++)
        if (brd[r][c] === color + "k") return [r, c];
    return null;
  }

  function isAttacked(r, c, byColor, brd) {
    brd = brd || board;
    for (var rr = 0; rr < 8; rr++)
      for (var cc = 0; cc < 8; cc++)
        if (brd[rr][cc] && pieceColor(brd[rr][cc]) === byColor) {
          var moves = pseudoMoves(rr, cc, brd);
          for (var i = 0; i < moves.length; i++)
            if (moves[i][0] === r && moves[i][1] === c) return true;
        }
    return false;
  }

  function inCheck(color, brd) {
    var kp = findKing(color, brd);
    if (!kp) return false;
    return isAttacked(kp[0], kp[1], color === "w" ? "b" : "w", brd);
  }

  function makeMove(fr, fc, tr, tc, testBoard) {
    var brd = testBoard || board;
    var piece = brd[fr][fc];
    var capturedPiece = brd[tr][tc];
    var color = pieceColor(piece);
    var type = pieceType(piece);

    /* En passant capture */
    if (type === "p" && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
      var epRow = color === "w" ? tr + 1 : tr - 1;
      brd[epRow][tc] = null;
    }

    brd[tr][tc] = piece;
    brd[fr][fc] = null;

    /* Promotion */
    if (type === "p" && (tr === 0 || tr === 7)) brd[tr][tc] = color + "q";

    /* Castling */
    if (type === "k") {
      var row = fr;
      if (tc === fc + 2) { brd[row][5] = brd[row][7]; brd[row][7] = null; }
      if (tc === fc - 2) { brd[row][3] = brd[row][0]; brd[row][0] = null; }
    }

    return capturedPiece;
  }

  function legalMovesFor(r, c) {
    var p = board[r][c];
    if (!p) return [];
    var color = pieceColor(p);
    var moves = pseudoMoves(r, c);
    return moves.filter(function (m) {
      var test = board.map(function (row) { return row.slice(); });
      makeMove(r, c, m[0], m[1], test);
      return !inCheck(color, test);
    });
  }

  function hasLegalMoves(color) {
    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++)
        if (board[r][c] && pieceColor(board[r][c]) === color)
          if (legalMovesFor(r, c).length > 0) return true;
    return false;
  }

  /* ── AI ── */
  function evaluate() {
    var score = 0;
    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (!p) continue;
        var val = PIECE_VALUES[pieceType(p)];
        /* Center bonus */
        var centerBonus = (Math.abs(r - 3.5) + Math.abs(c - 3.5)) < 3 ? 0.3 : 0;
        score += (pieceColor(p) === "w" ? 1 : -1) * (val + centerBonus);
      }
    return score;
  }

  function minimax(depth, alpha, beta, maximizing) {
    if (depth === 0) return evaluate();
    var color = maximizing ? "w" : "b";
    var bestScore = maximizing ? -Infinity : Infinity;
    var allMoves = [];

    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++)
        if (board[r][c] && pieceColor(board[r][c]) === color) {
          var moves = legalMovesFor(r, c);
          moves.forEach(function (m) { allMoves.push([r, c, m[0], m[1]]); });
        }

    if (allMoves.length === 0) return maximizing ? -100 : 100;

    /* Basic move ordering: captures first */
    allMoves.sort(function (a, b) {
      var sa = board[a[2]][a[3]] ? PIECE_VALUES[pieceType(board[a[2]][a[3]])] : 0;
      var sb = board[b[2]][b[3]] ? PIECE_VALUES[pieceType(board[b[2]][b[3]])] : 0;
      return sb - sa;
    });

    for (var i = 0; i < Math.min(allMoves.length, 15); i++) {
      var m = allMoves[i];
      var saved = { ep: enPassantTarget, cr: JSON.parse(JSON.stringify(castlingRights)) };
      var cap = makeMove(m[0], m[1], m[2], m[3]);
      var prevTurn = turn;
      turn = turn === "w" ? "b" : "w";

      var score = minimax(depth - 1, alpha, beta, !maximizing);

      turn = prevTurn;
      makeMove(m[2], m[3], m[0], m[1]);
      if (cap) board[m[2]][m[3]] = cap;
      enPassantTarget = saved.ep;
      castlingRights = saved.cr;

      if (maximizing) { bestScore = Math.max(bestScore, score); alpha = Math.max(alpha, score); }
      else { bestScore = Math.min(bestScore, score); beta = Math.min(beta, score); }
      if (beta <= alpha) break;
    }
    return bestScore;
  }

  function aiMove() {
    var bestScore = -Infinity;
    var bestMove = null;
    var allMoves = [];

    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++)
        if (board[r][c] && pieceColor(board[r][c]) === "b") {
          var moves = legalMovesFor(r, c);
          moves.forEach(function (m) { allMoves.push([r, c, m[0], m[1]]); });
        }

    /* Shuffle for variety */
    for (var i = allMoves.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = allMoves[i]; allMoves[i] = allMoves[j]; allMoves[j] = tmp;
    }

    allMoves.sort(function (a, b) {
      var sa = board[a[2]][a[3]] ? PIECE_VALUES[pieceType(board[a[2]][a[3]])] : 0;
      var sb = board[b[2]][b[3]] ? PIECE_VALUES[pieceType(board[b[2]][b[3]])] : 0;
      return sb - sa;
    });

    for (var i = 0; i < Math.min(allMoves.length, 20); i++) {
      var m = allMoves[i];
      var saved = { ep: enPassantTarget, cr: JSON.parse(JSON.stringify(castlingRights)) };
      var cap = makeMove(m[0], m[1], m[2], m[3]);
      turn = "w";
      var score = minimax(2, -Infinity, Infinity, true);
      turn = "b";
      makeMove(m[2], m[3], m[0], m[1]);
      if (cap) board[m[2]][m[3]] = cap;
      enPassantTarget = saved.ep;
      castlingRights = saved.cr;

      if (score > bestScore) { bestScore = score; bestMove = m; }
    }

    if (bestMove) {
      var cap = board[bestMove[2]][bestMove[3]];
      if (cap) captured.b.push(cap);
      makeMove(bestMove[0], bestMove[1], bestMove[2], bestMove[3]);
      enPassantTarget = null;
      if (pieceType(board[bestMove[2]][bestMove[3]]) === "p" && Math.abs(bestMove[0] - bestMove[2]) === 2) {
        enPassantTarget = [(bestMove[0] + bestMove[2]) / 2, bestMove[1]];
      }
      turn = "w";
      moveHistory.push("B: " + String.fromCharCode(97 + bestMove[1]) + (8 - bestMove[2]));
    }
  }

  function renderBoard() {
    if (!win || !win.content) return;
    var boardEl = win.content.querySelector("#chess-board");
    if (!boardEl) return;
    var html = "";
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var isLight = (r + c) % 2 === 0;
        var isSelected = selected && selected[0] === r && selected[1] === c;
        var isLegal = legalMoves.some(function (m) { return m[0] === r && m[1] === c; });
        var cls = "chess-sq " + (isLight ? "light" : "dark") + (isSelected ? " selected" : "") + (isLegal ? " legal" : "");
        var piece = board[r][c];
        html += '<div class="' + cls + '" data-r="' + r + '" data-c="' + c + '">';
        if (piece) html += '<span class="chess-piece">' + PIECE_UNICODE[piece] + '</span>';
        if (isLegal) html += '<span class="chess-dot"></span>';
        html += '</div>';
      }
    }
    boardEl.innerHTML = html;

    /* Update status */
    var statusEl = win.content.querySelector("#chess-status");
    if (statusEl) {
      if (gameOver) statusEl.textContent = "Game Over";
      else if (inCheck("w", board)) statusEl.textContent = "White is in check!";
      else statusEl.textContent = "White's turn (you)";
    }

    /* Update captured */
    var capEl = win.content.querySelector("#chess-captured");
    if (capEl) {
      capEl.innerHTML = '<div class="chess-cap-row"><b>Black captured:</b> ' +
        captured.b.map(function (p) { return PIECE_UNICODE[p]; }).join(" ") + '</div>' +
        '<div class="chess-cap-row"><b>White captured:</b> ' +
        captured.w.map(function (p) { return PIECE_UNICODE[p]; }).join(" ") + '</div>';
    }

    /* Update moves */
    var movesEl = win.content.querySelector("#chess-moves");
    if (movesEl) movesEl.textContent = moveHistory.slice(-15).join("\n");
  }

  function handleClick(e) {
    if (gameOver || turn !== "w") return;
    var sq = e.target.closest(".chess-sq");
    if (!sq) return;
    var r = parseInt(sq.dataset.r), c = parseInt(sq.dataset.c);

    if (selected) {
      var isLegal = legalMoves.some(function (m) { return m[0] === r && m[1] === c; });
      if (isLegal) {
        var cap = board[r][c];
        if (cap) captured.w.push(cap);

        /* En passant capture */
        if (pieceType(board[selected[0]][selected[1]]) === "p" && enPassantTarget && r === enPassantTarget[0] && c === enPassantTarget[1]) {
          var epRow = selected[0];
          captured.w.push(board[epRow][c]);
        }

        makeMove(selected[0], selected[1], r, c);
        enPassantTarget = null;
        if (pieceType(board[r][c]) === "p" && Math.abs(r - selected[0]) === 2) {
          enPassantTarget = [(selected[0] + r) / 2, c];
        }

        moveHistory.push("W: " + String.fromCharCode(97 + c) + (8 - r));
        selected = null; legalMoves = [];
        turn = "b";
        renderBoard();

        /* Check game end */
        if (!hasLegalMoves("b")) {
          gameOver = true;
          renderBoard();
          return;
        }

        /* AI move after short delay */
        setTimeout(function () {
          aiMove();
          renderBoard();
          if (!hasLegalMoves("w")) {
            gameOver = true;
            renderBoard();
          }
        }, 300);
        return;
      }
      /* Clicked on own piece = reselect */
      if (board[r][c] && pieceColor(board[r][c]) === "w") {
        selected = [r, c];
        legalMoves = legalMovesFor(r, c);
        renderBoard();
        return;
      }
      /* Deselect */
      selected = null; legalMoves = [];
      renderBoard();
      return;
    }

    /* No selection yet — select white piece */
    if (board[r][c] && pieceColor(board[r][c]) === "w") {
      selected = [r, c];
      legalMoves = legalMovesFor(r, c);
      renderBoard();
    }
  }

  var app = {
    id: "chess",
    name: "Chess",
    icon: "assets/icons/chess.svg",
    group: "games",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.textContent =
          ".chess-layout{display:flex;height:100%;gap:0;}" +
          ".chess-left{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;background:rgba(255,255,255,0.02);}" +
          "#chess-board{display:grid;grid-template-columns:repeat(8,1fr);width:min(360px,100%);aspect-ratio:1;gap:0;border:2px solid rgba(255,255,255,0.15);border-radius:4px;overflow:hidden;}" +
          ".chess-sq{display:flex;align-items:center;justify-content:center;position:relative;aspect-ratio:1;cursor:pointer;transition:background 0.1s;}" +
          ".chess-sq.light{background:#f0d9b5;}" +
          ".chess-sq.dark{background:#b58863;}" +
          ".chess-sq.selected{background:#8297d9!important;}" +
          ".chess-sq.legal::after{content:'';width:28%;height:28%;border-radius:50%;background:rgba(0,0,0,0.15);}" +
          ".chess-sq.legal:not(:has(.chess-piece))::after{background:rgba(0,0,0,0.2);}" +
          ".chess-piece{font-size:min(42px,10vw);line-height:1;filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.3));z-index:1;pointer-events:none;}" +
          ".chess-right{width:180px;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,0.08);font-size:12px;overflow-y:auto;}" +
          "#chess-status{padding:8px 12px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);}" +
          "#chess-captured{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);}" +
          ".chess-cap-row{margin-bottom:4px;}" +
          "#chess-moves{flex:1;padding:8px 12px;font-family:Consolas,monospace;font-size:11px;white-space:pre;overflow-y:auto;}" +
          ".chess-btns{padding:8px 12px;border-top:1px solid rgba(255,255,255,0.06);}";
        document.head.appendChild(styleEl);
      }

      initBoard();

      win = OS.wm.createWindow({
        title: "Chess",
        icon: this.icon,
        width: 540,
        height: 420,
        resizable: true,
        app: "chess",
        onClose: function () { win = null; },
      });

      win.content.innerHTML =
        '<div class="chess-layout">' +
        '<div class="chess-left"><div id="chess-board"></div></div>' +
        '<div class="chess-right">' +
        '<div id="chess-status">Your turn (white)</div>' +
        '<div id="chess-captured"></div>' +
        '<div id="chess-moves"></div>' +
        '<div class="chess-btns"><button class="btn" id="chess-new">New Game</button></div>' +
        '</div></div>';

      win.content.querySelector("#chess-board").addEventListener("click", handleClick);
      win.content.querySelector("#chess-new").addEventListener("click", function () {
        initBoard(); renderBoard();
      });

      renderBoard();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.chess = app;
})();
