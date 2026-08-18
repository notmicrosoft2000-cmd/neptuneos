/* =========================================================
 * neptuneOS — Clock
 * Analog + digital clock with date and timezone info.
 * ========================================================= */
(function () {
  "use strict";

  const app = {
    id: "clock",
    name: "Clock",
    icon: "assets/icons/clock.svg",
    group: "system",

    launch() {
      let timer = null;
      const win = OS.wm.createWindow({
        title: "Clock",
        icon: this.icon,
        width: 300,
        height: 380,
        resizable: false,
        app: "clock",
        onClose() { if (timer) clearInterval(timer); },
      });

      /* ── HTML ─────────────────────────────────────────── */
      win.content.innerHTML =
        '<div class="clock-app" style="display:flex;flex-direction:column;align-items:center;padding:16px;background:#1a3a5c;font-family:Segoe UI,Tahoma,sans-serif;user-select:none;">' +
        '  <canvas id="clock-canvas" width="220" height="220"></canvas>' +
        '  <div id="clock-digital" style="margin-top:12px;color:#d0e4f7;font-size:28px;font-weight:bold;letter-spacing:2px;"></div>' +
        '  <div id="clock-date" style="margin-top:4px;color:#8ab4d8;font-size:13px;"></div>' +
        '  <div id="clock-tz" style="margin-top:8px;color:#6a9ac0;font-size:11px;"></div>' +
        "</div>";

      const canvas = win.content.querySelector("#clock-canvas");
      const ctx = canvas.getContext("2d");
      const digitalEl = win.content.querySelector("#clock-digital");
      const dateEl = win.content.querySelector("#clock-date");
      const tzEl = win.content.querySelector("#clock-tz");

      /* ── Timezone info ────────────────────────────────── */
      const tzInfo = (function () {
        try {
          if (typeof OS !== "undefined" && OS.setup && typeof OS.setup.getTimezone === "function") {
            return OS.setup.getTimezone();
          }
        } catch (_) { /* ignore */ }
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      })();
      if (tzInfo) tzEl.textContent = tzInfo;

      /* ── XP-blue palette ─────────────────────────────── */
      const FACE_BG   = "#1a3a5c";
      const FACE_RING  = "#2a6ab4";
      const MARK_HOUR  = "#d0e4f7";
      const MARK_MIN   = "#3a7ac8";
      const HAND_HOUR  = "#d0e4f7";
      const HAND_MIN   = "#8ab4d8";
      const HAND_SEC   = "#e04040";
      const DOT_CENTER = "#e04040";

      const CX = canvas.width / 2;
      const CY = canvas.height / 2;
      const R  = Math.min(CX, CY) - 6;

      /* ── Draw helpers ─────────────────────────────────── */
      const drawFace = () => {
        /* outer ring */
        ctx.beginPath();
        ctx.arc(CX, CY, R + 4, 0, Math.PI * 2);
        ctx.fillStyle = FACE_RING;
        ctx.fill();

        /* face background */
        const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
        grad.addColorStop(0, "#224a6e");
        grad.addColorStop(1, FACE_BG);
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      };

      const drawMarkers = () => {
        for (let i = 0; i < 60; i++) {
          const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const isHour = i % 5 === 0;
          const outerR = R - 4;
          const innerR = isHour ? R - 20 : R - 10;
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(angle) * outerR, CY + Math.sin(angle) * outerR);
          ctx.lineTo(CX + Math.cos(angle) * innerR, CY + Math.sin(angle) * innerR);
          ctx.strokeStyle = isHour ? MARK_HOUR : MARK_MIN;
          ctx.lineWidth = isHour ? 2.5 : 1;
          ctx.lineCap = "round";
          ctx.stroke();

          /* hour numbers */
          if (isHour) {
            const numR = R - 30;
            ctx.fillStyle = MARK_HOUR;
            ctx.font = "bold 13px Segoe UI, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const h = i === 0 ? 12 : i / 5;
            ctx.fillText(String(h), CX + Math.cos(angle) * numR, CY + Math.sin(angle) * numR);
          }
        }
      };

      const drawHand = (angle, length, width, color) => {
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-width / 2, 0);
        ctx.lineTo(0, length);
        ctx.lineTo(width / 2, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      };

      const drawCenterDot = () => {
        ctx.beginPath();
        ctx.arc(CX, CY, 5, 0, Math.PI * 2);
        ctx.fillStyle = DOT_CENTER;
        ctx.fill();
      };

      /* ── Tick ─────────────────────────────────────────── */
      const tick = () => {
        const now = new Date();
        const h = now.getHours() % 12;
        const m = now.getMinutes();
        const s = now.getSeconds();
        const ms = now.getMilliseconds();

        const sFrac = s + ms / 1000;
        const mFrac = m + sFrac / 60;
        const hFrac = h + mFrac / 60;

        const sAngle = (sFrac / 60) * Math.PI * 2 - Math.PI / 2;
        const mAngle = (mFrac / 60) * Math.PI * 2 - Math.PI / 2;
        const hAngle = (hFrac / 12) * Math.PI * 2 - Math.PI / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawFace();
        drawMarkers();
        drawHand(hAngle, R * 0.5, 6, HAND_HOUR);
        drawHand(mAngle, R * 0.72, 4, HAND_MIN);
        drawHand(sAngle, R * 0.85, 1.5, HAND_SEC);
        drawCenterDot();

        /* digital */
        const pad = (n) => String(n).padStart(2, "0");
        digitalEl.textContent = pad(now.getHours()) + ":" + pad(m) + ":" + pad(s);

        /* date */
        const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        dateEl.textContent = now.toLocaleDateString(undefined, opts);
      };

      tick();
      timer = setInterval(tick, 1000);
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.clock = app;
})();
