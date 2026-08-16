/* =========================================================
 * neptuneOS — Calculator
 * Classic immediate-execution four-function calculator.
 * ========================================================= */
(function () {
  "use strict";

  const app = {
    id: "calculator",
    name: "Calculator",
    icon: "assets/icons/calc.svg",
    group: "apps",

    launch() {
      const win = OS.wm.createWindow({
        title: "Calculator",
        icon: this.icon,
        width: 260,
        height: 320,
        resizable: false,
        app: "calculator",
      });

      win.content.innerHTML =
        '<div class="calc">' +
        '  <div class="calc-display" id="calc-display">0</div>' +
        '  <div class="calc-grid">' +
        '    <button class="btn" data-k="C">C</button>' +
        '    <button class="btn" data-k="CE">CE</button>' +
        '    <button class="btn" data-k="back">&larr;</button>' +
        '    <button class="btn" data-k="/">&divide;</button>' +
        '    <button class="btn" data-k="7">7</button>' +
        '    <button class="btn" data-k="8">8</button>' +
        '    <button class="btn" data-k="9">9</button>' +
        '    <button class="btn" data-k="*">&times;</button>' +
        '    <button class="btn" data-k="4">4</button>' +
        '    <button class="btn" data-k="5">5</button>' +
        '    <button class="btn" data-k="6">6</button>' +
        '    <button class="btn" data-k="-">&#8722;</button>' +
        '    <button class="btn" data-k="1">1</button>' +
        '    <button class="btn" data-k="2">2</button>' +
        '    <button class="btn" data-k="3">3</button>' +
        '    <button class="btn" data-k="+">+</button>' +
        '    <button class="btn" data-k="neg">&plusmn;</button>' +
        '    <button class="btn" data-k="0">0</button>' +
        '    <button class="btn" data-k=".">.</button>' +
        '    <button class="btn" data-k="=">=</button>' +
        "  </div>" +
        "</div>";

      const display = win.content.querySelector("#calc-display");
      const state = { acc: null, op: null, entry: "0", fresh: true };

      const apply = (a, b, op) => {
        a = Number(a); b = Number(b);
        switch (op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b === 0 ? "Error" : a / b;
          default: return b;
        }
      };

      const fmt = (n) => {
        if (n === "Error") return "Error";
        if (!isFinite(n)) return "Error";
        const s = Number(n).toPrecision(12);
        return String(Number(s));
      };

      const setDisplay = (v) => {
        display.textContent = fmt(v).length > 14 ? "Error" : fmt(v);
      };

      const press = (key) => {
        if (display.textContent === "Error") state.acc = null;

        if (key === "=" && state.op === null) {
          return; /* keep the current result on the display */
        }

        if (/\d/.test(key)) {
          if (state.fresh) { state.entry = key; state.fresh = false; }
          else state.entry = (state.entry === "0" ? "" : state.entry) + key;
        } else if (key === ".") {
          if (state.fresh) { state.entry = "0."; state.fresh = false; }
          else if (!state.entry.includes(".")) state.entry += ".";
        } else if (["+", "-", "*", "/"].includes(key)) {
          if (state.op !== null && !state.fresh) {
            state.acc = apply(state.acc, state.entry, state.op);
            setDisplay(state.acc);
            if (state.acc === "Error") { state.op = null; state.acc = null; return; }
          } else if (state.op === null) {
            state.acc = state.entry;
          }
          state.op = key;
          state.fresh = true;
        } else if (key === "=") {
          if (state.op !== null) {
            const result = apply(state.acc, state.entry, state.op);
            state.entry = fmt(result);
            state.acc = null;
            state.op = null;
            state.fresh = true;
            setDisplay(result);
            return;
          }
        } else if (key === "C") {
          state.acc = null; state.op = null; state.entry = "0"; state.fresh = true;
        } else if (key === "CE") {
          state.entry = "0"; state.fresh = true;
        } else if (key === "back") {
          if (state.fresh) return;
          state.entry = state.entry.slice(0, -1) || "0";
          if (state.entry === "-") state.entry = "0";
        } else if (key === "neg") {
          if (state.fresh) return;
          state.entry = state.entry.startsWith("-") ? state.entry.slice(1) : "-" + state.entry;
        }
        setDisplay(state.fresh ? (state.acc === null ? "0" : state.acc) : state.entry);
      };

      win.content.querySelectorAll("[data-k]").forEach((b) => {
        b.addEventListener("click", () => press(b.dataset.k));
      });

      win.content.addEventListener("keydown", (e) => {
        const map = { "Enter": "=", "*": "*", "/": "/", "+": "+", "-": "-", ".": "." };
        const k = map[e.key] || (/\d/.test(e.key) ? e.key : null);
        if (k) { e.preventDefault(); press(k); }
        else if (e.key === "Backspace") { e.preventDefault(); press("back"); }
        else if (e.key === "Escape") { e.preventDefault(); press("C"); }
      });
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.calculator = app;
})();
