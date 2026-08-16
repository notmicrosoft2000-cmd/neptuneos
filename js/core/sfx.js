/* =========================================================
 * neptuneOS — Sound effects
 * "It boots. It beeps." The startup chime plays on the first
 * click, then soft UI blips. All synthesized with WebAudio.
 * ========================================================= */
(function () {
  "use strict";

  const sfx = {
    ctx: null,
    enabled: true,
    unlocked: false,

    /* Shared AudioContext for all of neptuneOS (sfx + media player).
       Created/resumed inside user gestures so autoplay policy allows it. */
    context() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      }
      if (this.ctx.state === "suspended") {
        try { this.ctx.resume(); } catch (e) {}
      }
      return this.ctx;
    },

    init() {
      const unlock = () => {
        if (this.unlocked) return;
        this.unlocked = true;
        if (this.context()) this.chime();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        this.wireClicks();
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    },

    note(freq, dur, type, vol, when) {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime + (when || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.04, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },

    /* The classic short ascending arpeggio. */
    chime() {
      if (!this.ctx) return;
      [523, 659, 784, 1047].forEach((f, i) => this.note(f, 0.22, "triangle", 0.05, i * 0.09));
    },

    click() { this.note(640, 0.05, "square", 0.018); },
    hover() { this.note(1960, 0.016, "triangle", 0.008); },
    beep() { this.note(880, 0.12, "square", 0.05); },
    error() { this.note(220, 0.18, "square", 0.05); },

    wireClicks() {
      document.addEventListener("click", (e) => {
        if (e.target.closest(".btn, .title-btn, .desktop-icon, .window-task, .taskbar-btn, .start-program, .tool-btn, [data-k]")) {
          this.click();
        }
      }, { capture: true });
    },

    /* standalone beep command for the terminal */
    beepNow() {
      if (!this.context()) return;
      this.beep();
    },
  };

  window.OS = window.OS || {};
  window.OS.sfx = sfx;
})();
