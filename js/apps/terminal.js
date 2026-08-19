/* =========================================================
 * neptuneOS — Terminal
 * A command-line interpreter wired to the virtual filesystem.
 * ========================================================= */
(function () {
  "use strict";

  let win = null;
  let term = null;         // container
  let inputLine = null;    // current input row element
  let buffer = "";
  let cursor = 0;
  let history = [];
  let historyIdx = -1;
  let color = "#c0c0c0";

  const app = {
    id: "terminal",
    name: "MS-DOS Prompt",
    icon: "assets/icons/terminal.svg",
    group: "apps",

    launch() {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      win = OS.wm.createWindow({
        title: "MS-DOS Prompt",
        icon: this.icon,
        width: 620,
        height: 400,
        app: "terminal",
        onClose: () => { win = null; },
      });

      win.content.innerHTML = '<div class="terminal" tabindex="0"></div>';
      term = win.content.querySelector(".terminal");
      term.addEventListener("mousedown", (e) => {
        e.preventDefault();
        term.focus();
        placeCursorNear(e.clientX);
      });
      term.addEventListener("keydown", onKey);
      term.addEventListener("blur", () => { inputLine && inputLine.classList.add("blur"); });

      term.textContent = "";
      print(OS.brand.product + " [Version 5.1." + OS.brand.build + "]\n" + OS.brand.copyright + "\n", "t-cy");
      print("NeptuneDOS Shell v14.0 ready — type 'help' for commands\n", "t-dim");
      newInputLine();
      term.focus();
    },
  };

  function promptString() {
    return OS.fs.cwd.replace(/^\//, "").replace(/\//g, "\\");
  }

  function newInputLine() {
    const row = document.createElement("div");
    row.innerHTML = '<span class="t-promp">' + esc(promptString()) + "&gt;</span>" + '<span class="t-line"></span>';
    term.appendChild(row);
    inputLine = row;
    buffer = "";
    cursor = 0;
    renderLine();
  }

  function renderLine() {
    const lineEl = inputLine.querySelector(".t-line");
    lineEl.textContent = "";
    lineEl.appendChild(document.createTextNode(buffer.slice(0, cursor)));
    const caret = document.createElement("span");
    caret.className = "t-caret";
    lineEl.appendChild(caret);
    lineEl.appendChild(document.createTextNode(buffer.slice(cursor)));
    term.scrollTop = term.scrollHeight;
  }

  function placeCursorNear(clientX) {
    /* snap caret to end (keeps editing simple and predictable) */
    cursor = buffer.length;
    renderLine();
  }

  function onKey(e) {
    if (e.key === "Tab") { e.preventDefault(); return; }
    if (e.key.length === 1) {
      buffer = buffer.slice(0, cursor) + e.key + buffer.slice(cursor);
      cursor++;
      renderLine();
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); submit(); return; }
    if (e.key === "Backspace") {
      if (cursor > 0) { buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor); cursor--; renderLine(); }
      e.preventDefault();
      return;
    }
    if (e.key === "Delete") {
      if (cursor < buffer.length) { buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1); renderLine(); }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft") { cursor = Math.max(0, cursor - 1); renderLine(); e.preventDefault(); return; }
    if (e.key === "ArrowRight") { cursor = Math.min(buffer.length, cursor + 1); renderLine(); e.preventDefault(); return; }
    if (e.key === "Home") { cursor = 0; renderLine(); e.preventDefault(); return; }
    if (e.key === "End") { cursor = buffer.length; renderLine(); e.preventDefault(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      historyIdx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
      buffer = history[historyIdx]; cursor = buffer.length; renderLine();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      historyIdx++;
      if (historyIdx >= history.length) { historyIdx = -1; buffer = ""; cursor = 0; }
      else { buffer = history[historyIdx]; cursor = buffer.length; }
      renderLine();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") { e.preventDefault(); clear(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      print("^C", "t-out");
      newInputLine();
      return;
    }
  }

  function submit() {
    const raw = buffer;
    history.push(raw);
    if (history.length > 100) history.shift();
    historyIdx = -1;

    const typed = document.createElement("div");
    typed.innerHTML =
      '<span class="t-promp">' + esc(promptString()) + "&gt;</span>" +
      '<span class="t-line">' + esc(raw) + "</span>";
    term.insertBefore(typed, inputLine);
    inputLine.remove();

    newInputLine();
    if (raw.trim()) runCommand(raw.trim());
  }

  function print(text, cls) {
    const d = document.createElement("div");
    d.className = cls || "t-out";
    d.innerHTML = esc(text).replace(/\\n/g, "\n").replace(/ /g, " ");
    term.insertBefore(d, inputLine);
    term.scrollTop = term.scrollHeight;
  }

  function clear() {
    term.querySelectorAll("div:not(:last-child)").forEach((d) => d.remove());
  }

  function parseArgs(raw) {
    const args = [];
    let cur = "";
    let inQuote = false;
    for (const ch of raw) {
      if (ch === '"') inQuote = !inQuote;
      else if (ch === " " && !inQuote) { if (cur) { args.push(cur); cur = ""; } }
      else cur += ch;
    }
    if (cur) args.push(cur);
    return args;
  }

  function runCommand(line) {
    const parts = parseArgs(line);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    /* shortcut app launchers */
    if (["calc", "calculator", "notepad", "paint", "explorer", "settings", "recycle", "mspaint", "music", "media", "player", "snake", "pacman"].includes(cmd)) {
      const map = { calc: "calculator", calculator: "calculator", notepad: "notepad", paint: "paint", mspaint: "paint", explorer: "explorer", settings: "settings", recycle: "recycle", music: "mediaplayer", media: "mediaplayer", player: "mediaplayer", snake: "snake", pacman: "pacman" };
      const appId = map[cmd];
      if (appId === "explorer" && args.length) OS.apps.explorer.launch({ path: OS.fs.normalize(joinCwd(args[0])) });
      else OS.apps[appId].launch();
      return;
    }

    switch (cmd) {
      case "help": return cmdHelp(args);
      case "dir": case "ls": return cmdDir(args);
      case "cd": case "chdir": return cmdCd(args);
      case "cls": case "clear": return clear();
      case "mkdir": case "md": return cmdMkdir(args);
      case "rmdir": case "rd": return cmdRmdir(args);
      case "del": case "erase": case "rm": return cmdDel(args);
      case "type": case "cat": return cmdType(args);
      case "echo": return cmdEcho(args);
      case "copy": case "cp": return cmdCopy(args);
      case "move": case "mv": return cmdMove(args);
      case "ren": case "rename": return cmdRename(args);
      case "pwd": return print(promptString(), "t-out");
      case "date": return cmdDate();
      case "time": return cmdTime();
      case "ver": return print(OS.brand.product + " [Version 5.1." + OS.brand.build + "]\n", "t-cy");
      case "whoami": return print("neptuneos\\" + (OS.setup && OS.setup.userName ? OS.setup.userName() : "Guest"), "t-out");
      case "color": return cmdColor(args);
      case "tree": return cmdTree(args);
      case "start": return cmdStart(args);
      case "play": return cmdPlay(args);
      case "stop": return cmdStop();
      case "beep": return cmdBeep();
      case "fullscreen": case "fs": return cmdFullscreen();
      case "emptybin": return cmdEmptyBin();
      case "setup": return OS.setup && OS.setup.launch ? OS.setup.launch() : print("Setup is not available.\n", "t-err");
      case "exit": case "quit": case "bye": return win.close();
      case "shutdown": return OS.desktop.shutdown();
      case "restart": case "reboot": return OS.desktop.restart();
      case "version": return print(OS.brand.product + " Version 5.1." + OS.brand.build + "\n" + OS.brand.copyright + "\n", "t-cy");
      default: return print("'" + cmd + "' is not recognized as an internal or external command.\n", "t-err");
    }
  }

  /* --- helpers --- */
  function joinCwd(arg) {
    if (!arg) return OS.fs.cwd;
    if (arg.startsWith("/")) return arg;
    if (arg.startsWith("C:")) return "/" + arg.replace(/\\/g, "/");
    if (arg.startsWith("D:")) return "/" + arg.replace(/\\/g, "/");
    return OS.fs.cwd + "/" + arg.replace(/\\/g, "/");
  }

  function quote(s) { return s.includes(" ") ? '"' + s + '"' : s; }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* --- commands --- */
  function cmdHelp() {
    print(
      "For more information on a specific command, type HELP command-name\n" +
      "\n" +
      "  dir          Lists files and folders in a directory\n" +
      "  cd           Changes the current directory\n" +
      "  mkdir        Creates a new directory\n" +
      "  rmdir        Removes a directory\n" +
      "  del          Deletes a file\n" +
      "  type         Shows the contents of a text file\n" +
      "  echo         Writes text to the screen or a file\n" +
      "  copy         Copies files\n" +
      "  move         Moves files\n" +
      "  ren          Renames a file or folder\n" +
      "  tree         Displays the folder tree\n" +
      "  color        Changes the text color\n" +
      "  start        Starts a program or opens a file\n" +
      "  cls          Clears the screen\n" +
      "  date / time  Displays the current date / time\n" +
      "  ver          Shows the operating system version\n" +
      "  whoami       Shows who you are logged in as\n" +
      "  calc / notepad / paint / explorer / settings / recycle / music / snake / pacman\n" +
      "               Quick-launch programs\n" +
      "  play <file>  Plays an audio file in Media Player\n" +
      "  stop         Stops the music\n" +
      "  beep         Plays a system beep\n" +
      "  setup        Runs the NeptuneOS setup wizard\n" +
      "  fullscreen   Toggle fullscreen mode\n" +
      "  emptybin     Empties the Recycle Bin\n" +
      "  shutdown / restart\n" +
      "  exit         Closes this window\n",
      "t-out"
    );
  }

  function cmdDir(args) {
    const target = joinCwd(args[0]);
    const node = OS.fs.getNode(target);
    if (!node) return print("File not found: " + target + "\n", "t-err");
    if (node.type !== "dir") return print("   " + node.name + "\n", "t-out");
    const names = Object.keys(node.children);
    let filec = 0;
    const lines = [];
    for (const name of names) {
      const child = node.children[name];
      if (child.type === "dir") lines.push("      <DIR>          " + name);
      else {
        const size = String(child.content.length).padStart(12, " ");
        lines.push("  " + size + "             " + name);
        filec++;
      }
    }
    print(" Volume in drive C is RETROOS\n Directory of " + promptString() + "\n\n", "t-cy");
    print(lines.length ? lines.join("\n") + "\n" : "     File Not Found\n", "t-out");
    print("\n     " + filec + " File(s)\n", "t-out");
  }

  function cmdCd(args) {
    if (!args.length) return print(OS.fs.cwd + "\n", "t-out");
    const target = joinCwd(args[0]);
    const node = OS.fs.getNode(target);
    if (!node) return print("The system cannot find the path specified.\n", "t-err");
    if (node.type !== "dir") return print("The directory name is invalid.\n", "t-err");
    OS.fs.cwd = OS.fs.normalize(target);
  }

  function cmdMkdir(args) {
    if (!args.length) return print("The syntax of the command is incorrect.\n", "t-err");
    args.forEach((a) => {
      const res = OS.fs.mkdir(joinCwd(a));
      if (!res.ok) print(res.error + "\n", "t-err");
    });
  }

  function cmdRmdir(args) {
    if (!args.length) return print("The syntax of the command is incorrect.\n", "t-err");
    args.forEach((a) => {
      const p = joinCwd(a);
      if (!OS.fs.exists(p)) return print("The system cannot find the file specified.\n", "t-err");
      if (OS.fs.isDir(p) && (OS.fs.ls(p) || []).length) return print("The directory is not empty.\n", "t-err");
      OS.fs.rm(p);
    });
  }

  function cmdDel(args) {
    if (!args.length) return print("The syntax of the command is incorrect.\n", "t-err");
    args.forEach((a) => {
      const p = joinCwd(a);
      const node = OS.fs.getNode(p);
      if (!node) return print("Could Not Find " + a + "\n", "t-err");
      if (node.type === "dir") return print("Access is denied.\n", "t-err");
      OS.fs.rm(p);
    });
  }

  function cmdType(args) {
    if (!args.length) return print("The syntax of the command is incorrect.\n", "t-err");
    const p = joinCwd(args[0]);
    const content = OS.fs.read(p);
    if (content === null) return print("File not found: " + args[0] + "\n", "t-err");
    print(content, "t-out");
  }

  function cmdEcho(args) {
    const text = args.join(" ");
    if (text === "") return print("ECHO is on.\n", "t-out");
    const m = text.match(/^(.*?)\s*>\s*(.+)$/);
    if (m) {
      const res = OS.fs.write(joinCwd(m[2]), m[1] + "\n");
      if (!res.ok) print(res.error + "\n", "t-err");
      return;
    }
    print(text + "\n", "t-out");
  }

  function cmdCopy(args) {
    if (args.length < 1) return print("The syntax of the command is incorrect.\n", "t-err");
    const src = joinCwd(args[0]);
    if (args.length === 1) {
      /* copy to current dir */
      const node = OS.fs.getNode(src);
      if (!node) return print("File not found: " + args[0] + "\n", "t-err");
      const res = OS.fs.copy(src, OS.fs.cwd);
      print(res.ok ? "        1 file(s) copied.\n" : res.error + "\n", res.ok ? "t-ok" : "t-err");
      return;
    }
    const dest = joinCwd(args[1]);
    const destNode = OS.fs.getNode(dest);
    const destDir = destNode && destNode.type === "dir" ? dest : OS.fs.joinDir(dest);
    const res = OS.fs.copy(src, destDir);
    print(res.ok ? "        1 file(s) copied.\n" : res.error + "\n", res.ok ? "t-ok" : "t-err");
  }

  function cmdMove(args) {
    if (args.length < 1) return print("The syntax of the command is incorrect.\n", "t-err");
    const src = joinCwd(args[0]);
    const dest = args[1] ? joinCwd(args[1]) : OS.fs.cwd;
    const destNode = OS.fs.getNode(dest);
    const destDir = destNode && destNode.type === "dir" ? dest : OS.fs.joinDir(dest);
    const res = OS.fs.move(src, destDir);
    print(res.ok ? "        1 file(s) moved.\n" : res.error + "\n", res.ok ? "t-ok" : "t-err");
  }

  function cmdRename(args) {
    if (args.length < 2) return print("The syntax of the command is incorrect.\n", "t-err");
    const src = joinCwd(args[0]);
    const node = OS.fs.getNode(src);
    if (!node) return print("The system cannot find the file specified.\n", "t-err");
    const newName = args[1].replace(/^"(.*)"$/, "$1");
    if (!newName || newName.includes("/") || newName.includes("\\")) return print("The syntax of the command is incorrect.\n", "t-err");
    const parent = OS.fs.getNode(OS.fs.joinDir(src));
    const oldName = node.name;
    if (oldName === newName) return;
    if (newName in parent.children) return print("A file with that name already exists.\n", "t-err");
    delete parent.children[oldName];
    node.name = newName;
    parent.children[newName] = node;
    OS.fs.save();
    print("Renamed " + oldName + " to " + newName + "\n", "t-ok");
  }

  function cmdDate() {
    print(new Date().toDateString() + "\n", "t-out");
  }

  function cmdTime() {
    print(new Date().toTimeString().slice(0, 8) + "\n", "t-out");
  }

  function cmdColor(args) {
    const COLOR_MAP = { 0: "#000", 1: "#0000aa", 2: "#00aa00", 3: "#00aaaa", 4: "#aa0000", 5: "#aa00aa", 6: "#aa5500", 7: "#aaaaaa", 8: "#555", 9: "#5555ff", a: "#55ff55", b: "#55ffff", c: "#ff5555", d: "#ff55ff", e: "#ffff55", f: "#fff" };
    if (!args.length) return print("color [attr]  where attr is a two digit hex: background + foreground.\nExample: color 0a (black on light green)\n", "t-out");
    const attr = args[0].toLowerCase();
    const fg = attr[1] || attr[0];
    if (!COLOR_MAP[fg]) return print("Invalid color attribute.\n", "t-err");
    color = COLOR_MAP[fg];
    term.style.color = color;
    term.querySelectorAll("div").forEach((d) => (d.style.color = ""));
  }

  function cmdTree(args) {
    const root = args[0] ? joinCwd(args[0]) : OS.fs.cwd;
    const node = OS.fs.getNode(root);
    if (!node || node.type !== "dir") return print("Invalid path.\n", "t-err");
    let out = "Folder PATH listing\n" + promptString() + "\n";
    const walk = (n, depth, prefix) => {
      const names = Object.keys(n.children);
      names.forEach((name, i) => {
        const child = n.children[name];
        if (child.type !== "dir") return;
        const last = i === names.length - 1;
        out += prefix + (last ? "\u2514\u2500\u2500\u2500" : "\u251c\u2500\u2500\u2500") + name + "\n";
        walk(child, depth + 1, prefix + (last ? "    " : "\u2502   "));
      });
    };
    walk(node, 0, "");
    print(out, "t-out");
  }

  function cmdStart(args) {
    if (!args.length) return print("start <program-or-file>\n", "t-out");
    const arg = args[0].replace(/^"(.*)"$/, "$1");
    const path = joinCwd(arg);
    const node = OS.fs.getNode(path);
    if (!node) return print("The system cannot find the file specified.\n", "t-err");
    if (node.type === "dir") return OS.apps.explorer.launch({ path });
    const ext = node.name.split(".").pop().toLowerCase();
    if (["txt", "md", "log", "cfg", "ini"].includes(ext)) OS.apps.notepad.launch({ path });
    else if (["bmp", "png", "jpg", "gif", "jpeg", "svg"].includes(ext)) OS.apps.explorer.launch({ path });
    else OS.apps.notepad.launch({ path });
  }

  function cmdPlay(args) {
    if (!args.length) {
      OS.apps.mediaplayer.launch();
      return;
    }
    const p = joinCwd(args[0]);
    const node = OS.fs.getNode(p);
    if (!node || node.type !== "file") return print("The system cannot find the file specified.\n", "t-err");
    const win = OS.apps.mediaplayer.launch({ path: p });
    if (win) print("Now playing " + node.name + ".\n", "t-ok");
  }

  function cmdStop() {
    print("Music stopped.\n", "t-ok");
  }

  function cmdBeep() {
    print("BEEP.\n", "t-ok");
    OS.sfx.beepNow();
  }

  function cmdFullscreen() {
    OS.fullscreen.toggle();
    print(OS.fullscreen.isActive() ? "Entered fullscreen.\n" : "Exited fullscreen.\n", "t-ok");
  }

  function cmdEmptyBin() {
    const bin = OS.fs.getNode("/C:/Recycle Bin");
    if (bin) {
      Object.keys(bin.children).forEach((k) => delete bin.children[k]);
      OS.fs.save();
      print("Recycle Bin emptied.\n", "t-ok");
    }
  }

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.terminal = app;
})();
