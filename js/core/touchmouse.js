/* =========================================================
 * neptuneOS — Virtual touch mouse
 * On touchscreens the OS keeps a real mouse: your finger moves
 * a cursor, one tap is a left click, double-tap (or press-and-
 * hold) is a right click, and dragging works like holding the
 * left button. Everything is synthesized as real mouse events
 * so the whole OS works with touch.
 * ========================================================= */
(function () {
  "use strict";

  const DBL_MS = 350;
  const LONG_MS = 550;
  const MOVE_TOL = 10;

  let cursorEl = null;
  let state = null;
  let lastTap = { t: 0, x: -9999, y: -9999 };

  function ensureCursor() {
    if (cursorEl) return;
    cursorEl = document.createElement("div");
    cursorEl.id = "virtual-cursor";
    cursorEl.innerHTML = '<img src="assets/cursors/arrow.svg" width="24" height="24" alt="" draggable="false">';
    document.body.appendChild(cursorEl);
  }

  function show(x, y) {
    ensureCursor();
    cursorEl.style.display = "block";
    cursorEl.style.left = x + "px";
    cursorEl.style.top = y + "px";
    cursorEl.classList.toggle("down", !!state);
  }

  function hide() {
    if (cursorEl) cursorEl.style.display = "none";
  }

  function target(x, y) {
    return document.elementFromPoint(x, y) || document.body;
  }

  function dispatch(type, x, y, el, button) {
    const ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: button === undefined ? 0 : button,
    });
    el.dispatchEvent(ev);
  }

  function setRangeFromX(input, x) {
    const r = input.getBoundingClientRect();
    if (!r.width) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const frac = Math.min(1, Math.max(0, (x - r.left) / r.width));
    input.value = String(min + frac * (max - min));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* ---------- public: programmatic clicks (also used by touch) ---------- */
  function clickAt(x, y) {
    const el = target(x, y);
    dispatch("mousedown", x, y, el, 0);
    dispatch("mouseup", x, y, el, 0);
    dispatch("click", x, y, el, 0);
    focusIfEditable(el);
  }

  function rightClickAt(x, y) {
    dispatch("contextmenu", x, y, target(x, y), 2);
  }

  function focusIfEditable(el) {
    const t = el && (el.matches("input, textarea, select") ? el : el.closest("input, textarea, select"));
    if (t) {
      try { t.focus(); } catch (e) {}
    }
  }

  /* ---------- touch handlers ---------- */
  function onStart(e) {
    if (state || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault();
    const x = t.clientX, y = t.clientY;
    state = { id: t.identifier, x, y, sx: x, sy: y, t0: Date.now(), moved: false, longFired: false, rightTap: false };
    show(x, y);

    /* double-tap = right click */
    const now = Date.now();
    if (now - lastTap.t <= DBL_MS && Math.abs(x - lastTap.x) <= MOVE_TOL * 2 && Math.abs(y - lastTap.y) <= MOVE_TOL * 2) {
      state.rightTap = true;
      lastTap.t = 0;
      rightClickAt(x, y);
      return;
    }

    /* press-and-hold (without moving) also = right click */
    setTimeout(() => {
      if (!state || state.moved || state.rightTap || state.longFired) return;
      state.longFired = true;
      rightClickAt(state.x, state.y);
    }, LONG_MS);

    const el = target(x, y);
    if (el.closest && el.closest('input[type="range"]')) setRangeFromX(el.closest('input[type="range"]'), x);
    dispatch("mousedown", x, y, el, 0);
  }

  function onMove(e) {
    if (!state) return;
    for (const t of e.touches) {
      if (t.identifier === state.id) {
        e.preventDefault();
        const x = t.clientX, y = t.clientY;
        state.x = x;
        state.y = y;
        if (!state.moved && Math.hypot(x - state.sx, y - state.sy) > MOVE_TOL) state.moved = true;
        show(x, y);
        const el = target(x, y);
        if (state.moved && el.closest && el.closest('input[type="range"]')) setRangeFromX(el.closest('input[type="range"]'), x);
        dispatch("mousemove", x, y, window, 0);
        break;
      }
    }
  }

  function onEnd(e) {
    if (!state) return;
    e.preventDefault();
    const x = state.x, y = state.y;
    const wasTap = !state.moved && !state.longFired && !state.rightTap;
    const wasLong = state.longFired;
    const wasRight = state.rightTap;
    state = null;
    if (wasLong || wasRight) {
      hide();
      return;
    }
    if (wasTap) {
      const el = target(x, y);
      dispatch("mouseup", x, y, el, 0);
      dispatch("click", x, y, el, 0);
      focusIfEditable(el);
      lastTap = { t: Date.now(), x, y };
    } else {
      dispatch("mouseup", x, y, window, 0);
      lastTap = { t: 0, x, y };
    }
    setTimeout(hide, 120);
  }

  function onCancel() {
    if (!state) return;
    state = null;
    hide();
  }

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouch) {
    document.addEventListener("touchstart", onStart, { passive: false });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: false });
    document.addEventListener("touchcancel", onCancel, { passive: false });
  }

  window.OS = window.OS || {};
  OS.touchmouse = {
    active: isTouch,
    clickAt,
    rightClickAt,
    /* test hooks */
    _ensureCursor: ensureCursor,
    _leftClick: clickAt,
    _rightClick: rightClickAt,
  };
})();
