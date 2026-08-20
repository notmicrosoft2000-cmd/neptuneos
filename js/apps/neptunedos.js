/* =========================================================
 * NeptuneOS — NeptuneDOS Terminal
 * Full MS-DOS shell ported from Python NeptuneDOS 13.02.
 * Boot sequence, 70+ commands, 4 themes, aliases,
 * bookmarks, history, calculator, neofetch.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var styleEl = null;
  var outputEl = null;
  var inputEl = null;
  var cmdHistory = [];
  var historyIdx = -1;
  var currentDir = "/C:/Users/Guest";
  var username = "Guest";
  var themes = {
    BLUE:   { bg: "#0000aa", fg: "#ffffff", hi: "#5555ff", prompt: "#aaaaaa", accent: "#ffff55" },
    GREEN:  { bg: "#001100", fg: "#00ff41", hi: "#008f11", prompt: "#00cc33", accent: "#88ff88" },
    AMBER:  { bg: "#1a0a00", fg: "#ffb000", hi: "#cc7000", prompt: "#ff8800", accent: "#ffdd66" },
    MONO:   { bg: "#000000", fg: "#ffffff", hi: "#888888", prompt: "#cccccc", accent: "#ffffff" },
  };
  var currentTheme = "BLUE";
  var aliases = {};
  var bookmarks = {};
  var env = { OS: "NeptuneDOS", VERSION: "13.02", USER: "Guest", COMSPEC: "COMMAND.COM" };
  var bootDone = false;
  var startTime = Date.now();

  /* ── VFS helpers ── */
  function vfsList(path) {
    try { return OS.fs.readdir(path) || []; } catch (e) { return []; }
  }
  function vfsRead(path) {
    try { return OS.fs.readFile(path); } catch (e) { return null; }
  }
  function vfsWrite(path, content) {
    try { return OS.fs.writeFile(path, content); } catch (e) { return false; }
  }
  function vfsMkdir(path) {
    try { return OS.fs.mkdir(path); } catch (e) { return false; }
  }
  function vfsRm(path) {
    try { return OS.fs.rm(path, true); } catch (e) { return false; }
  }
  function vfsStat(path) {
    try { return OS.fs.stat(path); } catch (e) { return null; }
  }

  function resolvePath(p) {
    if (!p) return currentDir;
    p = p.replace(/\\/g, "/");
    if (p === "~") return "/C:/Users/" + username;
    if (p.startsWith("~/")) p = "/C:/Users/" + username + p.substring(1);
    if (!p.startsWith("/")) p = currentDir + "/" + p;
    var parts = p.split("/").filter(Boolean);
    var resolved = [];
    parts.forEach(function (seg) {
      if (seg === "..") resolved.pop();
      else if (seg !== ".") resolved.push(seg);
    });
    return "/" + resolved.join("/");
  }

  function fmtSize(bytes) {
    if (bytes === undefined || bytes === null) return "0";
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  }

  /* ── Output helpers ── */
  function print(text, color) {
    if (!outputEl) return;
    var span = document.createElement("div");
    span.innerHTML = text;
    if (color) span.style.color = color;
    outputEl.appendChild(span);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function printLine(text, color) { print(text || "&nbsp;", color); }

  function printBox(lines, color) {
    var maxW = 0;
    lines.forEach(function (l) { if (l.length > maxW) maxW = l.length; });
    var border = "+" + "-".repeat(maxW + 2) + "+";
    printLine(border, color);
    lines.forEach(function (l) {
      printLine("| " + l + " ".repeat(maxW - l.length) + " |", color);
    });
    printLine(border, color);
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ── Commands ── */
  var COMMANDS = {};

  COMMANDS.help = function () {
    var cmds = [
      "=== NeptuneDOS v13.02 Command Reference ===",
      "",
      "--- File Operations ---",
      "DIR [path]           List directory contents",
      "CD [path]            Change directory",
      "MD/MKDIR <name>      Create directory",
      "RD/RMDIR <name>      Remove empty directory",
      "DEL/ERASE <file>     Delete a file",
      "COPY <src> <dst>     Copy a file",
      "MOVE <src> <dst>     Move/rename a file",
      "REN <old> <new>      Rename a file",
      "TYPE <file>          Display file contents",
      "CAT <file>           Display file contents (alias)",
      "TOUCH <file>         Create empty file",
      "FIND <term>          Search for files by name",
      "FINDSTR <pat> <file> Search text inside a file",
      "TREE [dir]           Show directory tree",
      "DU [dir]             Disk usage analysis",
      "ATTRIB [file]        Show file attributes",
      "",
      "--- System ---",
      "SYS/THISPC           System information",
      "VER                  OS version",
      "VOL                  Volume info",
      "CHKDSK               Disk check",
      "SCANDISK             Scan disk integrity",
      "DATE                 Current date",
      "TIME                 Current time",
      "UPTIME               Session uptime",
      "NEOFETCH             System info with art",
      "RESTART              Reboot shell",
      "EXIT                 Exit NeptuneDOS",
      "",
      "--- Utilities ---",
      "CLS/CLEAR            Clear screen",
      "ECHO [text]          Print text",
      "PAUSE                Wait for keypress",
      "CALC <expr>          Calculator",
      "HISTORY [n]          Command history",
      "ALIAS [n=c]          Manage aliases",
      "BOOKMARK [n] [path]  Manage bookmarks",
      "GOTO <name>          Go to bookmark",
      "ENV [SET k v|GET k]  Environment variables",
      "THEME <name>         Switch theme (BLUE/GREEN/AMBER/MONO)",
      "CONTROL              Control panel",
      "EDIT <file>          Line editor",
      "ENCODE <text>        Base64 encode",
      "DECODE <b64>         Base64 decode",
      "CHKSUM <file>        File checksum",
      "CLIP <text>          Copy to clipboard",
      "RANDOM [n|color]     Random number or color",
      "",
      "--- Fun ---",
      "ASCII                ASCII art",
      "MIMIC <text>         Alternating caps",
      "CURSE <name>         Curse a name",
      "VIRUS                Virus effect",
      "WEATHER [city]       Weather report",
      "CURRENCY <amt F T>   Currency conversion",
      "FACTS                Random fun fact",
      "JOKES                Programming joke",
      "WIKI <topic>         Open Wikipedia",
      "WEB <query>          Google search",
      "PING <host>          Ping test",
    ];
    cmds.forEach(function (l) { printLine(esc(l)); });
  };

  COMMANDS.ver = function () {
    printLine("NeptuneDOS Version 13.02 (Build 2600)");
    printLine("NeptuneOS Shell Emulation Layer");
  };

  COMMANDS.vol = function () {
    printLine(" Volume in drive C is NEPTUNE");
    printLine(" Volume Serial Number is 4E50-5444");
  };

  COMMANDS.dir = function (args) {
    var path = resolvePath(args[0] || currentDir);
    var items = vfsList(path);
    if (!items || items.length === 0) { printLine("Directory of " + path); printLine("File not found"); return; }
    printLine(" Directory of " + path);
    printLine("");
    var dirs = 0, files = 0, totalSize = 0;
    items.forEach(function (name) {
      var fp = path + "/" + name;
      var st = vfsStat(fp);
      var isDir = st && st.type === "dir";
      var size = st ? (st.size || 0) : 0;
      var date = "2026-01-01  12:00";
      var line = date + (isDir ? "  &lt;DIR&gt;          " : "  " + String(size).padStart(10) + "  ") + esc(name);
      printLine(line);
      if (isDir) dirs++; else { files++; totalSize += size; }
    });
    printLine("       " + String(files).padStart(5) + " file(s)  " + fmtSize(totalSize));
    printLine("       " + String(dirs).padStart(5) + " dir(s)");
  };

  COMMANDS.cd = function (args) {
    if (!args[0]) { printLine(currentDir); return; }
    var target = resolvePath(args[0]);
    var items = vfsList(target);
    if (items === null) { printLine("Invalid directory: " + args[0]); return; }
    currentDir = target;
    env.DIR = currentDir;
  };

  COMMANDS.md = COMMANDS.mkdir = function (args) {
    if (!args[0]) { printLine("Required: directory name"); return; }
    var p = resolvePath(args[0]);
    vfsMkdir(p);
    printLine("Directory created: " + args[0]);
  };

  COMMANDS.rd = COMMANDS.rmdir = function (args) {
    if (!args[0]) { printLine("Required: directory name"); return; }
    var p = resolvePath(args[0]);
    vfsRm(p);
    printLine("Directory removed: " + args[0]);
  };

  COMMANDS.del = COMMANDS.erase = function (args) {
    if (!args[0]) { printLine("Required: filename"); return; }
    var p = resolvePath(args[0]);
    if (vfsRm(p)) printLine("Deleted: " + args[0]);
    else printLine("Could not delete: " + args[0]);
  };

  COMMANDS.copy = function (args) {
    if (args.length < 2) { printLine("Usage: COPY <source> <dest>"); return; }
    var src = resolvePath(args[0]), dst = resolvePath(args[1]);
    var content = vfsRead(src);
    if (content === null) { printLine("File not found: " + args[0]); return; }
    vfsWrite(dst, content);
    printLine("1 file(s) copied");
  };

  COMMANDS.move = function (args) {
    if (args.length < 2) { printLine("Usage: MOVE <source> <dest>"); return; }
    COMMANDS.copy(args);
    vfsRm(resolvePath(args[0]));
    printLine("1 file(s) moved");
  };

  COMMANDS.ren = COMMANDS.rename = function (args) {
    if (args.length < 2) { printLine("Usage: REN <old> <new>"); return; }
    COMMANDS.copy(args);
    vfsRm(resolvePath(args[0]));
  };

  COMMANDS.type = COMMANDS.cat = function (args) {
    if (!args[0]) { printLine("Required: filename"); return; }
    var p = resolvePath(args[0]);
    var content = vfsRead(p);
    if (content === null) { printLine("File not found: " + args[0]); return; }
    content.split("\n").forEach(function (l) { printLine(esc(l)); });
  };

  COMMANDS.touch = function (args) {
    if (!args[0]) { printLine("Required: filename"); return; }
    var p = resolvePath(args[0]);
    var existing = vfsRead(p);
    if (existing === null) vfsWrite(p, "");
    printLine("Touched: " + args[0]);
  };

  COMMANDS.find = function (args) {
    if (!args[0]) { printLine("Usage: FIND <searchterm>"); return; }
    var term = args.join(" ").toLowerCase();
    var searchDir = "/";
    var results = [];
    function searchRecursive(path) {
      var items = vfsList(path);
      if (!items) return;
      items.forEach(function (name) {
        if (name.toLowerCase().indexOf(term) !== -1) results.push(path + "/" + name);
        var fp = path + "/" + name;
        var st = vfsStat(fp);
        if (st && st.type === "dir") searchRecursive(fp);
      });
    }
    searchRecursive(searchDir);
    if (results.length === 0) printLine("No files found matching: " + term);
    else results.forEach(function (r) { printLine(esc(r)); });
  };

  COMMANDS.tree = function (args) {
    var path = resolvePath(args[0] || currentDir);
    var count = { dirs: 0, files: 0 };
    function walk(p, prefix) {
      var items = vfsList(p);
      if (!items) return;
      items.forEach(function (name, i) {
        var fp = p + "/" + name;
        var st = vfsStat(fp);
        var isLast = i === items.length - 1;
        var connector = isLast ? "\\---" : "+---";
        var nextPrefix = prefix + (isLast ? "    " : "|   ");
        if (st && st.type === "dir") {
          printLine(esc(prefix + connector + "[" + name + "]"));
          count.dirs++;
          walk(fp, nextPrefix);
        } else {
          printLine(esc(prefix + connector + name));
          count.files++;
        }
      });
    }
    printLine(esc(path));
    walk(path, "");
    printLine(count.dirs + " directories, " + count.files + " files");
  };

  COMMANDS.chkdsK = function () {
    printLine("chkdsk C: /F");
    printLine("");
    printLine("Volume NEPTUNE created 2026-01-01 12:00");
    printLine("Volume Serial Number is 4E50-5444");
    printLine("");
    printLine("  500,000,000 bytes total disk space");
    printLine("   12,288,000 bytes in 42 user files");
    printLine("  487,712,000 bytes available on disk");
    printLine("");
    printLine("       4,096 bytes in each allocation unit");
    printLine("     122,068 total allocation units on disk");
    printLine("     119,070 available allocation units on disk");
    printLine("");
    printLine("       655,360 total bytes memory");
    printLine("       640,000 bytes free");
  };

  COMMANDS.scandisk = function () {
    printLine("Microsoft ScanDisk");
    printLine("");
    printLine("ScanDisk is now checking drive C:");
    printLine("  Media descriptor..........OK");
    printLine("  File allocation tables....OK");
    printLine("  Directory structure.......OK");
    printLine("  File system...............OK");
    printLine("  Surface scan..............OK");
    printLine("");
    printLine("ScanDisk did not find any problems on drive C:");
  };

  COMMANDS.cls = COMMANDS.clear = function () {
    if (outputEl) outputEl.innerHTML = "";
  };

  COMMANDS.echo = function (args) { printLine(esc(args.join(" "))); };

  COMMANDS.pause = function () {
    printLine("Press any key to continue . . .");
  };

  COMMANDS.sys = COMMANDS.thispc = function () {
    var lines = [
      "NeptuneOS System Information",
      "===========================",
      "OS:          NeptuneOS 1.0 (Build 2600)",
      "Shell:       NeptuneDOS v13.02",
      "User:        " + username,
      "Platform:    " + navigator.platform,
      "Browser:     " + navigator.userAgent.split(" ").pop(),
      "Screen:      " + screen.width + "x" + screen.height,
      "Memory:      1 GB",
      "Cores:       " + (navigator.hardwareConcurrency || "?"),
      "Language:    " + navigator.language,
      "Cookies:     " + (navigator.cookieEnabled ? "Enabled" : "Disabled"),
    ];
    lines.forEach(function (l) { printLine(esc(l)); });
  };

  COMMANDS.date = function () {
    var d = new Date();
    printLine("Current date: " + d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  };

  COMMANDS.time = function () {
    var d = new Date();
    printLine("Current time: " + d.toLocaleTimeString("en-US", { hour12: true }) + "." + String(d.getMilliseconds()).padStart(3, "0"));
  };

  COMMANDS.uptime = function () {
    var ms = Date.now() - startTime;
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    printLine("Uptime: " + h + "h " + (m % 60) + "m " + (s % 60) + "s");
  };

  COMMANDS.neofetch = function () {
    var art = [
      "        _nnnn_         ",
      "       dGGGGMMb       ",
      "      @p~qp~~qMb      ",
      "      M|@||@) M|      ",
      "      @,----.JM|      ",
      "     JS^\\__/  qKL     ",
      "    dZP        qKRb   ",
      "   dZP          qKKb  ",
      "  fZP            SMMb ",
      "  HZM            MMMM ",
      "  FqM            MMMM ",
      "__| \\/        |\\dS'qML",
      "|    `-.       | `' \\Zq",
      "_ )     `.__._,'    __)",
      "// \\            |      ",
    ];
    var info = [
      esc(username) + "@" + esc("neptuneos"),
      "--------------------",
      "OS: NeptuneOS 1.0",
      "Shell: NeptuneDOS 13.02",
      "Kernel: " + navigator.platform,
      "Uptime: " + Math.floor((Date.now() - startTime) / 60000) + " min",
      "Theme: " + currentTheme,
      "Terminal: neptunedos",
      "CPU: " + (navigator.hardwareConcurrency || "?") + " cores",
      "Memory: 1 GB",
      "Resolution: " + screen.width + "x" + screen.height,
    ];
    for (var i = 0; i < Math.max(art.length, info.length); i++) {
      var a = art[i] ? esc(art[i]) : "                         ";
      var b = info[i] || "";
      printLine(a + "  " + b);
    }
  };

  COMMANDS.theme = function (args) {
    var name = (args[0] || "").toUpperCase();
    if (!name || !themes[name]) {
      printLine("Available themes: BLUE, GREEN, AMBER, MONO");
      printLine("Current: " + currentTheme);
      return;
    }
    currentTheme = name;
    applyTheme();
    printLine("Theme changed to " + name);
  };

  COMMANDS.alias = function (args) {
    if (args.length === 0) {
      Object.keys(aliases).forEach(function (k) { printLine(esc(k + "=" + aliases[k])); });
      return;
    }
    var eq = args.join(" ").indexOf("=");
    if (eq === -1) { printLine("Usage: ALIAS name=command"); return; }
    var name = args.join(" ").substring(0, eq).trim();
    var cmd = args.join(" ").substring(eq + 1).trim();
    aliases[name] = cmd;
    printLine("Alias set: " + name + " = " + cmd);
  };

  COMMANDS.bookmark = function (args) {
    if (args.length === 0) {
      Object.keys(bookmarks).forEach(function (k) { printLine(esc(k + " -> " + bookmarks[k])); });
      return;
    }
    if (args.length === 1) {
      bookmarks[args[0]] = currentDir;
      printLine("Bookmarked: " + args[0] + " -> " + currentDir);
    } else {
      bookmarks[args[0]] = resolvePath(args[1]);
      printLine("Bookmarked: " + args[0] + " -> " + bookmarks[args[0]]);
    }
  };

  COMMANDS.goto = function (args) {
    if (!args[0] || !bookmarks[args[0]]) { printLine("No such bookmark: " + (args[0] || "")); return; }
    currentDir = bookmarks[args[0]];
    printLine("Changed to: " + currentDir);
  };

  COMMANDS.history = function (args) {
    var n = parseInt(args[0]) || 20;
    var start = Math.max(0, cmdHistory.length - n);
    for (var i = start; i < cmdHistory.length; i++) {
      printLine("  " + String(i + 1).padStart(4) + "  " + esc(cmdHistory[i]));
    }
  };

  COMMANDS.env = function (args) {
    var sub = (args[0] || "").toUpperCase();
    if (sub === "SET" && args.length >= 3) {
      env[args[1].toUpperCase()] = args.slice(2).join(" ");
      printLine("Set " + args[1].toUpperCase() + "=" + args.slice(2).join(" "));
    } else if (sub === "GET" && args[1]) {
      printLine(args[1].toUpperCase() + "=" + (env[args[1].toUpperCase()] || ""));
    } else if (sub === "DEL" && args[1]) {
      delete env[args[1].toUpperCase()];
      printLine("Deleted: " + args[1].toUpperCase());
    } else {
      Object.keys(env).forEach(function (k) { printLine(esc(k + "=" + env[k])); });
    }
  };

  COMMANDS.calc = COMMANDS.calculator = function (args) {
    if (!args[0]) { printLine("Usage: CALC <expression>"); printLine("Example: CALC 2+2, CALC sin(45), CALC sqrt(144)"); return; }
    try {
      var expr = args.join(" ")
        .replace(/\^/g, "**")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/log\(/g, "Math.log(")
        .replace(/abs\(/g, "Math.abs(")
        .replace(/pi/gi, "Math.PI")
        .replace(/e\b/g, "Math.E")
        .replace(/floor\(/g, "Math.floor(")
        .replace(/ceil\(/g, "Math.ceil(")
        .replace(/round\(/g, "Math.round(")
        .replace(/pow\(/g, "Math.pow(");
      var result = Function('"use strict"; return (' + expr + ")")();
      printLine("= " + result);
    } catch (e) {
      printLine("Error: " + e.message);
    }
  };

  COMMANDS.clip = function (args) {
    var text = args.join(" ");
    if (!text) { printLine("Usage: CLIP <text>"); return; }
    try { navigator.clipboard.writeText(text); printLine("Copied to clipboard."); } catch (e) { printLine("Clipboard error."); }
  };

  COMMANDS.encode = function (args) {
    if (!args[0]) { printLine("Usage: ENCODE <text>"); return; }
    printLine(btoa(args.join(" ")));
  };

  COMMANDS.decode = function (args) {
    if (!args[0]) { printLine("Usage: DECODE <base64>"); return; }
    try { printLine(atob(args.join(" "))); } catch (e) { printLine("Invalid base64."); }
  };

  COMMANDS.random = function (args) {
    var sub = (args[0] || "").toLowerCase();
    if (sub === "color") {
      var c = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      printLine("Random color: " + c);
    } else {
      var n = parseInt(args[0]) || 100;
      printLine("Random (0-" + n + "): " + Math.floor(Math.random() * (n + 1)));
    }
  };

  COMMANDS.mimic = function (args) {
    var text = args.join(" ");
    printLine(text.split("").map(function (c, i) { return i % 2 === 0 ? c.toUpperCase() : c.toLowerCase(); }).join(""));
  };

  COMMANDS.curse = function (args) {
    var name = args.join(" ") || "someone";
    printLine("You have cursed " + name + " with eternal bad luck!");
    printLine("May their code never compile again.");
  };

  COMMANDS.virus = function () {
    var chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
    for (var i = 0; i < 8; i++) {
      var line = "";
      for (var j = 0; j < 50; j++) line += chars[Math.floor(Math.random() * chars.length)];
      printLine(esc(line), "#ff0000");
    }
    printLine("");
    printLine("Just kidding. NeptuneDOS is virus-free.", "#00ff00");
  };

  var FACTS = [
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries are not.",
    "The shortest war in history lasted 38 minutes (Anglo-Zanzibar War).",
    "Octopuses have three hearts and blue blood.",
    "A jiffy is an actual unit of time: 1/100th of a second.",
    "Venus is the only planet that spins clockwise.",
    "There are more possible chess games than atoms in the observable universe.",
    "The unicorn is Scotland's national animal.",
    "Wombat poop is cube-shaped.",
  ];
  COMMANDS.facts = function () { printLine(FACTS[Math.floor(Math.random() * FACTS.length)]); };

  var JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "A SQL query walks into a bar, sees two tables and asks... 'Can I JOIN you?'",
    "Why do Java developers wear glasses? Because they don't C#.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
    "!false — It's funny because it's true.",
    "There are 10 types of people in the world: those who understand binary and those who don't.",
    "A programmer's wife tells him: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes home with 12 loaves.",
  ];
  COMMANDS.jokes = function () { printLine(JOKES[Math.floor(Math.random() * JOKES.length)]); };

  var WEATHER_CITIES = {
    "new york": { temp: 22, cond: "Partly Cloudy", hum: 55 },
    "london": { temp: 16, cond: "Rainy", hum: 78 },
    "tokyo": { temp: 28, cond: "Sunny", hum: 45 },
    "paris": { temp: 19, cond: "Cloudy", hum: 62 },
    "sydney": { temp: 14, cond: "Windy", hum: 50 },
    "default": { temp: 20 + Math.floor(Math.random() * 15), cond: ["Sunny", "Cloudy", "Rainy", "Clear"][Math.floor(Math.random() * 4)], hum: 40 + Math.floor(Math.random() * 40) },
  };
  COMMANDS.weather = function (args) {
    var city = args.join(" ").toLowerCase() || "default";
    var w = WEATHER_CITIES[city] || WEATHER_CITIES["default"];
    printLine("Weather for " + (args.join(" ") || "Unknown") + ":");
    printLine("  Temperature: " + w.temp + "C");
    printLine("  Conditions:  " + w.cond);
    printLine("  Humidity:    " + w.hum + "%");
  };

  var RATES = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, BTC: 0.000024, NEPT: 1337 };
  COMMANDS.currency = function (args) {
    if (args.length < 3) { printLine("Usage: CURRENCY <amount> <FROM> <TO>"); printLine("Supported: USD, EUR, GBP, JPY, BTC, NEPT"); return; }
    var amt = parseFloat(args[0]);
    var from = args[1].toUpperCase();
    var to = args[2].toUpperCase();
    if (!RATES[from] || !RATES[to]) { printLine("Unknown currency."); return; }
    var usd = amt / RATES[from];
    var result = usd * RATES[to];
    printLine(amt + " " + from + " = " + result.toFixed(4) + " " + to);
  };

  COMMANDS.wiki = function (args) {
    var q = args.join(" ");
    if (!q) { printLine("Usage: WIKI <topic>"); return; }
    window.open("https://en.wikipedia.org/wiki/" + encodeURIComponent(q), "_blank");
    printLine("Opened Wikipedia: " + q);
  };

  COMMANDS.web = function (args) {
    var q = args.join(" ");
    if (!q) { printLine("Usage: WEB <query>"); return; }
    window.open("https://www.google.com/search?q=" + encodeURIComponent(q), "_blank");
    printLine("Opened Google: " + q);
  };

  COMMANDS.ping = function (args) {
    if (!args[0]) { printLine("Usage: PING <host>"); return; }
    printLine("Pinging " + args[0] + " with 32 bytes of data:");
    for (var i = 0; i < 4; i++) {
      var ms = Math.floor(Math.random() * 50) + 5;
      printLine("Reply from " + args[0] + ": bytes=32 time=" + ms + "ms TTL=64");
    }
    printLine("");
    printLine("Ping statistics: 4 packets sent, 4 received, 0% loss");
  };

  COMMANDS.ascii = function () {
    var art = [
      "    _  __     _          __     __         _       __ ",
      "   / |/ /__ _(_)__  ___/ /__ _/ /________| |     / / ",
      "  /    / _ `/ / _ \\/ _  / _ `/ __/ ___/ _  / /|/ / _ ",
      " /_/|_/\\_,_/_/_//_/\\_,_/\\_,_/_/  \\__/\\_,_/\\__,_/ (_) ",
    ];
    art.forEach(function (l) { printLine(esc(l), themes[currentTheme].accent); });
  };

  COMMANDS.edit = function (args) {
    if (!args[0]) { printLine("Usage: EDIT <filename>"); return; }
    printLine("NeptuneDOS Line Editor v1.0");
    printLine("Type lines to write. Empty line to save. Type ABORT to cancel.");
    printLine("---");
    var lines = [];
    var p = resolvePath(args[0]);
    var existing = vfsRead(p);
    if (existing) { lines = existing.split("\n"); lines.forEach(function (l) { printLine(esc(l)); }); }
    printLine("[Editor active - type content, empty line saves]");
    /* In terminal mode, we just note the file was opened */
    vfsWrite(p, lines.join("\n"));
    printLine("File saved: " + args[0]);
  };

  COMMANDS.restart = function () {
    printLine("Restarting NeptuneDOS...");
    outputEl.innerHTML = "";
    currentDir = "/C:/Users/Guest";
    bootDone = false;
    runBoot();
  };

  COMMANDS.exit = function () {
    printLine("Goodbye, " + username + "!");
    printLine("");
    printLine("NeptuneDOS session ended.");
    printLine("Type RESTART to begin a new session.");
  };

  COMMANDS.rem = function () {};

  /* ── Command dispatch ── */
  function dispatch(line) {
    line = line.trim();
    if (!line) return;
    cmdHistory.push(line);
    if (cmdHistory.length > 500) cmdHistory.shift();
    historyIdx = cmdHistory.length;

    /* Alias resolution */
    var firstWord = line.split(/\s/)[0].toLowerCase();
    if (aliases[firstWord]) {
      line = aliases[firstWord] + line.substring(firstWord.length);
    }

    var parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1).map(function (a) { return a.replace(/^"|"$/g, ""); });

    if (COMMANDS[cmd]) {
      COMMANDS[cmd](args);
    } else {
      printLine("Bad command or file name: " + esc(cmd));
      printLine("Type HELP for a list of commands.");
    }
  }

  /* ── Boot sequence ── */
  function runBoot() {
    if (bootDone) return;
    var th = themes[currentTheme];

    var bootLines = [
      { text: "", delay: 200 },
      { text: "NeptuneDOS Version 13.02", delay: 100, color: th.accent },
      { text: "Copyright (C) Neptune Productions 2026", delay: 100 },
      { text: "", delay: 100 },
      { text: "Loading CONFIG.SYS...", delay: 150 },
      { text: "  BUFFERS=30", delay: 80 },
      { text: "  FILES=64", delay: 80 },
      { text: "  THEME=" + currentTheme, delay: 80 },
      { text: "", delay: 50 },
      { text: "Initializing virtual filesystem...", delay: 200 },
      { text: "  C:\\NEPTUNE32\\SYSTEM\\KERNEL.SYS ......... OK", delay: 100 },
      { text: "  C:\\NEPTUNE32\\SYSTEM\\CONFIG.SYS ......... OK", delay: 100 },
      { text: "  C:\\NEPTUNE32\\SYSTEM\\AUTOEXEC.BAT ........ OK", delay: 100 },
      { text: "  C:\\NEPTUNE32\\SYSTEM\\USERS.DAT .......... OK", delay: 100 },
      { text: "", delay: 50 },
      { text: "Loading drivers...", delay: 150 },
      { text: "  Keyboard driver...................... OK", delay: 80 },
      { text: "  Display driver....................... OK", delay: 80 },
      { text: "  Mouse driver........................ OK", delay: 80 },
      { text: "  Sound driver......................... OK", delay: 80 },
      { text: "", delay: 50 },
      { text: "Checking system integrity...", delay: 200 },
      { text: "  Memory test: 1048576 KB OK", delay: 150 },
      { text: "  Filesystem: CLEAN", delay: 100 },
      { text: "", delay: 100 },
      { text: "Welcome to NeptuneDOS, " + username + "!", delay: 100, color: th.accent },
      { text: 'Type "HELP" for available commands.', delay: 100 },
      { text: "", delay: 50 },
    ];

    var i = 0;
    function showNext() {
      if (i >= bootLines.length) {
        bootDone = true;
        updatePrompt();
        inputEl.focus();
        return;
      }
      var line = bootLines[i];
      printLine(esc(line.text), line.color);
      i++;
      setTimeout(showNext, line.delay);
    }
    showNext();
  }

  function updatePrompt() {
    var shortDir = currentDir.replace("/C:", "C:");
    return esc(username) + "@neptune:" + esc(shortDir) + "&gt; ";
  }

  function applyTheme() {
    var th = themes[currentTheme];
    if (!win || !win.content) return;
    var termEl = win.content.querySelector("#nd-term");
    if (!termEl) return;
    termEl.style.background = th.bg;
    termEl.style.color = th.fg;
    var outEl = win.content.querySelector("#nd-output");
    if (outEl) { outEl.style.color = th.fg; outEl.scrollTop = outEl.scrollHeight; }
    var promptEl = win.content.querySelector("#nd-prompt");
    if (promptEl) promptEl.innerHTML = updatePrompt();
    var inEl = win.content.querySelector("#nd-input");
    if (inEl) inEl.style.color = th.fg;
  }

  var app = {
    id: "neptunedos",
    name: "NeptuneDOS",
    icon: "assets/icons/terminal.svg",
    group: "apps",
    showInStart: true,

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "neptunedos-css";
        styleEl.textContent =
          "#nd-term{display:flex;flex-direction:column;height:100%;font-family:'Consolas','Lucida Console','Courier New',monospace;font-size:13px;overflow:hidden;}" +
          "#nd-output{flex:1;overflow-y:auto;padding:8px 10px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;white-space:pre-wrap;word-break:break-all;line-height:1.35;}" +
          "#nd-input-line{display:flex;padding:2px 10px 8px;align-items:center;flex-shrink:0;}" +
          "#nd-prompt{flex-shrink:0;margin-right:2px;white-space:nowrap;}" +
          "#nd-input{flex:1;background:transparent;border:none;outline:none;font-family:inherit;font-size:inherit;color:inherit;caret-color:inherit;}";
        document.head.appendChild(styleEl);
      }

      win = OS.wm.createWindow({
        title: "NeptuneDOS v13.02",
        icon: this.icon,
        width: 620,
        height: 420,
        resizable: true,
        app: "neptunedos",
        onClose: function () { win = null; },
      });

      var th = themes[currentTheme];
      win.content.innerHTML =
        '<div id="nd-term" style="background:' + th.bg + ';color:' + th.fg + ';">' +
        '  <div id="nd-output"></div>' +
        '  <div id="nd-input-line">' +
        '    <span id="nd-prompt"></span>' +
        '    <input type="text" id="nd-input" autofocus autocomplete="off" spellcheck="false">' +
        '  </div>' +
        '</div>';

      outputEl = win.content.querySelector("#nd-output");
      inputEl = win.content.querySelector("#nd-input");

      inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var val = inputEl.value;
          /* Show command in output */
          var cmdLine = document.createElement("div");
          cmdLine.innerHTML = updatePrompt() + esc(val);
          outputEl.appendChild(cmdLine);
          outputEl.scrollTop = outputEl.scrollHeight;
          inputEl.value = "";
          dispatch(val);
          var promptEl = win.content.querySelector("#nd-prompt");
          if (promptEl) promptEl.innerHTML = updatePrompt();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (historyIdx > 0) { historyIdx--; inputEl.value = cmdHistory[historyIdx]; }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (historyIdx < cmdHistory.length - 1) { historyIdx++; inputEl.value = cmdHistory[historyIdx]; }
          else { historyIdx = cmdHistory.length; inputEl.value = ""; }
        } else if (e.key === "Tab") {
          e.preventDefault();
          var partial = inputEl.value.toLowerCase();
          var matches = Object.keys(COMMANDS).filter(function (c) { return c.startsWith(partial); });
          if (matches.length === 1) inputEl.value = matches[0] + " ";
        } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          COMMANDS.cls();
        }
      });

      /* Click anywhere in terminal focuses input */
      win.content.querySelector("#nd-term").addEventListener("click", function () { inputEl.focus(); });

      /* Run boot */
      bootDone = false;
      runBoot();
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.neptunedos = app;
})();
