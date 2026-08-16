/* =========================================================
 * neptuneOS — Paint
 * Canvas drawing with pencil, eraser, shapes, flood fill.
 * ========================================================= */
(function () {
  "use strict";

  const TOOLS = [
    { id: "pencil", label: "Pencil", icon: "✎" },
    { id: "eraser", label: "Eraser", icon: "▦" },
    { id: "line", label: "Line", icon: "╱" },
    { id: "rect", label: "Rect", icon: "▭" },
    { id: "ellipse", label: "Oval", icon: "◯" },
    { id: "fill", label: "Fill", icon: "🪣" },
  ];

  const PALETTE = [
    "#000000", "#808080", "#ffffff", "#c0c0c0",
    "#800000", "#ff0000", "#808000", "#ffff00",
    "#008000", "#00ff00", "#008080", "#00ffff",
    "#000080", "#0000ff", "#800080", "#ff00ff",
  ];

  const W = 800, H = 520;

  const app = {
    id: "paint",
    name: "Paint",
    icon: "assets/icons/paint.svg",
    group: "apps",

    launch() {
      const win = OS.wm.createWindow({
        title: "untitled - Paint",
        icon: this.icon,
        width: 760,
        height: 480,
        app: "paint",
      });

      win.content.innerHTML =
        '<div class="paint-wrap">' +
        '  <div class="paint-tools"></div>' +
        '  <div class="paint-canvas-area"><canvas id="paint-canvas" width="' + W + '" height="' + H + '"></canvas></div>' +
        '  <div class="paint-colors"></div>' +
        "</div>";

      const canvas = win.content.querySelector("#paint-canvas");
      const ctx = canvas.getContext("2d");
      const toolsEl = win.content.querySelector(".paint-tools");
      const colorsEl = win.content.querySelector(".paint-colors");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      let tool = "pencil";
      let color = "#000000";
      let drawing = null;
      let snapshot = null;

      /* ---- tools ---- */
      TOOLS.forEach((t) => {
        const b = document.createElement("button");
        b.className = "tool-btn" + (t.id === tool ? " active" : "");
        b.title = t.label;
        b.dataset.tool = t.id;
        b.innerHTML = '<div style="font-size:16px;line-height:1;">' + t.icon + '</div><div style="font-size:9px;margin-top:2px;">' + t.label + "</div>";
        b.addEventListener("click", () => {
          tool = t.id;
          toolsEl.querySelectorAll(".tool-btn").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        });
        toolsEl.appendChild(b);
      });

      const fillBtn = document.createElement("button");
      fillBtn.className = "tool-btn";
      fillBtn.title = "Clear";
      fillBtn.innerHTML = '<div style="font-size:13px;line-height:1;">✕</div><div style="font-size:9px;margin-top:2px;">Clear</div>';
      fillBtn.addEventListener("click", () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
      });
      toolsEl.appendChild(fillBtn);

      const aboutBtn = document.createElement("button");
      aboutBtn.className = "tool-btn";
      aboutBtn.title = "About Paint";
      aboutBtn.innerHTML = '<div style="font-size:13px;line-height:1;">?</div><div style="font-size:9px;margin-top:2px;">About</div>';
      aboutBtn.addEventListener("click", () => OS.about("Paint", app.icon));
      toolsEl.appendChild(aboutBtn);

      /* ---- palette ---- */
      PALETTE.forEach((c) => {
        const s = document.createElement("div");
        s.className = "color-swatch" + (c === color ? " sel" : "");
        s.style.background = c;
        s.addEventListener("click", () => {
          color = c;
          colorsEl.querySelectorAll(".color-swatch").forEach((x) => x.classList.remove("sel"));
          s.classList.add("sel");
        });
        colorsEl.appendChild(s);
      });

      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = "#000000";
      picker.style.cssText = "grid-column:span 2;width:100%;height:22px;padding:0;border:1px solid #000;background:none;cursor:pointer;";
      picker.addEventListener("input", () => {
        color = picker.value;
        colorsEl.querySelectorAll(".color-swatch").forEach((x) => x.classList.remove("sel"));
      });
      colorsEl.appendChild(picker);

      /* ---- drawing ---- */
      function toCanvas(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = W / rect.width, sy = H / rect.height;
        return {
          x: Math.round((e.clientX - rect.left) * sx),
          y: Math.round((e.clientY - rect.top) * sy),
        };
      }

      function drawDot(p) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tool === "eraser" ? 4 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawSegment(a, b) {
        ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        ctx.lineWidth = tool === "eraser" ? 9 : 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      function drawShape(p) {
        if (tool === "rect") {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.strokeRect(Math.min(p.x, drawing.x), Math.min(p.y, drawing.y), Math.abs(p.x - drawing.x), Math.abs(p.y - drawing.y));
        } else if (tool === "ellipse") {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse((p.x + drawing.x) / 2, (p.y + drawing.y) / 2, Math.abs(p.x - drawing.x) / 2, Math.abs(p.y - drawing.y) / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (tool === "line") {
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(drawing.x, drawing.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      function floodFill(x, y) {
        const img = ctx.getImageData(0, 0, W, H);
        const data = img.data;
        const idx = (y * W + x) * 4;
        const target = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        const match = (i) => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];
        const paint = (i) => { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; };
        if (match(idx) && (r !== target[0] || g !== target[1] || b !== target[2])) {
          const stack = [[x, y]];
          while (stack.length) {
            const [px, py] = stack.pop();
            const i = (py * W + px) * 4;
            if (px < 0 || py < 0 || px >= W || py >= H || !match(i)) continue;
            paint(i);
            stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
          }
          ctx.putImageData(img, 0, 0);
        }
      }

      canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const p = toCanvas(e);
        if (tool === "fill") { floodFill(p.x, p.y); return; }
        drawing = p;
        snapshot = ctx.getImageData(0, 0, W, H);
        if (tool === "pencil") drawDot(p);
        else if (tool === "eraser") { ctx.strokeStyle = "#fff"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y); ctx.stroke(); }
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const p = toCanvas(e);
        if (tool === "pencil") drawSegment(drawing, p);
        else if (tool === "eraser") drawSegment(drawing, p);
        else {
          ctx.putImageData(snapshot, 0, 0);
          drawShape(p);
        }
        drawing = p;
      });

      canvas.addEventListener("pointerup", () => {
        drawing = null;
        snapshot = null;
      });

      canvas.addEventListener("pointerleave", () => {
        drawing = null;
        snapshot = null;
      });
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.paint = app;
})();
