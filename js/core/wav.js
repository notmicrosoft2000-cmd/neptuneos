/* =========================================================
 * neptuneOS — Chiptune WAV generator
 * Synthesizes retro tracks at runtime so there is always
 * something to play in Media Player. Pure JS, no assets.
 * ========================================================= */
(function () {
  "use strict";

  const SAMPLE_RATE = 11025; // 8-bit lo-fi chiptune sampling rate

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* Envelope: quick attack, exponential decay. */
  function envelope(i, n) {
    const attack = Math.min(1, i / (SAMPLE_RATE * 0.012));
    return attack * Math.pow(1 - i / n, 1.6);
  }

  function renderTrack(track, beats, beatSec, out, start) {
    const n = Math.floor(beats * beatSec * SAMPLE_RATE);
    const note = track[0];
    const vol = track[2] === undefined ? 0.5 : track[2];
    const wave = track[3] || "square";
    const freq = note ? midiToFreq(note) : 0;
    const step = (freq * 2 * Math.PI) / SAMPLE_RATE;
    let phase = 0;
    let t = start;
    for (let i = 0; i < n && t < out.length; i++, t++) {
      const env = envelope(i, n) * vol;
      let s = 0;
      if (freq > 0) {
        if (wave === "triangle") s = (2 / Math.PI) * Math.asin(Math.sin(phase));
        else if (wave === "sine") s = Math.sin(phase);
        else s = Math.sin(phase) > 0 ? 1 : -1; /* square */
      }
      out[t] = Math.max(0, Math.min(255, Math.round(out[t] + 128 + s * 108 * env - 128)));
      phase += step;
    }
    return t;
  }

  function makeSong(song) {
    const beatSec = 60 / song.tempo;
    const totalBeats = song.tracks.reduce((sum, t) => sum + t[1], 0);
    const seconds = totalBeats * beatSec;
    const N = Math.floor(seconds * SAMPLE_RATE);
    const data = new Uint8Array(N);
    data.fill(128);

    /* mix all tracks sequentially (melody then bass over the same span) */
    let start = 0;
    song.tracks.forEach((t) => {
      start = renderTrack(t, t[1], beatSec, data, start);
    });

    /* a simple bass layer underneath */
    if (song.bass) {
      let bt = 0;
      song.bass.forEach(([note, beats]) => {
        bt = renderTrack([note, beats, 0.4, "triangle"], beats, beatSec, data, bt);
      });
    }

    return wavDataUrl(data, N);
  }

  function wavDataUrl(data, n) {
    const buf = new ArrayBuffer(44 + n);
    const dv = new DataView(buf);
    const wstr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    wstr(0, "RIFF"); dv.setUint32(4, 36 + n, true); wstr(8, "WAVE");
    wstr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, SAMPLE_RATE, true); dv.setUint32(28, SAMPLE_RATE, true);
    dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    wstr(36, "data"); dv.setUint32(40, n, true);
    new Uint8Array(buf, 44).set(data);

    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return "data:audio/wav;base64," + btoa(bin);
  }

  /* ---------- the record (tracklist.txt was right) ---------- */
  const SONGS = {
    "pixel-dreams.wav": {
      tempo: 124,
      tracks: [
        [72, 0.5], [67, 0.5], [64, 0.5], [67, 0.5],
        [72, 1], [69, 1], [65, 1],
        [74, 0.5], [69, 0.5], [65, 0.5], [69, 0.5],
        [72, 1], [67, 1], [64, 1],
        [72, 0.5], [67, 0.5], [64, 0.5], [67, 0.5],
        [76, 1], [72, 1], [71, 1],
        [69, 0.5], [71, 0.5], [72, 1], [67, 1], [64, 2],
      ],
      bass: [
        [48, 2], [45, 2], [50, 2], [48, 2],
        [48, 2], [45, 2], [47, 2], [43, 2],
        [48, 2], [45, 2], [50, 2], [48, 2],
        [48, 2], [43, 2], [40, 2], [36, 2],
      ],
    },
    "dial-up-lullaby.wav": {
      tempo: 70,
      tracks: [
        [57, 2], [60, 2], [64, 2], [60, 2],
        [57, 2], [62, 2], [65, 2], [62, 2],
        [57, 2], [60, 2], [64, 2], [67, 2],
        [69, 2], [67, 2], [64, 4],
      ],
      bass: [
        [45, 4], [43, 4], [45, 4], [41, 4],
        [45, 4], [43, 4], [40, 4], [36, 4],
      ],
    },
    "the-startup-chime.wav": {
      tempo: 96,
      tracks: [
        [60, 0.75], [64, 0.75], [67, 0.75], [72, 1.5],
        [72, 0.5], [74, 0.5], [76, 1.5], [74, 0.75], [72, 0.75],
        [67, 1], [64, 1], [72, 3],
      ],
    },
    "floppy-disc-fandango.wav": {
      tempo: 152,
      tracks: [
        [67, 0.25], [69, 0.25], [71, 0.5], [72, 0.5], [71, 0.5],
        [69, 0.25], [67, 0.25], [64, 1],
        [67, 0.25], [69, 0.25], [71, 0.5], [74, 0.5], [72, 0.5],
        [71, 0.25], [69, 0.25], [67, 1],
        [65, 0.25], [67, 0.25], [69, 0.5], [72, 0.5], [74, 0.5],
        [72, 0.25], [69, 0.25], [65, 1],
        [64, 0.25], [65, 0.25], [67, 0.5], [69, 0.5], [71, 0.5],
        [72, 0.25], [71, 0.25], [69, 2],
      ],
      bass: [
        [43, 2], [48, 1], [43, 1], [40, 2], [45, 1], [40, 1],
        [41, 2], [45, 1], [41, 1], [36, 2], [43, 1], [36, 1],
      ],
    },
    "screensaver-sunset.wav": {
      tempo: 88,
      tracks: [
        [64, 1.5], [67, 0.5], [71, 2], [69, 1], [67, 1],
        [64, 1.5], [69, 0.5], [72, 2], [71, 1], [69, 1],
        [67, 1.5], [71, 0.5], [74, 2], [72, 1], [71, 1],
        [69, 2], [67, 2], [64, 4],
      ],
      bass: [
        [48, 4], [45, 4], [50, 4], [47, 4],
        [52, 4], [48, 4], [47, 4], [43, 4],
      ],
    },
  };

  const wav = {
    songs: SONGS,
    dataUrl(name) {
      return SONGS[name] ? makeSong(SONGS[name]) : null;
    },
    /* Seed the Music folder with the built-in tracks (idempotent). */
    seed() {
      const dir = "/C:/Users/Guest/Music";
      if (!OS.fs.isDir(dir)) OS.fs.mkdir(dir);
      let created = 0;
      Object.keys(SONGS).forEach((name) => {
        if (!OS.fs.exists(dir + "/" + name)) {
          OS.fs.write(dir + "/" + name, this.dataUrl(name));
          created++;
        }
      });
      return created;
    },
  };

  window.OS = window.OS || {};
  window.OS.wav = wav;
})();
