/* =========================================================
 * NeptuneOS — Code Editor
 * Syntax highlighting, line numbers, dark/light themes,
 * find & replace, file open/save, tab support.
 * ========================================================= */
(function () {
  "use strict";

  var win = null;
  var editorCSS = null;
  var tabs = [];
  var activeTab = -1;
  var darkTheme = true;
  var wordWrap = false;
  var fontSize = 13;

  var LANG_RULES = {
    js: [
      { re: /(\/\/.*$)/gm, cls: "ce-cmt" },
      { re: /(\/\*[\s\S]*?\*\/)/g, cls: "ce-cmt" },
      { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, cls: "ce-str" },
      { re: /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|from|try|catch|finally|throw|typeof|instanceof|in|of|async|await|yield|null|undefined|true|false|void|delete|debugger)\b/g, cls: "ce-kw" },
      { re: /\b(\d+\.?\d*)\b/g, cls: "ce-num" },
      { re: /\b([A-Z][a-zA-Z0-9]*)\b/g, cls: "ce-type" },
    ],
    html: [
      { re: /(&lt;!--[\s\S]*?--&gt;)/g, cls: "ce-cmt" },
      { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cls: "ce-str" },
      { re: /(&lt;\/?)([\w-]+)/g, cls: "ce-tag" },
      { re: /\b([\w-]+)(?==)/g, cls: "ce-attr" },
    ],
    css: [
      { re: /(\/\*[\s\S]*?\*\/)/g, cls: "ce-cmt" },
      { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cls: "ce-str" },
      { re: /(#[0-9a-fA-F]{3,8})\b/g, cls: "ce-num" },
      { re: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?)\b/g, cls: "ce-num" },
      { re: /([.#][\w-]+)(?=\s*[{,:])/g, cls: "ce-type" },
      { re: /\b(color|background|margin|padding|border|font|display|position|width|height|flex|grid|transform|transition|animation|opacity|z-index|overflow|cursor|content)\b/g, cls: "ce-kw" },
    ],
    py: [
      { re: /(#.*$)/gm, cls: "ce-cmt" },
      { re: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, cls: "ce-str" },
      { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cls: "ce-str" },
      { re: /\b(def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|raise|with|yield|lambda|pass|True|False|None|and|or|not|in|is|global|nonlocal|del|assert|print)\b/g, cls: "ce-kw" },
      { re: /\b(\d+\.?\d*)\b/g, cls: "ce-num" },
      { re: /\b([A-Z][a-zA-Z0-9]*)\b/g, cls: "ce-type" },
    ],
    json: [
      { re: /("(?:[^"\\]|\\.)*")\s*:/g, cls: "ce-type" },
      { re: /:\s*("(?:[^"\\]|\\.)*")/g, cls: "ce-str" },
      { re: /\b(true|false|null)\b/g, cls: "ce-kw" },
      { re: /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, cls: "ce-num" },
    ],
  };

  var THEME_DARK = {
    bg: "#1e1e2e", fg: "#cdd6f4", gutter: "#181825", gutterFg: "#585b70",
    sel: "rgba(137,180,250,0.15)", line: "#313244",
    kw: "#cba6f7", str: "#a6e3a1", num: "#fab387", cmt: "#6c7086",
    tag: "#89b4fa", attr: "#f9e2af", type: "#f38ba8",
    border: "#313244", statusBg: "#181825", statusFg: "#a6adc8",
  };

  var THEME_LIGHT = {
    bg: "#ffffff", fg: "#1e1e2e", gutter: "#f0f0f0", gutterFg: "#999",
    sel: "rgba(30,30,46,0.1)", line: "#f5f5f5",
    kw: "#8839ef", str: "#40a02b", num: "#fe640b", cmt: "#9ca0b0",
    tag: "#1e66f5", attr: "#df8e1d", type: "#d20f39",
    border: "#ddd", statusBg: "#f0f0f0", statusFg: "#555",
  };

  function getLang(filename) {
    if (!filename) return "js";
    var ext = filename.split(".").pop().toLowerCase();
    if (ext === "html" || ext === "htm" || ext === "xml") return "html";
    if (ext === "css" || ext === "scss" || ext === "less") return "css";
    if (ext === "py" || ext === "pyw") return "py";
    if (ext === "json") return "json";
    return "js";
  }

  function highlight(code, lang) {
    var rules = LANG_RULES[lang] || LANG_RULES.js;
    var escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var tokens = [];
    rules.forEach(function (rule) {
      var m, re = new RegExp(rule.re.source, rule.re.flags);
      while ((m = re.exec(escaped)) !== null) {
        tokens.push({ start: m.index, end: m.index + m[0].length, text: m[0], cls: rule.cls });
      }
    });
    tokens.sort(function (a, b) { return a.start - b.start; });
    var result = "";
    var pos = 0;
    tokens.forEach(function (t) {
      if (t.start >= pos) {
        result += escaped.substring(pos, t.start) + '<span class="' + t.cls + '">' + t.text + "</span>";
        pos = t.end;
      }
    });
    result += escaped.substring(pos);
    return result;
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function createTab(name, content) {
    var id = tabs.length;
    tabs.push({ id: id, name: name || "untitled.txt", content: content || "", dirty: false, path: null });
    return id;
  }

  function switchTab(id) {
    if (activeTab >= 0 && tabs[activeTab]) {
      saveCurrentContent();
    }
    activeTab = id;
    renderEditor();
    renderTabs();
  }

  function saveCurrentContent() {
    if (activeTab < 0 || !tabs[activeTab]) return;
    var ta = win.content.querySelector("#ce-textarea");
    if (ta) tabs[activeTab].content = ta.value;
  }

  function renderTabs() {
    var bar = win.content.querySelector("#ce-tabs");
    if (!bar) return;
    bar.innerHTML = "";
    tabs.forEach(function (t, i) {
      var el = document.createElement("div");
      el.className = "ce-tab" + (i === activeTab ? " active" : "") + (t.dirty ? " dirty" : "");
      el.innerHTML = '<span class="ce-tab-name">' + esc(t.name) + "</span>" +
        (tabs.length > 1 ? '<span class="ce-tab-close" data-idx="' + i + '">&times;</span>' : "");
      el.addEventListener("click", function (e) {
        if (e.target.classList.contains("ce-tab-close")) {
          var idx = parseInt(e.target.dataset.idx);
          tabs.splice(idx, 1);
          if (tabs.length === 0) createTab();
          if (activeTab >= tabs.length) activeTab = tabs.length - 1;
          renderTabs();
          renderEditor();
          return;
        }
        switchTab(i);
      });
      bar.appendChild(el);
    });
    var addBtn = document.createElement("div");
    addBtn.className = "ce-tab ce-tab-add";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", function () { createTab(); renderTabs(); switchTab(tabs.length - 1); });
    bar.appendChild(addBtn);
  }

  function renderEditor() {
    var t = tabs[activeTab];
    if (!t) return;
    var th = darkTheme ? THEME_DARK : THEME_LIGHT;
    var ta = win.content.querySelector("#ce-textarea");
    var highlighted = win.content.querySelector("#ce-highlighted");
    var gutter = win.content.querySelector("#ce-gutter");
    var langEl = win.content.querySelector("#ce-lang");
    var nameEl = win.content.querySelector("#ce-filename");

    if (ta) ta.value = t.content;
    if (nameEl) nameEl.textContent = t.name;
    if (langEl) langEl.textContent = getLang(t.name).toUpperCase();

    updateHighlight();
    updateGutter();
    win.setTitle((t.dirty ? "● " : "") + t.name + " — Code Editor");
  }

  function updateHighlight() {
    var t = tabs[activeTab];
    if (!t) return;
    var ta = win.content.querySelector("#ce-textarea");
    var highlighted = win.content.querySelector("#ce-highlighted");
    var lang = getLang(t.name);
    if (ta && highlighted) {
      highlighted.innerHTML = highlight(ta.value, lang) + "\n";
    }
  }

  function updateGutter() {
    var ta = win.content.querySelector("#ce-textarea");
    var gutter = win.content.querySelector("#ce-gutter");
    if (!ta || !gutter) return;
    var lines = ta.value.split("\n").length;
    var html = "";
    for (var i = 1; i <= lines; i++) {
      html += '<div class="ce-gutter-line">' + i + "</div>";
    }
    gutter.innerHTML = html;
  }

  function syncScroll() {
    var ta = win.content.querySelector("#ce-textarea");
    var highlighted = win.content.querySelector("#ce-highlighted");
    var gutter = win.content.querySelector("#ce-gutter");
    if (ta && highlighted) {
      highlighted.scrollTop = ta.scrollTop;
      highlighted.scrollLeft = ta.scrollLeft;
    }
    if (ta && gutter) {
      gutter.scrollTop = ta.scrollTop;
    }
  }

  function updateCursor() {
    var ta = win.content.querySelector("#ce-textarea");
    var posEl = win.content.querySelector("#ce-pos");
    if (!ta || !posEl) return;
    var val = ta.value;
    var pos = ta.selectionStart;
    var before = val.substring(0, pos);
    var line = before.split("\n").length;
    var col = pos - before.lastIndexOf("\n");
    posEl.textContent = "Ln " + line + ", Col " + col;
  }

  function applyTheme() {
    var th = darkTheme ? THEME_DARK : THEME_LIGHT;
    var root = win.content.querySelector("#ce-root");
    if (!root) return;
    root.style.background = th.bg;
    root.style.color = th.fg;
    var gutter = win.content.querySelector("#ce-gutter");
    if (gutter) { gutter.style.background = th.gutter; gutter.style.color = th.gutterFg; }
    var ta = win.content.querySelector("#ce-textarea");
    if (ta) {
      ta.style.background = th.bg;
      ta.style.color = th.fg;
    }
    var status = win.content.querySelector("#ce-statusbar");
    if (status) { status.style.background = th.statusBg; status.style.color = th.statusFg; }
    var tabsBar = win.content.querySelector("#ce-tabs");
    if (tabsBar) tabsBar.style.background = th.gutter;
  }

  var app = {
    id: "codeeditor",
    name: "Code Editor",
    icon: "assets/icons/codeeditor.svg",
    group: "apps",

    launch: function () {
      if (win && win.el.isConnected) { win.restore(); win.focus(); return win; }
      if (!editorCSS) {
        editorCSS = document.createElement("style");
        editorCSS.textContent =
          "#ce-root{display:flex;flex-direction:column;height:100%;overflow:hidden;font-family:'Consolas','Courier New',monospace;}" +
          "#ce-tabs{display:flex;gap:0;overflow-x:auto;flex-shrink:0;}" +
          ".ce-tab{padding:6px 14px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;border-right:1px solid rgba(255,255,255,0.08);white-space:nowrap;transition:background 0.1s;min-width:0;}" +
          ".ce-tab:hover{background:rgba(255,255,255,0.06);}" +
          ".ce-tab.active{background:var(--ce-bg,#1e1e2e);font-weight:bold;}" +
          ".ce-tab.dirty .ce-tab-name::before{content:'● ';color:#fab387;}" +
          ".ce-tab-close{font-size:14px;opacity:0.4;cursor:pointer;padding:0 2px;border-radius:3px;}" +
          ".ce-tab-close:hover{opacity:1;background:rgba(255,80,80,0.3);}" +
          ".ce-tab-add{padding:6px 12px;font-size:16px;opacity:0.5;cursor:pointer;}" +
          ".ce-tab-add:hover{opacity:1;}" +
          "#ce-toolbar{display:flex;gap:4px;padding:3px 8px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;align-items:center;}" +
          "#ce-toolbar button{padding:2px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.12);border-radius:3px;background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;transition:background 0.1s;}" +
          "#ce-toolbar button:hover{background:rgba(255,255,255,0.12);}" +
          "#ce-toolbar button.active{background:rgba(100,180,255,0.25);border-color:rgba(100,180,255,0.4);}" +
          "#ce-editor-wrap{display:flex;flex:1;overflow:hidden;position:relative;}" +
          "#ce-gutter{width:48px;overflow:hidden;text-align:right;padding:8px 6px 8px 0;font-size:13px;line-height:1.5;flex-shrink:0;user-select:none;}" +
          ".ce-gutter-line{height:19.5px;}" +
          "#ce-editor{position:relative;flex:1;overflow:hidden;}" +
          "#ce-textarea{position:absolute;inset:0;width:100%;height:100%;padding:8px 12px;border:none;outline:none;resize:none;font-family:inherit;line-height:1.5;tab-size:2;z-index:2;caret-color:#89b4fa;}" +
          "#ce-highlighted{position:absolute;inset:0;padding:8px 12px;font-family:inherit;line-height:1.5;tab-size:2;white-space:pre;overflow:auto;pointer-events:none;z-index:1;}" +
          ".ce-kw{color:#cba6f7;font-weight:bold;}.ce-str{color:#a6e3a1;}.ce-num{color:#fab387;}.ce-cmt{color:#6c7086;font-style:italic;}.ce-tag{color:#89b4fa;}.ce-attr{color:#f9e2af;}.ce-type{color:#f38ba8;}" +
          "#ce-statusbar{display:flex;gap:12px;padding:2px 10px;font-size:11px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;align-items:center;}" +
          "#ce-search{display:none;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;gap:4px;align-items:center;}" +
          "#ce-search.open{display:flex;}" +
          "#ce-search input{padding:3px 8px;border:1px solid rgba(255,255,255,0.15);border-radius:3px;background:rgba(255,255,255,0.08);color:inherit;font-family:inherit;font-size:12px;width:180px;}" +
          "#ce-search button{padding:2px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.12);border-radius:3px;background:rgba(255,255,255,0.06);color:inherit;cursor:pointer;}";
        document.head.appendChild(editorCSS);
      }

      if (tabs.length === 0) createTab();
      activeTab = 0;

      win = OS.wm.createWindow({
        title: tabs[0].name + " — Code Editor",
        icon: this.icon,
        width: 700,
        height: 500,
        resizable: true,
        app: "codeeditor",
        onClose: function () { win = null; tabs = []; activeTab = -1; },
      });

      win.content.innerHTML =
        '<div id="ce-root">' +
        '  <div id="ce-tabs"></div>' +
        '  <div id="ce-toolbar">' +
        '    <button id="ce-btn-open" title="Open File">Open</button>' +
        '    <button id="ce-btn-save" title="Save (Ctrl+S)">Save</button>' +
        '    <button id="ce-btn-theme" title="Toggle Theme">Theme</button>' +
        '    <button id="ce-btn-wrap" title="Toggle Word Wrap">Wrap</button>' +
        '    <button id="ce-btn-find" title="Find (Ctrl+F)">Find</button>' +
        '    <button id="ce-btn-zin" title="Zoom In">A+</button>' +
        '    <button id="ce-btn-zout" title="Zoom Out">A-</button>' +
        '  </div>' +
        '  <div id="ce-search">' +
        '    <input type="text" id="ce-find-input" placeholder="Find...">' +
        '    <input type="text" id="ce-replace-input" placeholder="Replace...">' +
        '    <button id="ce-find-next">Next</button>' +
        '    <button id="ce-find-replace">Replace</button>' +
        '    <button id="ce-find-replaceall">All</button>' +
        '    <button id="ce-find-close">&times;</button>' +
        '  </div>' +
        '  <div id="ce-editor-wrap">' +
        '    <div id="ce-gutter"></div>' +
        '    <div id="ce-editor">' +
        '      <pre id="ce-highlighted"></pre>' +
        '      <textarea id="ce-textarea" spellcheck="false"></textarea>' +
        '    </div>' +
        '  </div>' +
        '  <div id="ce-statusbar">' +
        '    <span id="ce-filename">untitled.txt</span>' +
        '    <span id="ce-lang">JS</span>' +
        '    <span style="flex:1"></span>' +
        '    <span id="ce-pos">Ln 1, Col 1</span>' +
        '  </div>' +
        '</div>';

      renderTabs();
      renderEditor();
      applyTheme();

      var ta = win.content.querySelector("#ce-textarea");
      ta.addEventListener("input", function () {
        tabs[activeTab].content = ta.value;
        tabs[activeTab].dirty = true;
        updateHighlight();
        updateGutter();
        renderTabs();
        win.setTitle("● " + tabs[activeTab].name + " — Code Editor");
      });
      ta.addEventListener("scroll", syncScroll);
      ta.addEventListener("keyup", updateCursor);
      ta.addEventListener("click", updateCursor);
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
          e.preventDefault();
          var s = ta.selectionStart, end = ta.selectionEnd;
          ta.value = ta.value.substring(0, s) + "  " + ta.value.substring(end);
          ta.selectionStart = ta.selectionEnd = s + 2;
          ta.dispatchEvent(new Event("input"));
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          saveFile();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
          e.preventDefault();
          toggleSearch();
        }
      });

      win.content.querySelector("#ce-btn-theme").addEventListener("click", function () {
        darkTheme = !darkTheme;
        applyTheme();
      });
      win.content.querySelector("#ce-btn-wrap").addEventListener("click", function () {
        wordWrap = !wordWrap;
        ta.style.whiteSpace = wordWrap ? "pre-wrap" : "pre";
        ta.style.overflowWrap = wordWrap ? "break-word" : "normal";
        var hl = win.content.querySelector("#ce-highlighted");
        hl.style.whiteSpace = wordWrap ? "pre-wrap" : "pre";
        hl.style.overflowWrap = wordWrap ? "break-word" : "normal";
        this.classList.toggle("active", wordWrap);
      });
      win.content.querySelector("#ce-btn-zin").addEventListener("click", function () {
        fontSize = Math.min(24, fontSize + 1);
        ta.style.fontSize = fontSize + "px";
        win.content.querySelector("#ce-highlighted").style.fontSize = fontSize + "px";
        win.content.querySelector("#ce-gutter").style.fontSize = fontSize + "px";
      });
      win.content.querySelector("#ce-btn-zout").addEventListener("click", function () {
        fontSize = Math.max(9, fontSize - 1);
        ta.style.fontSize = fontSize + "px";
        win.content.querySelector("#ce-highlighted").style.fontSize = fontSize + "px";
        win.content.querySelector("#ce-gutter").style.fontSize = fontSize + "px";
      });

      function toggleSearch() {
        var s = win.content.querySelector("#ce-search");
        s.classList.toggle("open");
        if (s.classList.contains("open")) {
          win.content.querySelector("#ce-find-input").focus();
          var sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
          if (sel) win.content.querySelector("#ce-find-input").value = sel;
        }
      }

      win.content.querySelector("#ce-btn-find").addEventListener("click", toggleSearch);
      win.content.querySelector("#ce-find-close").addEventListener("click", function () {
        win.content.querySelector("#ce-search").classList.remove("open");
      });

      win.content.querySelector("#ce-find-next").addEventListener("click", function () {
        var q = win.content.querySelector("#ce-find-input").value;
        if (!q) return;
        var idx = ta.value.indexOf(q, ta.selectionEnd);
        if (idx === -1) idx = ta.value.indexOf(q);
        if (idx !== -1) { ta.selectionStart = idx; ta.selectionEnd = idx + q.length; ta.focus(); }
      });

      win.content.querySelector("#ce-find-replace").addEventListener("click", function () {
        var q = win.content.querySelector("#ce-find-input").value;
        var r = win.content.querySelector("#ce-replace-input").value;
        if (!q) return;
        var sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (sel === q) {
          var s = ta.selectionStart;
          ta.value = ta.value.substring(0, s) + r + ta.value.substring(s + q.length);
          ta.selectionStart = ta.selectionEnd = s + r.length;
          ta.dispatchEvent(new Event("input"));
        }
        win.content.querySelector("#ce-find-next").click();
      });

      win.content.querySelector("#ce-find-replaceall").addEventListener("click", function () {
        var q = win.content.querySelector("#ce-find-input").value;
        var r = win.content.querySelector("#ce-replace-input").value;
        if (!q) return;
        ta.value = ta.value.split(q).join(r);
        ta.dispatchEvent(new Event("input"));
      });

      function saveFile() {
        var t = tabs[activeTab];
        if (!t) return;
        if (t.path) {
          OS.fs.writeFile(t.path, t.content);
          t.dirty = false;
          renderTabs();
          win.setTitle(t.name + " — Code Editor");
          OS.message && OS.message("Code Editor", "Saved to " + t.path, "info");
        } else {
          var path = prompt("Save as (path):", "/C:/Users/Guest/Documents/" + t.name);
          if (path) {
            t.path = path;
            t.name = path.split("/").pop();
            OS.fs.writeFile(path, t.content);
            t.dirty = false;
            renderTabs();
            renderEditor();
          }
        }
      }

      win.content.querySelector("#ce-btn-save").addEventListener("click", saveFile);
      win.content.querySelector("#ce-btn-open").addEventListener("click", function () {
        var path = prompt("Open file (path):", "/C:/Users/Guest/Documents/");
        if (!path) return;
        var content = OS.fs.readFile(path);
        if (content !== null) {
          createTab(path.split("/").pop(), content);
          tabs[tabs.length - 1].path = path;
          switchTab(tabs.length - 1);
        } else {
          OS.message && OS.message("Code Editor", "File not found: " + path, "error");
        }
      });
    },
  };

  window.OS = window.OS || {};
  OS.apps = OS.apps || {};
  OS.apps.codeeditor = app;
})();
