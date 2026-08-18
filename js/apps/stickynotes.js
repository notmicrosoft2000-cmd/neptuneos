/* =========================================================
 * neptuneOS — Sticky Notes
 * ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "neptuneos.stickynotes";
  const COLORS = {
    yellow: { bg: "#fff9a8", title: "#f5e642" },
    pink:   { bg: "#ffb3c6", title: "#ff6b9d" },
    blue:   { bg: "#a8d8ea", title: "#4db8c7" },
    green:  { bg: "#b5e8b5", title: "#6ecb6e" },
  };

  const notes = [];
  let saved = [];

  function load() {
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      saved = [];
    }
  }

  function save() {
    const data = notes.map((n) => ({
      id: n.id,
      text: n.text,
      color: n.color,
      x: n.win ? n.win.el.offsetLeft : n.x,
      y: n.win ? n.win.el.offsetTop : n.y,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function nextId() {
    let max = 0;
    notes.forEach((n) => { const v = parseInt(n.id, 10); if (v > max) max = v; });
    saved.forEach((n) => { const v = parseInt(n.id, 10); if (v > max) max = v; });
    return String(max + 1);
  }

  function createNote(data) {
    const id = data ? data.id : nextId();
    const color = (data && data.color && COLORS[data.color]) ? data.color : "yellow";
    const c = COLORS[color];

    const win = OS.wm.createWindow({
      title: "Sticky Note",
      icon: "assets/icons/stickynotes.svg",
      width: 200,
      height: 200,
      x: data ? data.x : undefined,
      y: data ? data.y : undefined,
      app: "stickynotes",
      onClose: () => {
        const idx = notes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          notes.splice(idx, 1);
          save();
        }
      },
    });

    const toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;align-items:center;padding:2px 4px;gap:3px;" +
      "background:" + c.title + ";border-bottom:1px solid rgba(0,0,0,0.15);";

    Object.keys(COLORS).forEach((name) => {
      const btn = document.createElement("button");
      btn.title = name.charAt(0).toUpperCase() + name.slice(1);
      btn.style.cssText =
        "width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,0.2);" +
        "background:" + COLORS[name].bg + ";cursor:pointer;padding:0;flex-shrink:0;";
      btn.addEventListener("click", () => {
        note.color = name;
        const nc = COLORS[name];
        toolbar.style.background = nc.title;
        textarea.style.background = nc.bg;
        save();
      });
      toolbar.appendChild(btn);
    });

    const del = document.createElement("button");
    del.textContent = "\u00d7";
    del.title = "Delete note";
    del.style.cssText =
      "margin-left:auto;background:none;border:none;font-size:16px;line-height:1;" +
      "cursor:pointer;color:rgba(0,0,0,0.4);padding:0 2px;";
    del.addEventListener("mouseenter", () => (del.style.color = "#000"));
    del.addEventListener("mouseleave", () => (del.style.color = "rgba(0,0,0,0.4)"));
    del.addEventListener("click", () => {
      OS.confirm("Sticky Notes", "Delete this note?").then((ok) => {
        if (ok) win.close();
      });
    });
    toolbar.appendChild(del);

    const textarea = document.createElement("textarea");
    textarea.style.cssText =
      "width:100%;height:calc(100% - 30px);border:none;outline:none;resize:none;" +
      "background:" + c.bg + ";font-family:'Comic Sans MS','Chalkboard SE','Comic Neue',cursive,sans-serif;" +
      "font-size:14px;padding:6px 8px;box-sizing:border-box;line-height:1.4;";
    textarea.value = data ? data.text : "";
    textarea.placeholder = "Type here\u2026";
    textarea.addEventListener("input", () => {
      note.text = textarea.value;
      save();
    });

    win.content.style.padding = "0";
    win.content.style.overflow = "hidden";
    win.content.appendChild(toolbar);
    win.content.appendChild(textarea);

    const note = {
      id,
      text: textarea.value,
      color,
      win,
      x: win.el.offsetLeft,
      y: win.el.offsetTop,
    };

    textarea.focus();
    notes.push(note);
    save();
    return note;
  }

  const app = {
    id: "stickynotes",
    name: "Sticky Notes",
    icon: "assets/icons/stickynotes.svg",
    group: "apps",

    launch() {
      load();
      if (saved.length > 0) {
        saved.forEach((d) => createNote(d));
        saved = [];
      } else {
        createNote(null);
      }
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.stickynotes = app;
})();
