/* =========================================================
 * neptuneOS — Sound effects
 * The startup chime plays on the first click, then soft UI
 * blips. All synthesized with WebAudio.
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

    /* Startup chime — ascending major chord arpeggio */
    startup() {
      if (!this.ctx) return;
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.note(f, 0.35, "triangle", 0.06, i * 0.12));
    },

    /* Shutdown — descending tones */
    shutdown() {
      if (!this.ctx) return;
      [784, 659, 523, 392].forEach((f, i) => this.note(f, 0.3, "triangle", 0.05, i * 0.15));
    },

    /* Logon — cheerful ascending 3-note */
    logon() {
      if (!this.ctx) return;
      [440, 554, 659].forEach((f, i) => this.note(f, 0.2, "sine", 0.05, i * 0.1));
    },

    /* Window open — soft pop */
    windowOpen() { this.note(880, 0.08, "sine", 0.02); },

    /* Window close — soft drop */
    windowClose() { this.note(440, 0.1, "sine", 0.02); },

    /* Notification ding */
    notify() {
      if (!this.ctx) return;
      this.note(880, 0.15, "sine", 0.04);
      this.note(1109, 0.15, "sine", 0.04, 0.12);
    },

    /* Delete / trash */
    trash() { this.note(200, 0.15, "sawtooth", 0.03); },

    /* File copy / move */
    copy() { this.note(1200, 0.06, "sine", 0.025); this.note(1500, 0.06, "sine", 0.025, 0.06); },

    /* Error / critical */
    critical() {
      if (!this.ctx) return;
      this.note(200, 0.2, "square", 0.06);
      this.note(150, 0.3, "square", 0.06, 0.2);
    },

    /* Minimize swoosh */
    minimize() { this.note(660, 0.08, "sine", 0.015); this.note(440, 0.08, "sine", 0.015, 0.04); },

    /* Maximize pop */
    maximize() { this.note(440, 0.06, "sine", 0.015); this.note(660, 0.08, "sine", 0.015, 0.04); },

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
